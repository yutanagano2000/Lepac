import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding");
      const isPublicApi = nextUrl.pathname.startsWith("/api/auth") ||
                         nextUrl.pathname.startsWith("/api/register-initial-user");
      const isAdmin = (auth?.user as any)?.role === "admin";

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn && !isPublicApi) {
        return false; // Redirect to login
      }

      // ログイン済みユーザーの組織選択チェック
      if (isLoggedIn && !isOnboardingPage && !isPublicApi) {
        const organizationId = (auth?.user as any)?.organizationId;
        // organizationIdがnull/undefinedの場合は組織選択画面へリダイレクト
        if (organizationId === null || organizationId === undefined) {
          return Response.redirect(new URL("/onboarding/select-organization", nextUrl));
        }
      }

      // 組織選択済みユーザーがonboardingページにアクセスした場合はホームへリダイレクト
      // ただしadminユーザーは常に組織選択画面にアクセス可能（組織切り替え用）
      if (isLoggedIn && isOnboardingPage && !isAdmin) {
        const organizationId = (auth?.user as any)?.organizationId;
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
        (session.user as any).username = token.username;
      }
      if (session.user) {
        (session.user as any).organizationId = token.organizationId ?? null;
        (session.user as any).role = token.role ?? "user";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.username = (user as any).username;
        token.organizationId = (user as any).organizationId ?? null;
        token.role = (user as any).role ?? "user";
      }
      return token;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
