"use client";

import { savePushSubscription } from "./db";
import { getSupabase } from "./supabase";

/**
 * Attempt to subscribe the current browser to web push. Idempotent:
 * safe to call on every page load; it reuses any existing subscription.
 *
 * Returns a short string describing the result for optional UI use.
 */
export async function ensurePushSubscription(): Promise<
  "subscribed" | "denied" | "unsupported" | "no-vapid" | "needs-prompt"
> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return "unsupported";

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) return "no-vapid";

  // Register (or re-use) the service worker
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

  // Permission can be 'default', 'granted' or 'denied'. We never prompt
  // without an explicit user action; just report the state.
  const perm = Notification.permission;
  if (perm === "denied") return "denied";
  if (perm === "default") return "needs-prompt";

  // Already granted — look up existing subscription or create a new one
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
    });
  }
  await savePushSubscription(sub.toJSON());
  return "subscribed";
}

/** Ask the user for permission and subscribe. Call only from a user gesture. */
export async function requestPushPermission(): Promise<
  "subscribed" | "denied" | "unsupported" | "no-vapid"
> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator))
    return "unsupported";
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) return "no-vapid";

  const result = await Notification.requestPermission();
  if (result !== "granted") return "denied";
  return ensurePushSubscription() as any;
}

/**
 * Fire-and-forget call to the push API. Server validates the sender
 * is actually part of the walk and sends to the correct recipient(s).
 */
export async function notify(input: {
  walk_id: string;
  kind:
    | "walk_accepted"
    | "walk_started"
    | "walk_ended"
    | "walk_cancelled"
    | "new_message"
    | "new_request"
    | "walk_photo";
  excerpt?: string; // Short preview, used e.g. for message body
}): Promise<void> {
  try {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (token) headers.authorization = `Bearer ${token}`;
    await fetch("/api/push/send", {
      method: "POST",
      headers,
      body: JSON.stringify(input),
      keepalive: true,
    });
  } catch {
    // Non-fatal — the main action already succeeded in Supabase.
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(normalized) : "";
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
