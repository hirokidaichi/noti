import { assertEquals, assertExists, assertStringIncludes } from '@std/assert';
import { loadTestConfig, runCommand, setupConfigure } from './setup.ts';

// コメント機能のE2Eテスト
Deno.test({
  name: 'Page Comment E2E Tests',
  async fn(t) {
    const config = await loadTestConfig();
    await setupConfigure();

    let threadId: string | undefined;

    await t.step('should add comment to page', async () => {
      const testComment = 'Test comment ' + new Date().toISOString();
      const { success, output } = await runCommand(
        `page comment add ${config.NOTION_ROOT_ID} "${testComment}"`,
      );

      assertEquals(success, true);
      assertExists(output);

      // スレッドIDを抽出
      const match = output.match(/スレッドID: ([a-f0-9-]+)/);
      if (match && match[1]) {
        threadId = match[1];
        console.log(`Captured thread ID: ${threadId}`);
      }
    });

    await t.step('should get comments from page', async () => {
      const { success, output } = await runCommand(
        `page comment get ${config.NOTION_ROOT_ID} -f json`,
      );

      assertEquals(success, true);
      assertExists(output);

      const comments = JSON.parse(output);
      assertEquals(Array.isArray(comments.results), true);
      assertTrue(comments.results.length > 0, 'コメントが存在しない');
    });

    await t.step('should get comments in thread format', async () => {
      const { success, output } = await runCommand(
        `page comment get ${config.NOTION_ROOT_ID}`,
      );

      assertEquals(success, true);
      assertExists(output);
    });

    await t.step('should list comment threads', async () => {
      const { success, output } = await runCommand(
        `page comment list-threads ${config.NOTION_ROOT_ID}`,
      );

      assertEquals(success, true);
      assertExists(output);
      assertStringIncludes(output, 'コメントスレッドがあります');
    });

    // スレッドIDが取得できた場合のみ実行
    if (threadId) {
      await t.step('should reply to a comment thread', async () => {
        const replyText = 'Reply to thread ' + new Date().toISOString();
        const { success, output } = await runCommand(
          `page comment reply ${config.NOTION_ROOT_ID} ${threadId} "${replyText}"`,
        );

        assertEquals(success, true);
        assertStringIncludes(output, 'コメントスレッドに返信しました');
      });
    }
  },
});

function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}
