"use client";

import { useEffect, useRef, useState } from "react";
import { pushLocation } from "@/lib/db";

type State =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "sharing"; lastPushed: number | null; accuracy: number | null }
  | { kind: "denied" }
  | { kind: "error"; message: string };

const MIN_PUSH_INTERVAL_MS = 10_000; // Push at most every 10 seconds
const MIN_MOVE_METERS = 5; // Skip pushes if the walker barely moved

export function WalkerLiveTracker({
  walkId,
  active,
}: {
  walkId: string;
  active: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const watchId = useRef<number | null>(null);
  const lastPushAt = useRef<number>(0);
  const lastPushed = useRef<{ lat: number; lng: number } | null>(null);
  const wakeLock = useRef<any>(null);

  // Start / stop based on `active` (walk status === in_progress)
  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      setState({ kind: "error", message: "This browser doesn't support GPS." });
      return;
    }

    setState({ kind: "requesting" });

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const now = Date.now();
        const prev = lastPushed.current;
        const moved =
          !prev || metersBetween(prev.lat, prev.lng, latitude, longitude);

        // Decide whether to push: honor rate limit, require movement unless first point
        const dueByTime = now - lastPushAt.current >= MIN_PUSH_INTERVAL_MS;
        const dueByMovement =
          !prev || (typeof moved === "number" && moved >= MIN_MOVE_METERS);

        if (!prev || (dueByTime && dueByMovement)) {
          try {
            await pushLocation({
              walk_id: walkId,
              lat: latitude,
              lng: longitude,
              accuracy_m: accuracy ?? undefined,
            });
            lastPushAt.current = now;
            lastPushed.current = { lat: latitude, lng: longitude };
          } catch (e) {
            // Non-fatal: keep tracking, show a soft message
            setState({
              kind: "error",
              message: "Couldn't send location — retrying.",
            });
          }
        }
        setState({
          kind: "sharing",
          lastPushed: lastPushAt.current || null,
          accuracy: accuracy ?? null,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({ kind: "denied" });
        } else {
          setState({
            kind: "error",
            message:
              err.code === err.POSITION_UNAVAILABLE
                ? "Can't get your location right now."
                : "Location timed out — retrying.",
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20_000,
      },
    );
    watchId.current = id;

    // Try to acquire a screen wake lock (iOS 16.4+, Chrome, etc)
    (async () => {
      try {
        // @ts-ignore — wakeLock is experimental in some lib configurations
        if ("wakeLock" in navigator) {
          // @ts-ignore
          wakeLock.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* Non-fatal */
      }
    })();

    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, walkId]);

  function stop() {
    if (watchId.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (wakeLock.current) {
      try {
        wakeLock.current.release?.();
      } catch {}
      wakeLock.current = null;
    }
  }

  if (!active || state.kind === "idle") return null;

  if (state.kind === "requesting") {
    return (
      <Banner tone="info">
        Asking for permission to share your location…
      </Banner>
    );
  }

  if (state.kind === "denied") {
    return (
      <Banner tone="warn">
        <div className="font-medium">Location sharing is blocked.</div>
        <p className="mt-1 text-xs opacity-80">
          The owner won&apos;t see your position on the map. To re-enable:
        </p>
        <ul className="mt-1 list-disc pl-5 text-xs opacity-80">
          <li>
            iOS Safari: tap <strong>AA</strong> in the address bar → Website
            Settings → Location → Allow.
          </li>
          <li>
            Chrome: click the padlock icon in the address bar → Location →
            Allow, then refresh.
          </li>
        </ul>
      </Banner>
    );
  }

  if (state.kind === "error") {
    return <Banner tone="warn">{state.message}</Banner>;
  }

  // sharing
  const accText =
    state.accuracy != null
      ? `${Math.round(state.accuracy)}m accuracy`
      : "awaiting fix";
  return (
    <Banner tone="live">
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
        <span>
          Sharing your location · <span className="opacity-80">{accText}</span>
        </span>
      </span>
      <p className="mt-1.5 text-xs opacity-70">
        Keep this screen on so updates keep flowing to the owner.
      </p>
    </Banner>
  );
}

function Banner({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "warn" | "live";
}) {
  if (tone === "live") {
    return (
      <div className="rounded-2xl bg-midnight px-4 py-3 text-sm text-bone">
        {children}
      </div>
    );
  }
  if (tone === "warn") {
    return (
      <div className="rounded-2xl border border-paper bg-paper/60 px-4 py-3 text-sm text-midnight">
        {children}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-paper bg-bone px-4 py-3 text-sm text-midnight/80">
      {children}
    </div>
  );
}

// Rough distance in metres between two lat/lng points — spherical law of cosines
function metersBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a = toRad(lat1);
  const b = toRad(lat2);
  const dlng = toRad(lng2 - lng1);
  return Math.acos(
    Math.min(
      1,
      Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dlng),
    ),
  ) * R;
}
