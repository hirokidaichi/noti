import { assertEquals, assertMatch } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { NotionClient } from '../src/lib/notion/client.ts';
import { Config } from '../src/lib/config/config.ts';
import { setupTestConfig, setupTestDatabase } from './setup.ts';
import { join } from '@std/path';
import type { APIErrorCode, ClientErrorCode } from '@notionhq/client';
import type {
  PageObjectResponse,
  TextRichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints.js';

Deno.test({
  name: 'database page commands',
  ignore: true,
  fn() {
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
        await Deno.writeTextFile(
          jsonPath,
          JSON.stringify(jsonContent, null, 2),
        );

        // コマンドを実行
        const process = new Deno.Command('deno', {
          args: [
            'run',
            '-A',
            'src/main.ts',
            'database',
            'page',
            'add',
            databaseId,
            '--input-json',
            jsonPath,
          ],
        });
        const { stdout } = await process.output();
        const output = new TextDecoder().decode(stdout);

        // 出力の検証
        assertMatch(output, /データベースページを作成しました/);
        assertMatch(output, /ID: [a-f0-9-]+/);

        // IDを抽出して保存
        const match = output.match(/ID: ([a-f0-9-]+)/);
        if (match) {
          testPageId = match[1];
        }

        // 作成されたページの内容を検証
        const page = await client.getPage(testPageId) as PageObjectResponse;
        assertEquals(
          page.properties.Name.type === 'title'
            ? page.properties.Name.title[0].plain_text
            : '',
          'Test Page from JSON',
        );

        // テストファイルの削除
        await Deno.remove(jsonPath);
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

      it('should get page info in markdown format', async () => {
        const process = new Deno.Command('deno', {
          args: [
            'run',
            '-A',
            'src/main.ts',
            'database',
            'page',
            'get',
            testPageId,
          ],
        });
        const { stdout } = await process.output();
        const output = new TextDecoder().decode(stdout);

        assertMatch(output, /# プロパティ/);
        assertMatch(output, /Name: Test Page for Get/);
        assertMatch(output, /Tags: test/);
      });

      it('should get page info in JSON format', async () => {
        const process = new Deno.Command('deno', {
          args: [
            'run',
            '-A',
            'src/main.ts',
            'database',
            'page',
            'get',
            testPageId,
            '--json',
          ],
        });
        const { stdout } = await process.output();
        const output = new TextDecoder().decode(stdout);

        const data = JSON.parse(output);
        assertEquals(data.page.id, testPageId);
        const page = data.page as PageObjectResponse;
        const titleItem = page.properties.Name.type === 'title'
          ? page.properties.Name.title[0] as TextRichTextItemResponse
          : null;
        assertEquals(
          titleItem?.text.content || '',
          'Test Page for Get',
        );
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
        const process = new Deno.Command('deno', {
          args: [
            'run',
            '-A',
            'src/main.ts',
            'database',
            'page',
            'remove',
            testPageId,
            '--force',
          ],
        });
        const { stdout } = await process.output();
        const output = new TextDecoder().decode(stdout);

        assertMatch(output, /ページ「Test Page for Remove」を削除しました/);

        // ページが実際に削除されたことを確認
        try {
          await client.getPage(testPageId);
          throw new Error('ページが削除されていません');
        } catch (error) {
          const apiError = error as { code: APIErrorCode | ClientErrorCode };
          assertEquals(apiError.code, 'object_not_found');
        }

        // テストページIDをクリア（afterEachでの削除を防ぐ）
        testPageId = '';
      });
    });
  },
});
