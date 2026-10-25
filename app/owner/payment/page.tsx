"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Appearance } from "@stripe/stripe-js";
import { getStripeClient } from "@/lib/stripe-client";
import { getMyProfile } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";
import { Button, Header } from "@/components/UI";

type Card = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
};

const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#0E1C2F",
    colorText: "#0E1C2F",
    colorBackground: "#F6F1E7",
    colorDanger: "#C14A2E",
    fontFamily: "Instrument Sans, system-ui, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #D7CFBD",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid #0E1C2F",
      boxShadow: "none",
    },
  },
};

export default function PaymentPage() {
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  async function safeJson(res: Response) {
    const text = await res.text();
    if (!text) return { ok: false, reason: `Server returned ${res.status} with no body.` };
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, reason: `Non-JSON ${res.status}: ${text.slice(0, 160)}` };
    }
  }

  async function fetchExisting() {
    try {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/stripe/payment-method", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const json = await safeJson(res);
      if (res.status === 503) {
        setConfigured(false);
        return;
      }
      if (json.ok) setCard(json.card || null);
    } catch {
      /* ignore */
    }
  }

  async function startAddCard() {
    setErr(null);
    try {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const json = await safeJson(res);
      if (!json.ok) {
        if (res.status === 503) setConfigured(false);
        setErr(json.reason || `Server error (${res.status}).`);
        return;
      }
      setClientSecret(json.client_secret);
    } catch (e: any) {
      setErr(e?.message || "Could not start card setup.");
    }
  }

  async function removeCard() {
    setErr(null);
    try {
      const sb = getSupabase();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      await fetch("/api/stripe/payment-method", {
        method: "DELETE",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      setCard(null);
    } catch (e: any) {
      setErr(e?.message || "Could not remove card.");
    }
  }

  useEffect(() => {
    (async () => {
      const p = await getMyProfile();
      if (!p || p.role !== "owner") {
        router.replace("/");
        return;
      }
      await fetchExisting();
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone">
        Loading
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-12">
      <Header title="" back="/owner" />

      <section className="px-5 pt-2">
        <h1 className="font-serif text-3xl leading-tight tracking-tightest">
          Payment.
        </h1>
        <p className="mt-2 text-sm text-midnight/70">
          A card on file is charged when your walker finishes a walk. Nothing
          before.
        </p>
      </section>

      <section className="space-y-5 px-5 py-6">
        {!configured && (
          <div className="rounded-2xl border border-paper bg-paper/50 p-4 text-sm text-midnight/80">
            Payments aren&apos;t turned on yet. Add your Stripe keys to
            Vercel to enable them.
          </div>
        )}

        {/* Test mode banner */}
        {configured && (
          <div className="rounded-2xl border border-amber2/30 bg-paper/40 p-4 text-xs text-midnight/80">
            <div className="font-medium">Test mode</div>
            <p className="mt-1">
              Use any future expiry and CVC. Test card:
              <br />
              <span className="font-mono text-midnight">4242 4242 4242 4242</span>
            </p>
          </div>
        )}

        {/* Existing card */}
        {card && !clientSecret && (
          <div className="flex items-center justify-between rounded-2xl border border-paper bg-bone px-4 py-4">
            <div>
              <div className="font-serif text-lg capitalize">
                {card.brand} ending {card.last4}
              </div>
              <div className="mt-0.5 text-xs text-stone">
                Expires {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
              </div>
            </div>
            <button
              type="button"
              onClick={removeCard}
              className="text-xs text-clay hover:underline"
            >
              Remove
            </button>
          </div>
        )}

        {!card && !clientSecret && configured && (
          <div className="rounded-2xl border border-dashed border-chalk bg-paper/40 px-5 py-8 text-center">
            <p className="text-sm text-midnight/70">
              No card on file. Add one so your walker can be paid when the walk
              finishes.
            </p>
            <div className="mt-4">
              <Button
                full={false}
                onClick={startAddCard}
              >
                Add a card
              </Button>
            </div>
          </div>
        )}

        {card && !clientSecret && (
          <button
            type="button"
            onClick={startAddCard}
            className="text-sm font-medium text-midnight underline underline-offset-2"
          >
            Replace card
          </button>
        )}

        {err && (
          <div className="rounded-xl border border-clay/40 bg-bone p-3 text-sm text-clay">
            {err}
          </div>
        )}

        {clientSecret && (
          <ElementsWrapper
            clientSecret={clientSecret}
            onDone={async () => {
              setClientSecret(null);
              await fetchExisting();
            }}
            onCancel={() => setClientSecret(null)}
          />
        )}
      </section>
    </main>
  );
}

function ElementsWrapper({
  clientSecret,
  onDone,
  onCancel,
}: {
  clientSecret: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-paper bg-bone p-4">
      <Elements
        stripe={getStripeClient()}
        options={{ clientSecret, appearance }}
      >
        <CardForm onDone={onDone} onCancel={onCancel} />
      </Elements>
    </div>
  );
}

function CardForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setErr(null);
    setSaving(true);
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });
      if (result.error) {
        setErr(result.error.message || "Could not save the card.");
        setSaving(false);
        return;
      }
      onDone();
    } catch (e: any) {
      setErr(e?.message || "Could not save the card.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {err && (
        <div className="rounded-xl border border-clay/40 bg-bone p-3 text-sm text-clay">
          {err}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!stripe || saving}
          className="flex-1 rounded-full bg-midnight px-5 py-3 text-sm font-medium text-bone disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full px-4 py-3 text-sm text-stone hover:text-midnight"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
