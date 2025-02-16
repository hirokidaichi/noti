import { loadTestConfig, TestConfig } from './test-config.ts';
import { Config } from '../src/lib/config/config.ts';
import { NotionClient } from '../src/lib/notion/client.ts';
import { runCommand } from './test-utils.ts';

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
  const process = new Deno.Command('deno', {
    args: ['task', 'noti', 'configure'],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });

  const child = process.spawn();
  const encoder = new TextEncoder();
  const writer = child.stdin.getWriter();

  // トークンを入力
  await writer.write(encoder.encode(config.NOTION_TOKEN + '\n'));
  await writer.close();

  const { success, stderr } = await child.output();
  if (!success) {
    const error = new TextDecoder().decode(stderr);
    throw new Error(`Configure failed: ${error}`);
  }
}
