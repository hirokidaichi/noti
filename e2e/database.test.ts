import { assertEquals, assertExists } from '@std/assert';
import { loadTestConfig, runCommand, setupConfigure } from './setup.ts';

Deno.test('Database E2E Tests', async (t) => {
  const _config = await loadTestConfig();
  await setupConfigure();

  await t.step('should list databases', async () => {
    const { success, output } = await runCommand('database list --json');
    assertEquals(success, true);
    assertExists(output);
  });
});

// database page関連のテストは一時的にスキップ
Deno.test({
  name: 'Database Page E2E Tests',
  ignore: true,
  async fn(t) {
    const _config = await loadTestConfig();
    await setupConfigure();

    await t.step('should get database by id', async () => {
      const { success, output } = await runCommand(
        `database page get ${_config.NOTION_ROOT_ID} --json`,
      );
      assertEquals(success, true);
      assertExists(output);
    });

    await t.step('should get database pages', async () => {
      const { success, output } = await runCommand(
        `database page get ${_config.NOTION_ROOT_ID} --json`,
      );
      assertEquals(success, true);
      assertExists(output);
    });
  },
});
