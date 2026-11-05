/**
 * Runtime feature flags. One place to flip features on/off for launch so
 * we don't have to grep through the codebase.
 *
 * To re-enable Stripe later: set NEXT_PUBLIC_PAYMENTS_ENABLED=true in Vercel
 * and redeploy. All the Stripe wiring (routes, DB fields, lib functions)
 * stays intact — only the UI entry points are gated.
 */

// Payments: owner saves card → walker receives payout via Stripe Connect.
// Off for the initial launch; owner & walker settle in cash on the day.
export const PAYMENTS_ENABLED =
  process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
