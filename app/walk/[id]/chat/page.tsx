"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getMessages,
  getMyProfile,
  getWalk,
  Message,
  Profile,
  sendMessage,
  subscribeToMessages,
  WalkWithRefs,
} from "@/lib/db";
import { Header } from "@/components/UI";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [walk, setWalk] = useState<WalkWithRefs | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notAllowed, setNotAllowed] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p) {
        router.replace("/");
        return;
      }
      setMe(p);
      const w = await getWalk(params.id);
      if (!w) {
        setNotAllowed("Walk not found.");
        return;
      }
      if (w.owner_id !== p.id && w.walker_id !== p.id) {
        setNotAllowed("You're not part of this walk.");
        return;
      }
      setWalk(w);
      try {
        const msgs = await getMessages(w.id);
        setMessages(msgs);
      } catch {}
    })();
  }, [params.id, router]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!walk) return;
    const unsub = subscribeToMessages(walk.id, (m) => {
      setMessages((prev) =>
        prev.some((x) => x.id === m.id) ? prev : [...prev, m],
      );
    });
    return unsub;
  }, [walk?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !walk || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(walk.id, text);
      // Optimistic: append; realtime will skip duplicates
      setMessages((prev) =>
        prev.some((x) => x.id === msg.id) ? prev : [...prev, msg],
      );
      setDraft("");
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  if (notAllowed) {
    return (
      <main className="min-h-screen">
        <Header title="" back="/" />
        <div className="px-5 py-16 text-center">
          <h1 className="font-serif text-2xl">{notAllowed}</h1>
        </div>
      </main>
    );
  }
  if (!me || !walk) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  const otherName =
    me.id === walk.owner_id ? walk.walker_name || "Walker" : walk.owner_name || "Owner";
  const backHref =
    me.role === "owner" ? `/owner/walk/${walk.id}` : `/walker/walk/${walk.id}`;

  return (
    <main className="flex min-h-screen flex-col">
      <Header
        title=""
        back={backHref}
        right={
          <div className="text-right">
            <div className="font-serif text-base leading-tight">{otherName}</div>
            <div className="text-xs text-stone">
              {walk.dog_name} · {walk.area}
            </div>
          </div>
        }
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.length === 0 ? (
          <div className="mt-16 text-center text-sm text-stone">
            Say hello to {otherName}.
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.sender_id === me.id;
              const prev = messages[i - 1];
              const grouped = prev && prev.sender_id === m.sender_id;
              const showGap = !grouped;
              return (
                <li
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${showGap ? "pt-2" : ""}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
                      mine
                        ? "rounded-br-md bg-midnight text-bone"
                        : "rounded-bl-md border border-paper bg-paper/50 text-midnight"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <div
                      className={`mt-0.5 text-[10px] ${mine ? "text-bone/60" : "text-stone"}`}
                    >
                      {new Date(m.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={onSend}
        className="sticky bottom-0 border-t border-paper bg-bone px-4 py-3"
      >
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${otherName}…`}
            maxLength={1000}
            className="flex-1 rounded-full border border-chalk bg-bone px-4 py-3 text-[15px] placeholder:text-stone/60 focus:border-midnight focus:outline-none"
            enterKeyHint="send"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="shrink-0 rounded-full bg-midnight px-5 py-3 text-sm font-medium text-bone disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
}
