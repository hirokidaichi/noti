import { assertEquals, assertExists } from '@std/assert';
import { loadTestConfig, runCommand, setupConfigure } from './setup.ts';

// コメント機能が実装されるまでスキップ
Deno.test({
  name: 'Page Comment E2E Tests',
  ignore: true,
  async fn(t) {
    const config = await loadTestConfig();
    await setupConfigure();

    await t.step('should add comment to page', async () => {
      const testComment = 'Test comment ' + new Date().toISOString();
      const { success, output } = await runCommand(
        `page comment add ${config.NOTION_ROOT_ID} "${testComment}"`,
      );
      assertEquals(success, true);
      assertExists(output);
    });

    await t.step('should get comments from page', async () => {
      const { success, output } = await runCommand(
        `page comment get ${config.NOTION_ROOT_ID} --json`,
      );
      assertEquals(success, true);
      assertExists(output);
      const comments = JSON.parse(output);
      assertEquals(Array.isArray(comments.results), true);
    });
  },
});
