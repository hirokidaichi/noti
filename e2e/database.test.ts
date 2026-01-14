import { describe, it, expect, beforeAll } from 'vitest';
import { loadTestConfig, runCommand, setupConfigure } from './setup.js';

describe('Database E2E Tests', () => {
  beforeAll(async () => {
    await loadTestConfig();
    await setupConfigure();
  });

  it('should list databases', async () => {
    const { success, output } = await runCommand('database list --json');
    expect(success).toBe(true);
    expect(output).toBeDefined();
  });
});

// database page関連のテストは一時的にスキップ
describe.skip('Database Page E2E Tests', () => {
  beforeAll(async () => {
    await loadTestConfig();
    await setupConfigure();
  });

  it('should get database by id', async () => {
    const config = await loadTestConfig();
    const { success, output } = await runCommand(
      `database page get ${config.NOTION_ROOT_ID} --json`
    );
    expect(success).toBe(true);
    expect(output).toBeDefined();
  });

  it('should get database pages', async () => {
    const config = await loadTestConfig();
    const { success, output } = await runCommand(
      `database page get ${config.NOTION_ROOT_ID} --json`
    );
    expect(success).toBe(true);
    expect(output).toBeDefined();
  });
});
