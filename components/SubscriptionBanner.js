'use client';

import { useSession } from "next-auth/react";


export default function SubscriptionBanner() {
  const { data: session } = useSession();
  const sub = session?.user?.subscription;

  if (!sub) return null; // don't show anything for guests

  const isPaid = sub === "paid";
  const message = isPaid
    ? "✅ You are using the PAID version (ad-free)"
    : "💡 You are using the FREE version (ads enabled)";

  const bg = isPaid ? "#d1fae5" : "#fef3c7"; // greenish vs. yellowish

  return (
  <div
    className={isPaid ? "banner-paid" : "banner-free"}
    style={{
      padding: "8px 16px",
      fontSize: "14px",
      textAlign: "center",
    }}
  >
    {message}
  </div>
);

}
