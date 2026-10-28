import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { walker_id: string };

/**
 * Admin-only: mark a walker as approved so they can accept walks.
 * Verifies the caller is an admin against the DB (never trust client claims).
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

    // Hard check: must be a flagged admin
    const { data: caller } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", callerId)
      .maybeSingle();
    if (!caller?.is_admin) {
      return NextResponse.json({ ok: false, reason: "Not authorized" }, { status: 403 });
    }

    // If the walker has uploaded an ID doc, approving is also our record
    // that an admin eyeballed it — mark it verified in the same write.
    const { data: existing } = await admin
      .from("walker_profiles")
      .select("id_document_front_path, id_verified")
      .eq("id", body.walker_id)
      .maybeSingle();

    const now = new Date().toISOString();
    const patch: Record<string, any> = {
      approval_status: "approved",
      approval_notes: null,
      approved_at: now,
      approved_by: callerId,
    };
    if (existing?.id_document_front_path && !existing.id_verified) {
      patch.id_verified = true;
      patch.id_verified_at = now;
      patch.id_verified_by = callerId;
    }

    const { error } = await admin
      .from("walker_profiles")
      .update(patch)
      .eq("id", body.walker_id);
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("approve-walker error:", e);
    return NextResponse.json(
      { ok: false, reason: e?.message || "Unexpected server error." },
      { status: 500 },
    );
  }
}
