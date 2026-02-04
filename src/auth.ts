import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Line from "next-auth/providers/line";
import { authConfig } from "./auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // LINE認証
    Line({
      clientId: process.env.LINE_CLIENT_ID!,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    }),
    // 従来のユーザー名/パスワード認証
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ username: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { username, password } = parsedCredentials.data;

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.username, username));

          if (!user) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user as any;
        }

        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // LINE認証の場合、ユーザーをDBに登録/更新
      if (account?.provider === "line" && profile) {
        const lineId = profile.sub as string;
        const name = user.name || profile.name as string || "LINE User";
        const image = user.image || profile.picture as string;

        // 既存ユーザーを検索
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.lineId, lineId));

        if (existingUser) {
          // 既存ユーザーの情報を更新
          await db
            .update(users)
            .set({ name, image })
            .where(eq(users.lineId, lineId));

          // user.idを既存のDBのIDに設定
          user.id = String(existingUser.id);
          (user as any).username = existingUser.username;
        } else {
          // 新規ユーザーを作成
          const username = `line_${lineId.substring(0, 8)}`;
          const hashedPassword = await bcrypt.hash(lineId, 10); // ダミーパスワード

          const [newUser] = await db
            .insert(users)
            .values({
              username,
              name,
              password: hashedPassword,
              lineId,
              image,
              role: "user",
            })
            .returning();

          user.id = String(newUser.id);
          (user as any).username = newUser.username;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.username = (user as any).username;
        token.sub = user.id;
      }
      if (account?.provider === "line") {
        token.provider = "line";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.username && session.user) {
        (session.user as any).username = token.username;
      }
      if (token.provider && session.user) {
        (session.user as any).provider = token.provider;
      }
      return session;
    },
  },
});
