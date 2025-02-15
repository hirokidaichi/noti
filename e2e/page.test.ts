import { assertEquals, assertExists } from '@std/assert';
import { loadTestConfig, runCommand, setupConfigure } from './setup.ts';

Deno.test('Page E2E Tests', async (t) => {
  const config = await loadTestConfig();
  await setupConfigure();
  let createdPageId: string | undefined;

  await t.step('should create a new page', async () => {
    // 一時的なMarkdownファイルを作成
    const tempFile = await Deno.makeTempFile({ suffix: '.md' });
    await Deno.writeTextFile(
      tempFile,
      '# E2E Test Page\n\nThis is a test page.',
    );

    const { success, output } = await runCommand(
      `page create ${config.NOTION_ROOT_ID} ${tempFile}`,
    );
    assertEquals(success, true);
    assertExists(output);
    console.log('Command output:', output);
    // Extract page ID from output
    const match = output.match(/https:\/\/www\.notion\.so\/.*-([a-f0-9]{32})/);
    console.log('Regex match:', match);
    createdPageId = match?.[1];
    assertExists(createdPageId, 'Failed to extract created page ID');

    // 一時ファイルを削除
    await Deno.remove(tempFile);
  });

  await t.step('should get page content', async () => {
    if (!createdPageId) return;
    const { success, output } = await runCommand(`page get ${createdPageId}`);
    assertEquals(success, true);
    assertExists(output);
  });

  await t.step('should update page title', async () => {
    if (!createdPageId) return;
    // 一時的なMarkdownファイルを作成
    const tempFile = await Deno.makeTempFile({ suffix: '.md' });
    await Deno.writeTextFile(
      tempFile,
      '# Updated E2E Test Page\n\nThis is an updated test page.',
    );
    const { success, output } = await runCommand(
      `page update ${createdPageId} ${tempFile}`,
    );
    assertEquals(success, true);
    assertExists(output);
    await Deno.remove(tempFile);
  });

  await t.step('should delete page', async () => {
    if (!createdPageId) return;
    const { success, output } = await runCommand(
      `page remove ${createdPageId} -f`,
    );
    assertEquals(success, true);
    assertExists(output);
  });
});
