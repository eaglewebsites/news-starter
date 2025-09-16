import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    // Google is optional; only used if env vars are present
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        // Replace with real user lookup. This is a mock:
        if (creds?.email === "user@example.com" && creds?.password === "test123") {
          return {
            id: "1",
            name: "Test User",
            email: "user@example.com",
            // Toggle this to "paid" to simulate a paid subscriber:
            subscription: "free"
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.subscription = user.subscription || "free";
      return token;
    },
    async session({ session, token }) {
      session.user.subscription = token.subscription || "free";
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
