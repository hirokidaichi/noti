import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { NotionClient } from '../src/lib/notion/client.js';
import { Config } from '../src/lib/config/config.js';
import { setupTestConfig, setupTestDatabase } from './setup.js';
import type {
  PageObjectResponse,
  TextRichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

describe.skip('database page commands', () => {
  let config: Config;
  let client: NotionClient;
  let databaseId: string;
  let testPageId: string;

  beforeEach(async () => {
    config = await setupTestConfig();
    client = new NotionClient(config);
    databaseId = await setupTestDatabase(client);
  });

  afterEach(async () => {
    // テストページの削除
    if (testPageId) {
      await client.removePage(testPageId);
    }
  });

  describe('add command', () => {
    it('should create a page from JSON file', async () => {
      // テスト用のJSONファイルを作成
      const jsonPath = join('e2e', 'fixtures', 'test-page.json');
      const jsonContent = {
        properties: {
          Name: 'Test Page from JSON',
          Tags: ['test', 'json'],
          Status: 'Done',
        },
      };
      writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2));

      // コマンドを実行
      const output = execSync(
        `node dist/main.js database page add ${databaseId} --input-json ${jsonPath}`,
        { encoding: 'utf-8' }
      );

      // 出力の検証
      expect(output).toMatch(/データベースページを作成しました/);
      expect(output).toMatch(/ID: [a-f0-9-]+/);

      // IDを抽出して保存
      const match = output.match(/ID: ([a-f0-9-]+)/);
      if (match) {
        testPageId = match[1];
      }

      // 作成されたページの内容を検証
      const page = (await client.getPage(testPageId)) as PageObjectResponse;
      const titleProp = page.properties.Name;
      expect(
        titleProp.type === 'title' ? titleProp.title[0].plain_text : ''
      ).toBe('Test Page from JSON');

      // テストファイルの削除
      unlinkSync(jsonPath);
    });
  });

  describe('get command', () => {
    beforeEach(async () => {
      // テストページの作成
      const response = await client.createDatabasePage(databaseId, {
        Name: {
          title: [{ text: { content: 'Test Page for Get' } }],
        },
        Tags: {
          multi_select: [{ name: 'test' }],
        },
      });
      testPageId = response.id;
    });

    it('should get page info in markdown format', () => {
      const output = execSync(
        `node dist/main.js database page get ${testPageId}`,
        { encoding: 'utf-8' }
      );

      expect(output).toMatch(/# プロパティ/);
      expect(output).toMatch(/Name: Test Page for Get/);
      expect(output).toMatch(/Tags: test/);
    });

    it('should get page info in JSON format', () => {
      const output = execSync(
        `node dist/main.js database page get ${testPageId} --json`,
        { encoding: 'utf-8' }
      );

      const data = JSON.parse(output);
      expect(data.page.id).toBe(testPageId);
      const page = data.page as PageObjectResponse;
      const titleItem =
        page.properties.Name.type === 'title'
          ? (page.properties.Name.title[0] as TextRichTextItemResponse)
          : null;
      expect(titleItem?.text.content || '').toBe('Test Page for Get');
    });
  });

  describe('remove command', () => {
    beforeEach(async () => {
      // テストページの作成
      const response = await client.createDatabasePage(databaseId, {
        Name: {
          title: [{ text: { content: 'Test Page for Remove' } }],
        },
      });
      testPageId = response.id;
    });

    it('should remove page with --force option', async () => {
      const output = execSync(
        `node dist/main.js database page remove ${testPageId} --force`,
        { encoding: 'utf-8' }
      );

      expect(output).toMatch(/ページ「Test Page for Remove」を削除しました/);

      // ページが実際に削除されたことを確認
      try {
        await client.getPage(testPageId);
        throw new Error('ページが削除されていません');
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((error as any).code).toBe('object_not_found');
      }

      // テストページIDをクリア（afterEachでの削除を防ぐ）
      testPageId = '';
    });
  });
});
