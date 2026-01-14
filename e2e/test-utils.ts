import { execSync } from 'child_process';

export async function runCommand(
  command: string
): Promise<{ success: boolean; output: string }> {
  try {
    const output = execSync(`node dist/main.js ${command} 2>&1`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const output =
      execError.stdout || execError.stderr || execError.message || '';
    return { success: false, output: output.trim() };
  }
}
