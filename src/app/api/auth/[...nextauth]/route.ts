```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const client = await pool.connect();
        try {
          // Get user from database
          const userResult = await client.query(
            "SELECT id, email, password_hash, status FROM users WHERE email = $1",
            [credentials.email.toLowerCase()]
          );

          if (userResult.rows.length === 0) {
            // Log failed attempt
            await client.query(
              "INSERT INTO login_attempts (email, ip_address, success, attempted_at) VALUES ($1, $2, $3, NOW())",
              [credentials.email, "unknown", false]
            );
            throw new Error("Invalid email or password");
          }

          const user = userResult.rows[0];

          // Check if user is active
          if (user.status !== "active") {
            throw new Error("Account is not active");
          }

          // Verify password
          const isPasswordValid = await compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            // Log failed attempt
            await client.query(
              "INSERT INTO login_attempts (email, ip_address, success, attempted_at) VALUES ($1, $2, $3, NOW())",
              [credentials.email, "unknown", false]
            );
            throw new Error("Invalid email or password");
          }

          // Update last login
          await client.query(
            "UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1",
            [user.id]
          );

          // Log successful attempt
          await client.query(
            "INSERT INTO login_attempts (email, ip_address, success, attempted_at) VALUES ($1, $2, $3, NOW())",
            [credentials.email, "unknown", true]
          );

          // Create session
          await client.query(
            "INSERT INTO sessions (user_id, device_info, ip_address, last_activity_at, created_at) VALUES ($1, $2, $3, NOW(), NOW())",
            [user.id, "unknown", "unknown"]
          );

          return {
            id: user.id,
            email: user.email,
          };
        } catch (error) {
          throw error;
        } finally {
          client.release();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```