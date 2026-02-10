import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import type {
  CreatePageParameters,
  PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';
import { formatPropertyForUpdate } from './page-add.js';

export async function updatePageFromJson(
  client: NotionClient,
  pageId: string,
  jsonFile: string,
  outputHandler: OutputHandler
): Promise<void> {
  // JSONファイルの読み込み
  const jsonContent = await readFile(jsonFile, 'utf-8');
  const data = JSON.parse(jsonContent);
  outputHandler.debug('JSON Data:', data);

  // ページ情報の取得（親データベースIDの特定用）
  const page = (await client.getPage(pageId)) as PageObjectResponse;
  outputHandler.debug('Page Info:', page);

  let databaseId: string;
  if (page.parent.type === 'database_id') {
    databaseId = page.parent.database_id.replace(/-/g, '');
  } else if (
    page.parent.type === 'data_source_id' &&
    'database_id' in page.parent
  ) {
    databaseId = (page.parent as { database_id: string }).database_id.replace(
      /-/g,
      ''
    );
  } else {
    throw new Error('このページはデータベースページではありません');
  }

  // データソース情報の取得（プロパティの検証用）
  const dataSource = await client.getDataSourceWithProperties(databaseId);
  outputHandler.debug('DataSource Info:', dataSource);

  // プロパティの変換
  const propertyValues: CreatePageParameters['properties'] = {};
  for (const [key, value] of Object.entries(data.properties)) {
    const propType = dataSource.properties[key]?.type;
    if (!propType) {
      outputHandler.info(
        `警告: プロパティ "${key}" はデータベースに存在しません`
      );
      continue;
    }

    try {
      propertyValues[key] = formatPropertyForUpdate(value, propType);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `プロパティ "${key}" の変換に失敗しました: ${errorMessage}`
      );
    }
  }

  outputHandler.debug('Property Values:', propertyValues);
  const response = await client.updateDatabasePage(pageId, propertyValues);
  outputHandler.debug('API Response:', response);

  outputHandler.success('データベースページを更新しました:');
  const output = [
    `ID: ${response.id}`,
    `URL: https://notion.so/${response.id.replace(/-/g, '')}`,
  ].join('\n');

  await outputHandler.handleOutput(output);
}

export const updateCommand = new Command('update')
  .description('データベースページのプロパティを更新')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .argument('<json_file>', 'プロパティデータのJSONファイル')
  .option('-d, --debug', 'デバッグモード')
  .addHelpText(
    'after',
    `
Examples:
  $ noti database page update <page_id> update.json
  $ noti database page update https://notion.so/xxxx update.json

JSON format (update.json):
  {
    "properties": {
      "Status": "Done",
      "Priority": 5,
      "Tags": ["完了", "レビュー済"]
    }
  }

Notes:
  - 指定したプロパティのみ更新（未指定のプロパティは変更なし）
  - JSON形式は add コマンドと同一
  - 対応プロパティ型: title, rich_text, number, select,
    multi_select, checkbox, date, url, email, phone_number`
  )
  .action(
    async (
      pageIdOrUrl: string,
      jsonFile: string,
      options: { debug?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // ページIDの解決
        const pageId = await pageResolver.resolvePageId(pageIdOrUrl);
        outputHandler.debug('Page ID:', pageId);

        await updatePageFromJson(client, pageId, jsonFile, outputHandler);
      }, 'データベースページの更新に失敗しました');
    }
  );
