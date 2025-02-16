import { assertEquals, assertExists } from '@std/assert';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { NotionClient } from '../src/lib/notion/client.ts';
import { loadTestConfig } from './test-config.ts';
import { Config } from '../src/lib/config/config.ts';

describe('Database Operations', () => {
  let client: NotionClient;
  let testPageId: string;
  let testDatabaseId: string;

  beforeAll(async () => {
    // テスト用のクライアントとページを準備
    const testConfig = await loadTestConfig();
    const config = new Config({ apiToken: testConfig.NOTION_TOKEN });
    client = new NotionClient(config);

    // テスト用の親ページを作成
    const page = await client.createPage({
      parentId: testConfig.NOTION_ROOT_ID,
      title: 'Test Database Parent',
    });
    testPageId = page.id;
  });

  it('should create a database with properties', async () => {
    const database = await client.createDatabase({
      parent: { page_id: testPageId },
      title: [{ text: { content: 'Test Database' } }],
      properties: {
        Name: { title: {} },
        Description: { rich_text: {} },
        Status: {
          select: {
            options: [
              { name: 'Todo', color: 'red' },
              { name: 'Done', color: 'green' },
            ],
          },
        },
        Priority: {
          number: {
            format: 'number',
          },
        },
      },
    });

    assertExists(database.id);
    assertEquals((database as any).title[0].text.content, 'Test Database');
    testDatabaseId = database.id;
  });

  it('should update database properties', async () => {
    const updated = await client.updateDatabase({
      database_id: testDatabaseId,
      properties: {
        Tags: {
          multi_select: {
            options: [
              { name: 'Important', color: 'red' },
              { name: 'Bug', color: 'yellow' },
            ],
          },
        },
      },
    });

    assertExists(updated.properties.Tags);
    assertEquals(
      (updated.properties.Tags as any).multi_select.options[0].name,
      'Important',
    );
  });

  it('should query database with filters', async () => {
    // テスト用のエントリを作成
    await client.createDatabasePage(testDatabaseId, {
      Name: { title: [{ text: { content: 'Test Entry' } }] },
      Status: { select: { name: 'Todo' } },
      Priority: { number: 1 },
    });

    const result = await client.queryDatabase({
      database_id: testDatabaseId,
      filter: {
        property: 'Status',
        select: {
          equals: 'Todo',
        },
      },
    });

    assertEquals(result.results.length, 1);
    assertEquals(
      (result.results[0] as any).properties.Name.title[0].text.content,
      'Test Entry',
    );
  });

  it('should move database page', async () => {
    // 新しいデータベースを作成
    const newDatabase = await client.createDatabase({
      parent: { page_id: testPageId },
      title: [{ text: { content: 'Target Database' } }],
      properties: {
        Name: { title: {} },
        Status: {
          select: {
            options: [
              { name: 'New', color: 'blue' },
              { name: 'Done', color: 'green' },
            ],
          },
        },
      },
    });

    // テスト用のページを作成
    const page = await client.createDatabasePage(testDatabaseId, {
      Name: { title: [{ text: { content: 'Page to Move' } }] },
      Status: { select: { name: 'Todo' } },
    });

    // ページを移動
    const movedPage = await client.moveOrCopyDatabasePage({
      page_id: page.id,
      target_database_id: newDatabase.id,
      operation: 'move',
    });

    assertExists(movedPage);
    assertEquals(
      (movedPage as any).properties.Name.title[0].text.content,
      'Page to Move',
    );
  });

  // クリーンアップ
  afterAll(async () => {
    if (testPageId) {
      await client.removePage(testPageId);
    }
  });
});
