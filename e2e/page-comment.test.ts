import { describe, it, expect, beforeAll } from 'vitest';
import { loadTestConfig, runCommand, setupConfigure } from './setup.js';

// コメント機能のE2Eテスト
describe('Page Comment E2E Tests', () => {
  let threadId: string | undefined;

  beforeAll(async () => {
    await loadTestConfig();
    await setupConfigure();
  });

  it('should add comment to page', async () => {
    const config = await loadTestConfig();
    const testComment = 'Test comment ' + new Date().toISOString();
    const { success, output } = await runCommand(
      `page comment add ${config.NOTION_ROOT_ID} "${testComment}"`
    );

    expect(success).toBe(true);
    expect(output).toBeDefined();

    // スレッドIDを抽出
    const match = output.match(/スレッドID: ([a-f0-9-]+)/);
    if (match && match[1]) {
      threadId = match[1];
    }
  });

  it('should get comments from page', async () => {
    const config = await loadTestConfig();
    const { success, output } = await runCommand(
      `page comment get ${config.NOTION_ROOT_ID} -f json`
    );

    expect(success).toBe(true);
    expect(output).toBeDefined();

    const comments = JSON.parse(output);
    expect(Array.isArray(comments.results)).toBe(true);
    expect(comments.results.length).toBeGreaterThan(0);
  });

  it('should get comments in thread format', async () => {
    const config = await loadTestConfig();
    const { success, output } = await runCommand(
      `page comment get ${config.NOTION_ROOT_ID}`
    );

    expect(success).toBe(true);
    expect(output).toBeDefined();
  });

  it('should list comment threads', async () => {
    const config = await loadTestConfig();
    const { success, output } = await runCommand(
      `page comment list-threads ${config.NOTION_ROOT_ID}`
    );

    expect(success).toBe(true);
    expect(output).toBeDefined();
    expect(output).toContain('コメントスレッドがあります');
  });

  it('should reply to a comment thread', async () => {
    if (!threadId) {
      return;
    }
    const config = await loadTestConfig();
    const replyText = 'Reply to thread ' + new Date().toISOString();
    const { success, output } = await runCommand(
      `page comment reply ${config.NOTION_ROOT_ID} ${threadId} "${replyText}"`
    );

    expect(success).toBe(true);
    expect(output).toContain('コメントスレッドに返信しました');
  });
});
