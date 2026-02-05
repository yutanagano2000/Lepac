import NextAuth, { User } from "next-auth";
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
      async authorize(credentials): Promise<User | null> {
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
          if (passwordsMatch) {
            return {
              id: String(user.id),
              name: user.name,
              email: user.email,
              image: user.image,
              username: user.username,
              organizationId: user.organizationId,
              role: user.role,
            };
          }
        }

        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      console.log("[LINE Auth] signIn callback started", { provider: account?.provider });

      // LINE認証の場合、ユーザーをDBに登録/更新
      if (account?.provider === "line") {
        try {
          const lineId = (profile?.sub as string) || user.id || "";
          if (!lineId) {
            console.error("[LINE Auth] No lineId found");
            return false;
          }
          const name = user.name || (profile?.name as string) || "LINE User";
          const image = user.image || (profile?.picture as string);

          console.log("[LINE Auth] Processing user:", { lineId, name });

          // 既存ユーザーを検索
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.lineId, lineId));

          if (existingUser) {
            console.log("[LINE Auth] Existing user found:", existingUser.id);
            // 既存ユーザーの情報を更新
            await db
              .update(users)
              .set({ name, image })
              .where(eq(users.lineId, lineId));

            // user.idを既存のDBのIDに設定
            user.id = String(existingUser.id);
            user.username = existingUser.username;
            user.organizationId = existingUser.organizationId;
            user.role = existingUser.role;
          } else {
            console.log("[LINE Auth] Creating new user");
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

            console.log("[LINE Auth] New user created:", newUser.id);
            user.id = String(newUser.id);
            user.username = newUser.username;
            user.organizationId = newUser.organizationId;
            user.role = newUser.role;
          }
        } catch (error) {
          console.error("[LINE Auth] Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.username = user.username;
        token.sub = user.id;
        token.organizationId = user.organizationId ?? null;
        token.role = user.role ?? "user";
      }
      if (account?.provider === "line") {
        token.provider = "line";
      }
      // organizationIdがnullの場合、またはセッション更新時にDBから最新の値を取得
      // これによりDB更新後のページリロードでも最新の値が反映される
      if (token.sub && (token.organizationId === null || token.organizationId === undefined || trigger === "update")) {
        try {
          const [currentUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, parseInt(token.sub)));
          if (currentUser) {
            token.organizationId = currentUser.organizationId ?? null;
            token.role = currentUser.role ?? "user";
          }
        } catch (e) {
          console.error("[JWT] Error fetching user:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.username && session.user) {
        session.user.username = token.username;
      }
      if (token.provider && session.user) {
        session.user.provider = token.provider;
      }
      if (session.user) {
        session.user.organizationId = token.organizationId ?? null;
        session.user.role = token.role ?? "user";
      }
      return session;
    },
  },
});
