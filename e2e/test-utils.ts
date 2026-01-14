import { execSync } from 'child_process';

export async function runCommand(
  command: string
): Promise<{ success: boolean; output: string }> {
  try {
    const output = execSync(`node dist/main.js ${command}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string };
    const output = (execError.stdout || '') + (execError.stderr || '');
    return { success: false, output };
  }
}
