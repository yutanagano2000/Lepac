/**
 * パスワードポリシー検証ユーティリティ
 * 商業レベルSaaSに必要なパスワード強度を確保
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
} as const;

const SPECIAL_CHARACTERS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

/**
 * パスワードがポリシーを満たしているか検証
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`パスワードは${PASSWORD_REQUIREMENTS.minLength}文字以上必要です`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("大文字を1文字以上含める必要があります");
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("小文字を1文字以上含める必要があります");
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push("数字を1文字以上含める必要があります");
  }

  if (PASSWORD_REQUIREMENTS.requireSpecial && !SPECIAL_CHARACTERS.test(password)) {
    errors.push("特殊文字(!@#$%^&*など)を1文字以上含める必要があります");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * パスワード強度スコア（0-100）
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  // 長さによるスコア（最大40点）
  score += Math.min(password.length * 3, 40);

  // 文字種別によるスコア（各15点）
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (SPECIAL_CHARACTERS.test(password)) score += 15;

  return Math.min(score, 100);
}

/**
 * パスワード要件の説明文を取得
 */
export function getPasswordRequirementsText(): string {
  return `パスワードは以下の要件を満たす必要があります:
- ${PASSWORD_REQUIREMENTS.minLength}文字以上
- 大文字を1文字以上
- 小文字を1文字以上
- 数字を1文字以上
- 特殊文字(!@#$%^&*など)を1文字以上`;
}
