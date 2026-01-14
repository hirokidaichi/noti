import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadTestConfig, runCommand, setupConfigure } from './setup.js';

describe('Page E2E Tests', () => {
  let createdPageId: string | undefined;

  beforeAll(async () => {
    await loadTestConfig();
    await setupConfigure();
  });

  it('should create a new page', async () => {
    const config = await loadTestConfig();
    // 一時的なMarkdownファイルを作成
    const tempFile = join(tmpdir(), `test-${Date.now()}.md`);
    writeFileSync(tempFile, '# E2E Test Page\n\nThis is a test page.');

    const { success, output } = await runCommand(
      `page create ${config.NOTION_ROOT_ID} ${tempFile}`
    );
    expect(success).toBe(true);
    expect(output).toBeDefined();

    // Extract page ID from output
    const match = output.match(/https:\/\/www\.notion\.so\/.*-([a-f0-9]{32})/);
    createdPageId = match?.[1];
    expect(createdPageId).toBeDefined();

    // 一時ファイルを削除
    unlinkSync(tempFile);
  });

  it('should get page content', async () => {
    if (!createdPageId) return;
    const { success, output } = await runCommand(`page get ${createdPageId}`);
    expect(success).toBe(true);
    expect(output).toBeDefined();
  });

  it('should update page title', async () => {
    if (!createdPageId) return;
    // 一時的なMarkdownファイルを作成
    const tempFile = join(tmpdir(), `test-update-${Date.now()}.md`);
    writeFileSync(
      tempFile,
      '# Updated E2E Test Page\n\nThis is an updated test page.'
    );

    const { success, output } = await runCommand(
      `page update ${createdPageId} ${tempFile}`
    );
    expect(success).toBe(true);
    expect(output).toBeDefined();

    unlinkSync(tempFile);
  });

  it('should delete page', async () => {
    if (!createdPageId) return;
    const { success, output } = await runCommand(
      `page remove ${createdPageId} -f`
    );
    expect(success).toBe(true);
    expect(output).toBeDefined();
  });
});
