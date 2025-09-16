'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: f.get("email"),
      password: f.get("password"),
      redirect: false,
    });
    if (res?.ok) router.push("/");
    else setErr("Invalid login");
  };

  return (
    <main style={{maxWidth:420, margin:'60px auto'}}>
      <h1 style={{marginBottom:16}}>Sign in</h1>
      {err && <p className="text-red-600">{err}</p>}
      <form onSubmit={onSubmit} className="border rounded p-4" style={{display:'grid', gap:12}}>
        <input name="email" type="email" placeholder="Email" required className="p-2 border rounded" />
        <input name="password" type="password" placeholder="Password" required className="p-2 border rounded" />
        <button type="submit" className="p-2 rounded" style={{background:'#000', color:'#fff'}}>Sign in</button>
      </form>
      <div className="mt-6">
        <button onClick={() => signIn("google")} className="p-2 border rounded" style={{width:'100%'}}>
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
