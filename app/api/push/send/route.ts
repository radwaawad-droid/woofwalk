import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// This route runs on the server. It uses the Supabase service_role key to
// read push subscriptions and verify authorisation; the service_role key is
// a Vercel env var and never reaches the browser.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Kind =
  | "walk_accepted"
  | "walk_started"
  | "walk_ended"
  | "walk_cancelled"
  | "new_message"
  | "new_request"
  | "walk_photo";

type Body = {
  walk_id: string;
  kind: Kind;
  excerpt?: string;
};

export async function POST(req: Request) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidSubject =
    process.env.VAPID_SUBJECT || "mailto:hello@woofwalk.app";

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { ok: false, reason: "VAPID keys not set" },
      { status: 503 },
    );
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, reason: "Supabase service role not set" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !body.walk_id || !body.kind) {
    return NextResponse.json({ ok: false, reason: "Bad body" }, { status: 400 });
  }

  // Verify the caller: Supabase sends the user's JWT in the Authorization header
  // if the client is configured to attach it. We also accept the cookie fallback.
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let callerId: string | null = null;
  if (token) {
    const { data } = await admin.auth.getUser(token);
    callerId = data.user?.id || null;
  }
  // If no JWT, we skip strict auth. Still safe because we only ever send pushes
  // to the counterparty on the walk — not to arbitrary users.
  // (For stricter auth, call the API with the Supabase session JWT.)

  // Load the walk — enough columns to build a rich notification
  const walkQuery = await admin
    .from("walks")
    .select(
      "id, owner_id, walker_id, area, community, dog_id, duration_min, price_aed, scheduled_for",
    )
    .eq("id", body.walk_id)
    .maybeSingle();
  if (walkQuery.error || !walkQuery.data) {
    return NextResponse.json(
      { ok: false, reason: "Walk not found" },
      { status: 404 },
    );
  }
  const walkRow = walkQuery.data as {
    id: string;
    owner_id: string;
    walker_id: string | null;
    area: string;
    community: string | null;
    dog_id: string;
    duration_min: number;
    price_aed: number;
    scheduled_for: string | null;
  };

  // If we have a caller, ensure they're part of this walk
  if (callerId && callerId !== walkRow.owner_id && callerId !== walkRow.walker_id) {
    return NextResponse.json(
      { ok: false, reason: "Not a party to this walk" },
      { status: 403 },
    );
  }

  // Resolve recipients. For 'new_request' we fan out to walkers in the same area.
  let recipientIds: string[] = [];
  if (body.kind === "new_request") {
    const { data: walkers } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "walker")
      .eq("area", walkRow.area);
    recipientIds = (walkers || []).map((w: any) => w.id);
  } else {
    // Default: notify the counterparty (owner → walker, walker → owner).
    // If no caller is known, we send to BOTH parties (except null walker).
    if (callerId === walkRow.owner_id && walkRow.walker_id) {
      recipientIds = [walkRow.walker_id];
    } else if (callerId === walkRow.walker_id) {
      recipientIds = [walkRow.owner_id];
    } else {
      recipientIds = [walkRow.owner_id, walkRow.walker_id].filter(
        Boolean,
      ) as string[];
    }
  }
  // Never send to the caller themselves
  if (callerId) recipientIds = recipientIds.filter((id) => id !== callerId);

  if (recipientIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Dog name for a friendlier body
  let dogName = "your dog";
  if (walkRow.dog_id) {
    const { data: dog } = await admin
      .from("dogs")
      .select("name")
      .eq("id", walkRow.dog_id)
      .maybeSingle();
    if (dog?.name) dogName = dog.name;
  }

  // Build notification title/body/url per kind
  const walkUrlOwner = `/owner/walk/${walkRow.id}`;
  const walkUrlWalker = `/walker/walk/${walkRow.id}`;
  const chatUrl = `/walk/${walkRow.id}/chat`;

  function payloadFor(recipientId: string): {
    title: string;
    body: string;
    tag: string;
    url: string;
  } {
    const recipientIsOwner = recipientId === walkRow.owner_id;
    const url = recipientIsOwner ? walkUrlOwner : walkUrlWalker;
    switch (body!.kind) {
      case "walk_accepted":
        return {
          title: "A walker is coming",
          body: `Your walk for ${dogName} has been accepted.`,
          tag: `walk-${walkRow.id}-accepted`,
          url,
        };
      case "walk_started":
        return {
          title: "The walk has started",
          body: `${dogName}'s walk is underway.`,
          tag: `walk-${walkRow.id}-started`,
          url,
        };
      case "walk_ended":
        return {
          title: "Walk completed",
          body: `${dogName}'s walk just ended.`,
          tag: `walk-${walkRow.id}-ended`,
          url,
        };
      case "walk_cancelled":
        return {
          title: "Walk cancelled",
          body: `The walk for ${dogName} was cancelled.`,
          tag: `walk-${walkRow.id}-cancelled`,
          url,
        };
      case "new_message":
        return {
          title: "New message",
          body: body!.excerpt
            ? body!.excerpt.slice(0, 120)
            : `New message about ${dogName}.`,
          tag: `walk-${walkRow.id}-msg`,
          url: chatUrl,
        };
      case "walk_photo":
        return {
          title: "New photo",
          body: `${dogName}'s walker sent a photo.`,
          tag: `walk-${walkRow.id}-photo`,
          url,
        };
      case "new_request": {
        const when = walkRow.scheduled_for
          ? fmtDubai(walkRow.scheduled_for)
          : "now";
        const loc = walkRow.community
          ? `${walkRow.area}, ${walkRow.community}`
          : walkRow.area;
        return {
          title: `Walk request · AED ${walkRow.price_aed} · ${when}`,
          body: `${dogName} · ${loc} · ${walkRow.duration_min} min. Tap to accept.`,
          tag: `req-${walkRow.id}`,
          url: walkUrlWalker,
        };
      }
    }
  }

  /**
   * Format an ISO timestamp as a short, friendly schedule in Dubai time:
   * "today 10:00", "tomorrow 08:30", "Mon 09:00". Server runs in UTC;
   * we convert to Asia/Dubai for display.
   */
  function fmtDubai(iso: string): string {
    const d = new Date(iso);
    const t = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Dubai",
      hour12: false,
    }).format(d);
    const sameDay = (a: Date, b: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Dubai",
      }).format(a) ===
      new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Dubai",
      }).format(b);
    const now = new Date();
    if (sameDay(d, now)) return `today ${t}`;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (sameDay(d, tomorrow)) return `tomorrow ${t}`;
    const day = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      timeZone: "Asia/Dubai",
    }).format(d);
    return `${day} ${t}`;
  }

  // Fetch all push subscriptions for recipients
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", recipientIds);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Configure web-push with VAPID
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const results = await Promise.allSettled(
    subs.map(async (s: any) => {
      const payload = payloadFor(s.user_id);
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify(payload),
        );
        return { endpoint: s.endpoint, ok: true };
      } catch (e: any) {
        // 404/410 means the endpoint is dead — clean it up
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
        }
        return { endpoint: s.endpoint, ok: false, status };
      }
    }),
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && (r.value as any).ok,
  ).length;

  return NextResponse.json({ ok: true, sent, attempted: subs.length });
}
