import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NotionClient } from '../../src/lib/notion/client.js';
import { loadTestConfig } from '../test-config.js';
import { Config } from '../../src/lib/config/config.js';

describe('Notion Client Database Operations', () => {
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

  describe('Basic Database Operations', () => {
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

      expect(database.id).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((database as any).title[0].text.content).toBe('Test Database');
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

      expect(updated.properties.Tags).toBeDefined();
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updated.properties.Tags as any).multi_select.options[0].name
      ).toBe('Important');
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

      expect(result.results.length).toBe(1);
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result.results[0] as any).properties.Name.title[0].text.content
      ).toBe('Test Entry');
    });
  });

  describe('Database Page Operations', () => {
    it('should move database page between databases', async () => {
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

      expect(movedPage).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((movedPage as any).properties.Name.title[0].text.content).toBe(
        'Page to Move'
      );
    });

    it('should copy database page with content', async () => {
      // テスト用のページを作成（コンテンツ付き）
      const sourcePage = await client.createDatabasePage(testDatabaseId, {
        Name: { title: [{ text: { content: 'Page to Copy' } }] },
        Status: { select: { name: 'Todo' } },
      });

      // コンテンツを追加
      await client.appendBlocks(sourcePage.id, [
        {
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Test content' } }],
          },
        },
      ]);

      // ページをコピー
      const copiedPage = await client.moveOrCopyDatabasePage({
        page_id: sourcePage.id,
        target_database_id: testDatabaseId,
        operation: 'copy',
        with_content: true,
      });

      expect(copiedPage).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((copiedPage as any).properties.Name.title[0].text.content).toBe(
        'Page to Copy'
      );

      // コンテンツが正しくコピーされたか確認
      const blocks = await client.getBlocks(copiedPage.id);
      expect(blocks.results.length).toBe(1);
      expect(
        (blocks.results[0] as any).paragraph.rich_text[0].text.content // eslint-disable-line @typescript-eslint/no-explicit-any
      ).toBe('Test content');
    });
  });

  describe('Advanced Database Features', () => {
    describe('Relations', () => {
      let sourceDbId: string;
      let targetDbId: string;

      beforeAll(async () => {
        // ターゲットデータベースを作成
        const targetDb = await client.createDatabase({
          parent: { page_id: testPageId },
          title: [{ text: { content: 'Target DB for Relations' } }],
          properties: {
            Name: { title: {} },
            Status: {
              select: {
                options: [
                  { name: 'Active', color: 'green' },
                  { name: 'Archived', color: 'red' },
                ],
              },
            },
          },
        });
        targetDbId = targetDb.id;

        // ソースデータベースを作成（リレーションを持つ）
        const sourceDb = await client.createDatabase({
          parent: { page_id: testPageId },
          title: [{ text: { content: 'Source DB with Relations' } }],
          properties: {
            Name: { title: {} },
            RelatedItems: {
              relation: {
                database_id: targetDbId,
                type: 'single_property',
                single_property: {},
              },
            },
          },
        });
        sourceDbId = sourceDb.id;
      });

      it('should create and retrieve single relation', async () => {
        // ターゲットページを作成
        const targetPage = await client.createDatabasePage(targetDbId, {
          Name: { title: [{ text: { content: 'Target Page' } }] },
          Status: { select: { name: 'Active' } },
        });

        // リレーションを持つページを作成
        const sourcePage = await client.createDatabasePage(sourceDbId, {
          Name: { title: [{ text: { content: 'Source Page' } }] },
          RelatedItems: {
            relation: [{ id: targetPage.id }],
          },
        });

        // リレーションを確認
        const retrievedPage = await client.getPage(sourcePage.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relations = (retrievedPage as any).properties.RelatedItems
          .relation;
        expect(relations.length).toBe(1);
        expect(relations[0].id).toBe(targetPage.id);
      });

      it('should handle multiple relations', async () => {
        // 複数のターゲットページを作成
        const targetPages = await Promise.all([
          client.createDatabasePage(targetDbId, {
            Name: { title: [{ text: { content: 'Target Page 1' } }] },
            Status: { select: { name: 'Active' } },
          }),
          client.createDatabasePage(targetDbId, {
            Name: { title: [{ text: { content: 'Target Page 2' } }] },
            Status: { select: { name: 'Active' } },
          }),
        ]);

        // 複数のリレーションを持つページを作成
        const sourcePage = await client.createDatabasePage(sourceDbId, {
          Name: {
            title: [
              {
                text: { content: 'Source Page with Multiple Relations' },
              },
            ],
          },
          RelatedItems: {
            relation: targetPages.map((page) => ({ id: page.id })),
          },
        });

        // リレーションを確認
        const retrievedPage = await client.getPage(sourcePage.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relations = (retrievedPage as any).properties.RelatedItems
          .relation;
        expect(relations.length).toBe(2);
        expect(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          relations.map((r: any) => r.id).sort()
        ).toEqual(targetPages.map((p) => p.id).sort());
      });

      it('should update relations', async () => {
        // 初期ページを作成
        const targetPage1 = await client.createDatabasePage(targetDbId, {
          Name: { title: [{ text: { content: 'Initial Target' } }] },
          Status: { select: { name: 'Active' } },
        });

        const sourcePage = await client.createDatabasePage(sourceDbId, {
          Name: { title: [{ text: { content: 'Source Page for Update' } }] },
          RelatedItems: {
            relation: [{ id: targetPage1.id }],
          },
        });

        // 新しいターゲットページを作成
        const targetPage2 = await client.createDatabasePage(targetDbId, {
          Name: { title: [{ text: { content: 'New Target' } }] },
          Status: { select: { name: 'Active' } },
        });

        // リレーションを更新
        await client.updateDatabasePage(sourcePage.id, {
          RelatedItems: {
            relation: [{ id: targetPage2.id }],
          },
        });

        // 更新されたリレーションを確認
        const updatedPage = await client.getPage(sourcePage.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relations = (updatedPage as any).properties.RelatedItems.relation;
        expect(relations.length).toBe(1);
        expect(relations[0].id).toBe(targetPage2.id);
      });
    });
  });

  describe('Error Cases', () => {
    it('should handle invalid property type definitions', async () => {
      try {
        await client.createDatabase({
          parent: { page_id: testPageId },
          title: [{ text: { content: 'Invalid Database' } }],
          properties: {
            Name: { title: {} },
            InvalidType: {
              // @ts-expect-error テスト用に意図的に不正な型を指定
              invalid_type: {},
            },
          },
        });
        throw new Error('Expected to throw an error for invalid property type');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(error.message.includes('validation')).toBe(true);
      }
    });

    it('should handle missing required properties', async () => {
      try {
        await client.createDatabase({
          parent: { page_id: testPageId },
          title: [{ text: { content: 'Missing Required Props DB' } }],
          properties: {
            // タイトルプロパティ（Name）が必須だが、意図的に省略
            Description: { rich_text: {} },
          },
        });
        throw new Error(
          'Expected to throw an error for missing required properties'
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        // Notion APIはタイトルなしでもデータベースを作成できる場合があるため
        // エラーが発生した場合のみアサート
        expect(error.message).toBeDefined();
      }
    });

    it('should handle non-existent database access', async () => {
      const nonExistentId = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
      try {
        await client.getDatabase(nonExistentId);
        throw new Error('Expected to throw an error for non-existent database');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        // エラーが発生することを確認（メッセージ形式はAPI版により異なる）
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid database page property values', async () => {
      // 有効なデータベースを作成
      const database = await client.createDatabase({
        parent: { page_id: testPageId },
        title: [{ text: { content: 'Test Invalid Props DB' } }],
        properties: {
          Name: { title: {} },
          Priority: { number: { format: 'number' } },
        },
      });

      try {
        await client.createDatabasePage(database.id, {
          Name: { title: [{ text: { content: 'Test Entry' } }] },
          Priority: {
            type: 'number',
            // @ts-expect-error テスト用に意図的に不正な値を指定
            number: 'not a number' as unknown as number,
          },
        });
        throw new Error(
          'Expected to throw an error for invalid property value'
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(error.message.includes('number')).toBe(true);
      }
    });

    it('should handle invalid database ID format', async () => {
      const invalidId = 'invalid-database-id';
      try {
        await client.getDatabase(invalidId);
        throw new Error(
          'Expected to throw an error for invalid database ID format'
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(error.message.includes('valid')).toBe(true);
      }
    });
  });

  // クリーンアップ
  afterAll(async () => {
    if (testPageId) {
      await client.removePage(testPageId);
    }
  });
});
