import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';

// プロパティ値の型定義
type PropertyValue = NonNullable<CreatePageParameters['properties']>[string];

// プロパティ値をNotionのAPI形式に変換
function formatPropertyForUpdate(value: unknown, type: string): PropertyValue {
  switch (type) {
    case 'title':
      return {
        title: [{ text: { content: value as string } }],
      };
    case 'rich_text':
      return {
        rich_text: [{ text: { content: value as string } }],
      };
    case 'number':
      return { number: value as number };
    case 'select':
      return { select: { name: value as string } };
    case 'multi_select':
      return {
        multi_select: (value as string[]).map((name) => ({ name })),
      };
    case 'checkbox':
      return { checkbox: value as boolean };
    case 'date':
      return { date: value as { start: string; end?: string } };
    case 'url':
      return { url: value as string };
    case 'email':
      return { email: value as string };
    case 'phone_number':
      return { phone_number: value as string };
    default:
      throw new Error(`未対応のプロパティタイプ: ${type}`);
  }
}

async function createPageFromJson(
  client: NotionClient,
  databaseId: string,
  jsonFile: string,
  outputHandler: OutputHandler
): Promise<void> {
  // JSONファイルの読み込み
  const jsonContent = await readFile(jsonFile, 'utf-8');
  const data = JSON.parse(jsonContent);
  outputHandler.debug('JSON Data:', data);

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

  return createPage(client, databaseId, propertyValues, outputHandler);
}

async function createPage(
  client: NotionClient,
  databaseId: string,
  propertyValues: CreatePageParameters['properties'],
  outputHandler: OutputHandler
): Promise<void> {
  outputHandler.debug('Property Values:', propertyValues);
  const response = await client.createDatabasePage(databaseId, propertyValues);
  outputHandler.debug('API Response:', response);

  outputHandler.success('データベースページを作成しました:');
  const output = [
    `ID: ${response.id}`,
    `URL: https://notion.so/${response.id.replace(/-/g, '')}`,
  ].join('\n');

  await outputHandler.handleOutput(output);
}

export const addCommand = new Command('add')
  .description('データベースに新規ページを追加')
  .argument('<database_id_or_url>', 'データベースIDまたはURL')
  .argument('<json_file>', 'ページデータのJSONファイル')
  .option('-d, --debug', 'デバッグモード')
  .action(
    async (
      databaseIdOrUrl: string,
      jsonFile: string,
      options: { debug?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // データベースIDの解決
        const databaseId = await pageResolver.resolvePageId(databaseIdOrUrl);
        outputHandler.debug('Database ID:', databaseId);

        await createPageFromJson(client, databaseId, jsonFile, outputHandler);
      }, 'データベースページの作成に失敗しました');
    }
  );
