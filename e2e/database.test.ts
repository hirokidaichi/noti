import { assertEquals, assertExists } from '@std/assert';
import { loadTestConfig, runCommand, setupConfigure } from './setup.ts';

Deno.test('Database E2E Tests', async (t) => {
  const config = await loadTestConfig();
  await setupConfigure();

  await t.step('should list databases', async () => {
    const { success, output } = await runCommand('database list --json');
    assertEquals(success, true);
    assertExists(output);
  });

  await t.step('should get database by id', async () => {
    const { success, output } = await runCommand(
      `database page get ${config.NOTION_ROOT_ID} --json`,
    );
    assertEquals(success, true);
    assertExists(output);
  });

  await t.step('should get database pages', async () => {
    const { success, output } = await runCommand(
      `database page get ${config.NOTION_ROOT_ID} --json`,
    );
    assertEquals(success, true);
    assertExists(output);
  });
});
