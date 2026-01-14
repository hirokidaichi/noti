import { execSync } from 'child_process';
import { loadTestConfig, TestConfig } from './test-config.js';
import { Config } from '../src/lib/config/config.js';
import { NotionClient } from '../src/lib/notion/client.js';
import { runCommand } from './test-utils.js';

export { loadTestConfig, runCommand, type TestConfig };

export async function setupTestConfig(): Promise<Config> {
  const testConfig = await loadTestConfig();
  return new Config({
    apiToken: testConfig.NOTION_TOKEN,
  });
}

export async function setupTestDatabase(client: NotionClient): Promise<string> {
  // テスト用データベースの作成
  const response = await client.createPage({
    parentId: (await loadTestConfig()).NOTION_ROOT_ID,
    title: 'Test Database ' + new Date().toISOString(),
  });
  return response.id;
}

export async function setupConfigure(): Promise<void> {
  const config = await loadTestConfig();
  try {
    execSync(`echo "${config.NOTION_TOKEN}" | node dist/main.js configure`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    const execError = error as { stderr?: string };
    throw new Error(`Configure failed: ${execError.stderr || 'Unknown error'}`);
  }
}
