import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { walker_id: string; notes?: string };

/**
 * Admin-only: reject a walker's application. Notes are stored so the
 * walker can see WHY (and fix it + reapply later).
 */
export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { ok: false, reason: "Server not configured" },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.walker_id) {
      return NextResponse.json({ ok: false, reason: "Bad body" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) {
      return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes } = await admin.auth.getUser(token);
    const callerId = userRes.user?.id;
    if (!callerId) {
      return NextResponse.json({ ok: false, reason: "Invalid session" }, { status: 401 });
    }

    const { data: caller } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", callerId)
      .maybeSingle();
    if (!caller?.is_admin) {
      return NextResponse.json({ ok: false, reason: "Not authorized" }, { status: 403 });
    }

    const { error } = await admin
      .from("walker_profiles")
      .update({
        approval_status: "rejected",
        approval_notes: (body.notes || "").slice(0, 500) || null,
        approved_at: null,
        approved_by: callerId,
      })
      .eq("id", body.walker_id);
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("reject-walker error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}
