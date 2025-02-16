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
