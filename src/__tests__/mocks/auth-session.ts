import { vi } from "vitest";

/**
 * セッション型定義
 */
export interface MockSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string;
    role?: string;
    provider?: string;
  };
  expires: string;
}

/**
 * 標準ユーザーセッション
 */
export const mockSession: MockSession = {
  user: {
    id: "1",
    name: "テストユーザー",
    email: "test@example.com",
    username: "testuser",
    role: "user",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間後
};

/**
 * 管理者セッション
 */
export const mockAdminSession: MockSession = {
  user: {
    id: "admin-1",
    name: "管理者",
    email: "admin@example.com",
    username: "admin",
    role: "admin",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * 現場作業員セッション
 */
export const mockFieldSession: MockSession = {
  user: {
    id: "field-1",
    name: "現場作業員",
    email: "field@example.com",
    username: "fieldworker",
    role: "field",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * LINEログインユーザーセッション
 */
export const mockLineSession: MockSession = {
  user: {
    id: "line-user-1",
    name: "LINEユーザー",
    username: "line_12345678",
    role: "user",
    provider: "line",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * 期限切れセッション
 */
export const mockExpiredSession: MockSession = {
  user: {
    id: "1",
    name: "期限切れユーザー",
    email: "expired@example.com",
    username: "expired",
    role: "user",
  },
  expires: new Date(Date.now() - 1000).toISOString(), // 過去の日時
};

/**
 * next-auth の auth() 関数をモック
 */
export function mockAuth(session: MockSession | null = mockSession) {
  return vi.fn(async () => session);
}

/**
 * next-auth/react のモックをセットアップ
 */
export function setupAuthMock(session: MockSession | null = mockSession) {
  vi.mock("next-auth/react", () => ({
    useSession: () => ({
      data: session,
      status: session ? "authenticated" : "unauthenticated",
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  }));
}

/**
 * @/auth のモックをセットアップ
 * 注意: この関数は各テストファイルで直接 vi.mock を使用することを推奨
 * vi.mock はホイスティングされるため、関数内での呼び出しは予期しない動作を引き起こす可能性がある
 */
export function setupServerAuthMock(sessionValue: MockSession | null = mockSession) {
  // vi.mock は関数内では正しく動作しないため、各テストファイルで直接使用すること
  console.warn(
    "setupServerAuthMock は非推奨です。各テストファイルで直接 vi.mock を使用してください。"
  );
}

/**
 * テスト用のモックユーザーデータ
 */
export const mockUsers = {
  testUser: {
    id: 1,
    username: "testuser",
    name: "テストユーザー",
    password: "$2b$10$...", // ハッシュ化されたパスワード
    role: "user",
    lineId: null,
    email: "test@example.com",
    image: null,
  },
  adminUser: {
    id: 2,
    username: "admin",
    name: "管理者",
    password: "$2b$10$...",
    role: "admin",
    lineId: null,
    email: "admin@example.com",
    image: null,
  },
  lineUser: {
    id: 3,
    username: "line_12345678",
    name: "LINEユーザー",
    password: "$2b$10$...",
    role: "user",
    lineId: "U1234567890abcdef",
    email: null,
    image: "https://profile.line-scdn.net/...",
  },
};
