"use client";

import { useEffect, useState } from "react";
import {
  ensurePushSubscription,
  requestPushPermission,
} from "@/lib/push";

/**
 * Dropped onto the home pages. Tries to attach the user's existing push
 * subscription silently; if the browser hasn't been asked yet, surfaces a
 * tiny prompt the user can tap to opt in.
 */
export function PushBootstrap() {
  const [state, setState] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    ensurePushSubscription()
      .then((r) => setState(r))
      .catch(() => {});
  }, []);

  if (dismissed) return null;
  if (state !== "needs-prompt") return null;

  async function enable() {
    try {
      const r = await requestPushPermission();
      setState(r);
      if (r !== "subscribed") setDismissed(true);
    } catch {
      setDismissed(true);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-paper bg-paper/40 px-4 py-3">
      <div className="text-xs text-midnight/80">
        <div className="font-medium">Turn on alerts?</div>
        <div className="mt-0.5 text-stone">
          We&apos;ll ping you when something happens with your walks.
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full px-3 py-1.5 text-xs text-stone hover:text-midnight"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={enable}
          className="rounded-full bg-midnight px-3 py-1.5 text-xs font-medium text-bone"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
