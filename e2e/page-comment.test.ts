import { assertEquals, assertExists, assert } from '@std/assert';
import { loadTestConfig, runCommand, setupConfigure } from './setup.ts';

// コメント機能が実装されるまでスキップ
Deno.test({
  name: 'Page Comment E2E Tests',
  ignore: true,
  async fn(t) {
    const config = await loadTestConfig();
    await setupConfigure();
    let createdPageId: string | undefined;

    await t.step('setup: create a test page', async () => {
      // 一時的なMarkdownファイルを作成
      const tempFile = await Deno.makeTempFile({ suffix: '.md' });
      await Deno.writeTextFile(
        tempFile,
        '# Comment Test Page\n\nThis is a test page for comments.',
      );

      const { success, output } = await runCommand(
        `page create ${config.NOTION_ROOT_ID} ${tempFile}`,
      );
      assertEquals(success, true);
      assertExists(output);
      // Extract page ID from output
      const match = output.match(/https:\/\/www\.notion\.so\/.*-([a-f0-9]{32})/);
      createdPageId = match?.[1];
      assertExists(createdPageId, 'Failed to extract created page ID');

      // 一時ファイルを削除
      await Deno.remove(tempFile);

      // すぐにコメントを追加
      if (createdPageId) {
        const { success: commentSuccess, output: commentOutput } = await runCommand(
          `page comment add ${createdPageId} "This is a test comment"`,
        );
        assertEquals(commentSuccess, true);
        assertExists(commentOutput);
      }
    });

    await t.step('should list comments on page', async () => {
      if (!createdPageId) return;
      const { success, output } = await runCommand(
        `page comment get ${createdPageId}`,
      );
      assertEquals(success, true);
      assertExists(output);
      assert(
        output.includes('This is a test comment'),
        'Comment should be listed in the output',
      );
    });

    await t.step('cleanup: delete test page', async () => {
      if (!createdPageId) return;
      const { success, output } = await runCommand(
        `page remove ${createdPageId} -f`,
      );
      assertEquals(success, true);
      assertExists(output);
    });
  },
}); 