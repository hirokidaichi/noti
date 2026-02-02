/**
 * 階層化テスト戦略
 *
 * Level 1: Unit Tests (モック)
 *   - 純粋なロジックのテスト
 *   - 外部依存なし
 *   - 高速実行
 *
 * Level 2: Integration Tests (録画リプレイ)
 *   - API呼び出しパターンのテスト
 *   - nockで録画したレスポンスを使用
 *   - オフラインで実行可能
 *
 * Level 3: E2E Tests (実API)
 *   - 実際のNotion APIを使用
 *   - 重要なフローのみ
 *   - CI/CDで実行（Secrets必要）
 */

import { describe, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';

export type TestLevel = 'unit' | 'integration' | 'e2e';

/**
 * 現在のテストレベルを取得
 */
export function getCurrentTestLevel(): TestLevel {
  const level = process.env.TEST_LEVEL;
  if (level === 'e2e') return 'e2e';
  if (level === 'integration') return 'integration';
  return 'unit';
}

/**
 * テストレベルに応じてテストをスキップ
 */
export function skipIfNotLevel(requiredLevel: TestLevel): boolean {
  const currentLevel = getCurrentTestLevel();

  // e2e は integration と unit を含む
  if (requiredLevel === 'unit') return false;
  if (requiredLevel === 'integration') {
    return currentLevel === 'unit';
  }
  if (requiredLevel === 'e2e') {
    return currentLevel !== 'e2e';
  }
  return false;
}

/**
 * テストレベルに応じた describe
 */
export function describeLevel(
  level: TestLevel,
  name: string,
  fn: () => void
): void {
  const shouldSkip = skipIfNotLevel(level);
  if (shouldSkip) {
    describe.skip(`[${level}] ${name}`, fn);
  } else {
    describe(`[${level}] ${name}`, fn);
  }
}

/**
 * Integrationテスト用のセットアップ
 */
export function setupIntegrationTest(): void {
  beforeEach(() => {
    // HTTPリクエストをインターセプト
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });
}

/**
 * E2Eテスト用の環境チェック
 */
export function checkE2EEnvironment(): {
  isAvailable: boolean;
  reason?: string;
} {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  const rootId = process.env.NOTION_ROOT_ID;

  if (!token) {
    return {
      isAvailable: false,
      reason: 'NOTION_TOKEN または NOTION_API_KEY が設定されていません',
    };
  }

  if (!rootId) {
    return {
      isAvailable: false,
      reason: 'NOTION_ROOT_ID が設定されていません',
    };
  }

  return { isAvailable: true };
}

/**
 * テストカテゴリの定義
 */
export const TestCategories = {
  // 読み取り専用テスト（データを変更しない）
  READONLY: 'readonly',
  // 書き込みテスト（データを作成/更新/削除）
  WRITE: 'write',
  // 遅いテスト（複数のAPI呼び出しを含む）
  SLOW: 'slow',
} as const;

export type TestCategory = (typeof TestCategories)[keyof typeof TestCategories];

/**
 * テストヘルパー: 期待値の部分一致
 */
export function expectPartialMatch<T extends object>(
  actual: T,
  expected: Partial<T>
): void {
  for (const [key, value] of Object.entries(expected)) {
    expect(actual[key as keyof T]).toEqual(value);
  }
}

/**
 * テストヘルパー: 非同期操作のリトライ
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * テストデータのクリーンアップ用ヘルパー
 */
export class TestDataTracker {
  private createdIds: string[] = [];

  track(id: string): void {
    this.createdIds.push(id);
  }

  getCreatedIds(): string[] {
    return [...this.createdIds];
  }

  clear(): void {
    this.createdIds = [];
  }
}
