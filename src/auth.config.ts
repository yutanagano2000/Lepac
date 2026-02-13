import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // セキュリティ設定
  trustHost: true, // Vercelデプロイ時のホスト検証
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24時間
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding");
      const isPublicApi = nextUrl.pathname.startsWith("/api/auth") ||
                         nextUrl.pathname.startsWith("/api/register-initial-user") ||
                         nextUrl.pathname.startsWith("/api/mobile");
      const isAdmin = auth?.user?.role === "admin";

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn && !isPublicApi) {
        return false; // Redirect to login
      }

      // ログイン済みユーザーの組織選択チェック
      if (isLoggedIn && !isOnboardingPage && !isPublicApi) {
        const organizationId = auth?.user?.organizationId;
        // organizationIdがnull/undefinedの場合は組織選択画面へリダイレクト
        if (organizationId === null || organizationId === undefined) {
          return Response.redirect(new URL("/onboarding/select-organization", nextUrl));
        }
      }

      // 組織選択済みユーザーがonboardingページにアクセスした場合はホームへリダイレクト
      // ただしadminユーザーは常に組織選択画面にアクセス可能（組織切り替え用）
      if (isLoggedIn && isOnboardingPage && !isAdmin) {
        const organizationId = auth?.user?.organizationId;
        if (organizationId !== null && organizationId !== undefined) {
          return Response.redirect(new URL("/", nextUrl));
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      if (token.username && session.user) {
        session.user.username = token.username;
      }
      if (session.user) {
        session.user.organizationId = token.organizationId ?? null;
        session.user.role = token.role ?? "user";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.organizationId = user.organizationId ?? null;
        token.role = user.role ?? "user";
      }
      return token;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
