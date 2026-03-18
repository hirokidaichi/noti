import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';
import { formatSchema } from './schema.js';

// プロパティ値の型定義
type PropertyValue = NonNullable<CreatePageParameters['properties']>[string];

// 読み取り専用プロパティ型（設定不可）
const READ_ONLY_TYPES = new Set([
  'formula',
  'rollup',
  'created_time',
  'created_by',
  'last_edited_time',
  'last_edited_by',
  'button',
  'unique_id',
  'verification',
]);

// 日付文字列かどうかを判定（ISO 8601形式）
function isDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/.test(value);
}

// プロパティが読み取り専用かどうか
export function isReadOnlyType(type: string): boolean {
  return READ_ONLY_TYPES.has(type);
}

// 値の型がプロパティ型と一致するかバリデーション
export function validatePropertyValue(
  key: string,
  value: unknown,
  type: string
): string | null {
  switch (type) {
    case 'title':
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
      if (typeof value !== 'string') {
        return `"${key}" (${type}) には文字列を指定してください（現在: ${typeof value}）`;
      }
      return null;
    case 'number':
      if (typeof value !== 'number') {
        return `"${key}" (number) には数値を指定してください（現在: ${typeof value}）`;
      }
      return null;
    case 'select':
    case 'status':
      if (typeof value !== 'string') {
        return `"${key}" (${type}) には選択肢名の文字列を指定してください（現在: ${typeof value}）`;
      }
      return null;
    case 'multi_select':
      if (!Array.isArray(value)) {
        return `"${key}" (multi_select) には文字列の配列を指定してください（現在: ${typeof value}）`;
      }
      return null;
    case 'checkbox':
      if (typeof value !== 'boolean') {
        return `"${key}" (checkbox) にはtrue/falseを指定してください（現在: ${typeof value}）`;
      }
      return null;
    case 'date':
      if (
        typeof value !== 'string' &&
        !(typeof value === 'object' && value !== null && 'start' in value)
      ) {
        return `"${key}" (date) には日付文字列 "YYYY-MM-DD" またはオブジェクト {start, end?} を指定してください`;
      }
      return null;
    case 'relation':
      if (!Array.isArray(value)) {
        return `"${key}" (relation) にはページIDの配列を指定してください（例: ["id1", "id2"]）`;
      }
      return null;
    case 'people':
      if (!Array.isArray(value)) {
        return `"${key}" (people) にはユーザーIDの配列を指定してください（例: ["user_id1"]）`;
      }
      return null;
    default:
      return null;
  }
}

// プロパティ値をNotionのAPI形式に変換（自動変換付き）
export function formatPropertyForUpdate(
  value: unknown,
  type: string
): PropertyValue {
  switch (type) {
    case 'title':
      return {
        title: [{ text: { content: String(value) } }],
      };
    case 'rich_text':
      return {
        rich_text: [{ text: { content: String(value) } }],
      };
    case 'number':
      return { number: value as number };
    case 'select':
      return { select: { name: value as string } };
    case 'status':
      return { status: { name: value as string } };
    case 'multi_select':
      return {
        multi_select: (value as string[]).map((name) => ({ name })),
      };
    case 'checkbox':
      return { checkbox: value as boolean };
    case 'date':
      // 文字列の場合は自動的に { start: "..." } に変換
      if (isDateString(value)) {
        return { date: { start: value } };
      }
      return { date: value as { start: string; end?: string } };
    case 'url':
      return { url: value as string };
    case 'email':
      return { email: value as string };
    case 'phone_number':
      return { phone_number: value as string };
    case 'relation':
      // 文字列配列を自動的に { id: "..." } 配列に変換
      return {
        relation: (value as string[]).map((id) => ({ id })),
      };
    case 'people':
      // ユーザーID配列を自動的に { object: "user", id: "..." } 配列に変換
      return {
        people: (value as string[]).map((id) => ({
          object: 'user' as const,
          id,
        })),
      };
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
    const propSchema = dataSource.properties[key];
    if (!propSchema) {
      // 利用可能なプロパティ名を提示
      const available = Object.keys(dataSource.properties).join(', ');
      outputHandler.info(
        `警告: プロパティ "${key}" はデータベースに存在しません（利用可能: ${available}）`
      );
      continue;
    }

    const propType = propSchema.type;

    // 読み取り専用プロパティのスキップ
    if (isReadOnlyType(propType)) {
      outputHandler.info(
        `警告: プロパティ "${key}" (${propType}) は読み取り専用のためスキップします`
      );
      continue;
    }

    // 値の型バリデーション
    const validationError = validatePropertyValue(key, value, propType);
    if (validationError) {
      throw new Error(validationError);
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
  .argument('[json_file]', 'ページデータのJSONファイル')
  .option('-d, --debug', 'デバッグモード')
  .option(
    '--show-schema',
    'データベースのスキーマを表示して終了（JSONファイル不要）'
  )
  .addHelpText(
    'after',
    `
Examples:
  $ noti database page add <database_id> page.json
  $ noti database page add <database_id> --show-schema  # スキーマ確認
  $ noti database page add https://notion.so/xxxx page.json

JSON format (page.json):
  {
    "properties": {
      "Name": "タスク名",
      "Status": "Todo",
      "Priority": 1,
      "Done": false,
      "Tags": ["feature", "bug"],
      "DueDate": "2026-02-10"
    }
  }

Supported property types:
  title, rich_text, number, select, status, multi_select,
  checkbox, date, url, email, phone_number, relation, people

日付の自動変換:
  "DueDate": "2026-02-10"  →  自動的に { start: "2026-02-10" } に変換

読み取り専用（指定しても無視）:
  formula, rollup, created_time, created_by,
  last_edited_time, last_edited_by, unique_id`
  )
  .action(
    async (
      databaseIdOrUrl: string,
      jsonFile: string | undefined,
      options: { debug?: boolean; showSchema?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();
        const client = new NotionClient(config);

        // データベースIDの解決
        const databaseId =
          await pageResolver.resolveDatabaseId(databaseIdOrUrl);
        outputHandler.debug('Database ID:', databaseId);

        // --show-schema: スキーマ表示して終了
        if (options.showSchema) {
          const dataSource =
            await client.getDataSourceWithProperties(databaseId);
          const output = formatSchema(dataSource.properties);
          await outputHandler.handleOutput(output);
          return;
        }

        if (!jsonFile) {
          throw new Error(
            'JSONファイルを指定してください（スキーマ確認は --show-schema）'
          );
        }

        await createPageFromJson(client, databaseId, jsonFile, outputHandler);
      }, 'データベースページの作成に失敗しました');
    }
  );
