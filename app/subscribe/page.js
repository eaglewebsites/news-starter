// app/subscribe/page.js
"use client";

import Link from "next/link";
import { useState } from "react";

export default function SubscribePage() {
  // You can tweak these at any time; Stripe amounts can be wired up later.
  const PRICES = {
    monthly: { label: "Monthly", price: 6.99, cadence: "/mo" },
    yearly: { label: "Yearly", price: 69.99, cadence: "/yr", note: "Save 17%" },
  };

  const [coupon, setCoupon] = useState("");

  function handlePlaceholder(plan) {
    const msg =
      `Stripe integration coming soon.\n\n` +
      `Selected plan: ${plan.label} (${formatPrice(plan.price)}${plan.cadence})` +
      (coupon ? `\nCoupon: ${coupon}` : "");
    alert(msg);
  }

  function formatPrice(amount) {
    return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
  }

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 text-black">
      {/* Header */}
      <header className="mx-auto max-w-[640px] text-center">
        <h1 className="font-bold text-[36px] leading-[110%]">Subscribe</h1>
        <p className="mt-3 text-[18px] text-black/80">
          Support local journalism and enjoy an ad-free experience across our sites.
        </p>
      </header>

      {/* Plans */}
      <section className="mx-auto mt-8 grid max-w-[960px] grid-cols-1 gap-6 md:grid-cols-2">
        {/* Monthly */}
        <PlanCard
          label={PRICES.monthly.label}
          price={formatPrice(PRICES.monthly.price)}
          cadence={PRICES.monthly.cadence}
          features={[
            "Ad-free reading experience",
            "Full access to stories and archives",
            "Priority newsletters & alerts",
            "Cancel anytime",
          ]}
          onSelect={() => handlePlaceholder(PRICES.monthly)}
        />

        {/* Yearly */}
        <PlanCard
          label={PRICES.yearly.label}
          price={formatPrice(PRICES.yearly.price)}
          cadence={PRICES.yearly.cadence}
          badge={PRICES.yearly.note}
          highlighted
          features={[
            "Everything in Monthly",
            "Best value for regular readers",
            "Lock in your rate for a year",
          ]}
          onSelect={() => handlePlaceholder(PRICES.yearly)}
        />
      </section>

      {/* Coupon (placeholder only) */}
      <section className="mx-auto mt-8 max-w-[640px]">
        <label htmlFor="coupon" className="block text-sm font-semibold">
          Coupon code (optional)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Enter code"
            className="w-full rounded-md border border-black/20 px-3 py-2 outline-none focus:border-black/40"
          />
          <button
            type="button"
            onClick={() => alert("Stripe coupons will be applied during checkout.")}
            className="whitespace-nowrap rounded-md bg-black px-4 py-2 font-semibold text-white hover:bg-black/90"
          >
            Apply
          </button>
        </div>
        <p className="mt-2 text-sm text-black/60">
          Coupon application will occur on the Stripe checkout page when enabled.
        </p>
      </section>

      {/* FAQ / Notes */}
      <section className="mx-auto mt-10 max-w-[640px] space-y-4">
        <div className="rounded-lg border border-black/10 bg-[#F7F8F9] p-4">
          <h2 className="mb-2 text-lg font-bold">What happens next?</h2>
          <p className="text-[15px] text-black/80">
            When Stripe is enabled, you’ll be redirected to a secure checkout to complete your purchase.
            Afterward, your subscription will activate automatically.
          </p>
        </div>

        <ul className="list-inside list-disc text-[15px] text-black/80">
          <li>Prices shown in USD. Taxes may apply.</li>
          <li>You can cancel anytime from your account page.</li>
          <li>Need help? <Link href="/contact" className="text-[#1e99d0] hover:underline">Contact us</Link>.</li>
        </ul>

        <p className="text-[13px] text-black/60">
          By subscribing, you agree to our{" "}
          <Link href="/terms" className="text-[#1e99d0] hover:underline">Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#1e99d0] hover:underline">Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}

/** ---------- Components ---------- */

function PlanCard({ label, price, cadence, features = [], badge, highlighted = false, onSelect }) {
  return (
    <div
      className={[
        "rounded-2xl border p-6",
        highlighted ? "border-[#1e99d0] bg-[#F0FAFF]" : "border-black/10 bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-bold">{label}</h3>
        {badge && (
          <span className="rounded-full bg-[#1e99d0] px-2 py-1 text-xs font-semibold text-white">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="translate-y-1 text-sm text-black/60">{cadence}</span>
      </div>

      <ul className="mt-4 space-y-2 text-[15px]">
        {features.map((f, i) => (
          <li key={`${label}-f-${i}`} className="flex items-start gap-2">
            <span aria-hidden className="mt-[2px] inline-block h-1.5 w-1.5 rounded-full bg-[#1e99d0]" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        className={[
          "mt-6 w-full rounded-md px-4 py-2 font-semibold",
          highlighted ? "bg-[#1e99d0] text-white hover:bg-[#198bbd]" : "bg-black text-white hover:bg-black/90",
        ].join(" ")}
        aria-label={`Continue with Stripe — ${label}`}
      >
        Continue with Stripe
      </button>
    </div>
  );
}
