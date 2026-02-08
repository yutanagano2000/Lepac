import { describe, it, expect, vi, beforeEach } from "vitest";

// モックデータ
const mockFiles = [
  {
    id: 1,
    projectId: 1,
    fileName: "document.pdf",
    fileUrl: "https://blob.example.com/document.pdf",
    fileType: "application/pdf",
    fileSize: 1024000,
    category: "registry_copy",
    createdAt: "2024-12-01T10:00:00Z",
  },
  {
    id: 2,
    projectId: 1,
    fileName: "photo.jpg",
    fileUrl: "https://blob.example.com/photo.jpg",
    fileType: "image/jpeg",
    fileSize: 512000,
    category: "other",
    createdAt: "2024-12-02T10:00:00Z",
  },
];

let insertedData: any = null;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(mockFiles)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((data) => {
        insertedData = data;
        return {
          returning: vi.fn(() =>
            Promise.resolve([{ id: 3, ...data }])
          ),
        };
      }),
    })),
  },
}));

vi.mock("@/db/schema", () => ({
  projectFiles: { projectId: "projectId", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  desc: vi.fn((a) => ({ field: a, order: "desc" })),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(() =>
    Promise.resolve({
      url: "https://blob.example.com/uploaded-file.pdf",
    })
  ),
  del: vi.fn(() => Promise.resolve()),
}));

import { GET, POST } from "../route";

// ヘルパー関数
function createMockRequest(options: {
  url?: string;
  method?: string;
  formData?: FormData;
}): Request {
  const url = options.url || "http://localhost/api/projects/1/files";
  const init: RequestInit = {
    method: options.method || "GET",
  };

  if (options.formData) {
    init.body = options.formData;
  }

  return new Request(url, init);
}

function createMockFile(
  name: string,
  type: string,
  size: number = 1024
): File {
  // 実際のサイズでUint8Arrayを作成すると大きすぎる場合があるため、
  // 小さいコンテンツを作成してsizeプロパティをオーバーライドする
  const actualContentSize = Math.min(size, 1024);
  const content = new Uint8Array(actualContentSize);
  const file = new File([content], name, { type });

  // sizeプロパティを明示的に上書き
  Object.defineProperty(file, "size", {
    value: size,
    writable: false,
    configurable: true,
  });

  return file;
}

describe("Files API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedData = null;
    process.env = { ...originalEnv, BLOB_READ_WRITE_TOKEN: "test-token" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET /api/projects/[id]/files", () => {
    it("プロジェクトのファイル一覧を取得する", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it("ファイルにメタデータが含まれる", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data[0]).toHaveProperty("fileName");
      expect(data[0]).toHaveProperty("fileUrl");
      expect(data[0]).toHaveProperty("fileType");
      expect(data[0]).toHaveProperty("fileSize");
      expect(data[0]).toHaveProperty("category");
    });

    it("無効なプロジェクトIDで400エラー", async () => {
      const request = createMockRequest({});
      const response = await GET(request, {
        params: Promise.resolve({ id: "invalid" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid project ID");
    });
  });

  describe("POST /api/projects/[id]/files", () => {
    it("ファイルをアップロードする", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "application/pdf", 1024);
      formData.append("file", file);
      formData.append("category", "registry_copy");

      const request = createMockRequest({
        method: "POST",
        formData,
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });
      const data = await response.json();

      expect(data).toHaveProperty("id");
    });

    it("ファイルがない場合は400エラー", async () => {
      const formData = new FormData();
      formData.append("category", "other");

      const request = createMockRequest({
        method: "POST",
        formData,
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("No file provided");
    });

    it("無効なカテゴリで400エラー", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "application/pdf");
      formData.append("file", file);
      formData.append("category", "invalid_category");

      const request = createMockRequest({
        method: "POST",
        formData,
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid category");
    });

    it("許可されていないファイルタイプで400エラー", async () => {
      const formData = new FormData();
      const file = createMockFile("test.exe", "application/x-msdownload");
      formData.append("file", file);

      const request = createMockRequest({
        method: "POST",
        formData,
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("File type not allowed");
    });

    it("ファイルサイズ超過で500エラー", async () => {
      // FormDataを通じてFileオブジェクトを渡すと、sizeプロパティがシリアライズされるため、
      // request.formData()をモックして大きなファイルサイズをシミュレートする
      const mockFile = {
        name: "large.pdf",
        type: "application/pdf",
        size: 11 * 1024 * 1024, // 11MB
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      } as unknown as File;

      const mockFormData = new Map<string, any>();
      mockFormData.set("file", mockFile);

      const request = {
        formData: () =>
          Promise.resolve({
            get: (key: string) => mockFormData.get(key),
          }),
      } as unknown as Request;

      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("File too large");
    });

    it("BLOB_READ_WRITE_TOKENがない場合は500エラー", async () => {
      process.env.BLOB_READ_WRITE_TOKEN = "";

      const formData = new FormData();
      const file = createMockFile("test.pdf", "application/pdf");
      formData.append("file", file);

      const request = createMockRequest({
        method: "POST",
        formData,
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Blob storage not configured");
    });

    it("無効なプロジェクトIDで400エラー", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "application/pdf");
      formData.append("file", file);

      const request = createMockRequest({
        method: "POST",
        formData,
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: "invalid" }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("許可されるファイルタイプ", () => {
    const allowedTypes = [
      { type: "image/jpeg", ext: "jpg" },
      { type: "image/png", ext: "png" },
      { type: "image/gif", ext: "gif" },
      { type: "image/webp", ext: "webp" },
      { type: "application/pdf", ext: "pdf" },
    ];

    allowedTypes.forEach(({ type, ext }) => {
      it(`${ext}ファイルをアップロードできる`, async () => {
        const formData = new FormData();
        const file = createMockFile(`test.${ext}`, type);
        formData.append("file", file);

        const request = createMockRequest({
          method: "POST",
          formData,
        });
        const response = await POST(request, {
          params: Promise.resolve({ id: "1" }),
        });

        expect(response.status).toBe(200);
      });
    });
  });

  describe("許可されるカテゴリ", () => {
    const categories = [
      "registry_copy",
      "cadastral_map",
      "drawing",
      "consent_form",
      "other",
    ];

    categories.forEach((category) => {
      it(`${category}カテゴリでアップロードできる`, async () => {
        const formData = new FormData();
        const file = createMockFile("test.pdf", "application/pdf");
        formData.append("file", file);
        formData.append("category", category);

        const request = createMockRequest({
          method: "POST",
          formData,
        });
        const response = await POST(request, {
          params: Promise.resolve({ id: "1" }),
        });

        expect(response.status).toBe(200);
      });
    });
  });
});
