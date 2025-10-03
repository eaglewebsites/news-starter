import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const TEST_USERS = [
  {
    id: "1",
    name: "Free User",
    email: "free@example.com",
    password: "test123",          // mock only – do NOT use in production
    subscription: "free",
  },
  {
    id: "2",
    name: "Paid User",
    email: "paid@example.com",
    password: "test123",          // mock only – do NOT use in production
    subscription: "paid",
  },
];

export const authOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = TEST_USERS.find(
          (u) => u.email === creds.email && u.password === creds.password
        );
        if (!user) return null;

        // Return only what you want in the token/session
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          subscription: user.subscription,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // If logging in, copy subscription onto token; otherwise preserve previous
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

  session: { strategy: "jwt" },
};
