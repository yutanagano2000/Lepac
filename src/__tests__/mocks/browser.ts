import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// ブラウザ環境用のMSWワーカー（開発時のモック用）
export const worker = setupWorker(...handlers);
