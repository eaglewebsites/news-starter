import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "@/components/Providers";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Your News Network",
  description: "Next.js starter with auth, ads, and paywall",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #eee'}}>
          <Logo />
          <div style={{opacity:0.8, fontSize:14}}>
            {session?.user ? `Welcome, ${session.user.name || session.user.email}` : 'Guest'}
          </div>
        </header>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
