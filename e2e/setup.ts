import { load } from '@std/dotenv';
import { assert } from '@std/assert';

export interface TestConfig {
  NOTION_TOKEN: string;
  NOTION_ROOT_ID: string;
}

export async function loadTestConfig(): Promise<TestConfig> {
  const env = await load({ export: true });

  assert(env.NOTION_TOKEN, 'NOTION_TOKEN is required in .env file');
  assert(env.NOTION_ROOT_ID, 'NOTION_ROOT_ID is required in .env file');

  return {
    NOTION_TOKEN: env.NOTION_TOKEN,
    NOTION_ROOT_ID: env.NOTION_ROOT_ID,
  };
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

export async function runCommand(
  command: string,
): Promise<{ success: boolean; output: string }> {
  const process = new Deno.Command('deno', {
    args: ['task', 'noti', ...command.split(' ')],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { success, stdout, stderr } = await process.output();
  const stdoutText = new TextDecoder().decode(stdout);
  const stderrText = new TextDecoder().decode(stderr);
  const output = stdoutText + stderrText;

  return { success, output };
}
