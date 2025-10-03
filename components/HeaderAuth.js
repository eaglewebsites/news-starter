'use client';

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function HeaderAuth() {
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ opacity: 0.8, fontSize: 14 }}>
          {`Welcome, ${session.user.name || session.user.email}`}
        </span>
        <button
          onClick={() => signOut()}
          className="p-2 border rounded"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Guest state → show Sign in + Sign up side by side
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Link href="/login" className="p-2 border rounded">
        Sign in
      </Link>
      <Link href="/signup" className="p-2 border rounded">
        Sign up
      </Link>
    </div>
  );
}
