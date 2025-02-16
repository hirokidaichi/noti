import { Command } from '@cliffy/command';
import { Checkbox, Confirm, Input, Select } from '@cliffy/prompt';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import type { CreatePageParameters } from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';
import { PageResolver } from '../../lib/command-utils/page-resolver.ts';

// データベースのプロパティ型定義
interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
  options?: Array<{ id: string; name: string; color: string }>;
  number?: { format: string };
  formula?: { expression: string };
  date?: { start?: string; end?: string };
  required?: boolean;
}

// プロパティ値の型変換ヘルパー関数
function convertPropertyValue(value: string, type: string): unknown {
  switch (type) {
    case 'number':
      return Number(value);
    case 'checkbox':
      return value.toLowerCase() === 'true';
    case 'date': {
      const date = new Date(value);
      return {
        start: date.toISOString(),
      };
    }
    default:
      return value;
  }
}

// プロパティ入力のバリデーション関数
function validatePropertyValue(value: string, type: string): boolean {
  switch (type) {
    case 'number':
      return !isNaN(Number(value));
    case 'checkbox':
      return ['true', 'false'].includes(value.toLowerCase());
    case 'date':
      return !isNaN(Date.parse(value));
    default:
      return true;
  }
}

// プロパティ値をNotionのAPI形式に変換
function formatPropertyForUpdate(
  value: unknown,
  type: string,
): CreatePageParameters['properties'][string] {
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
  outputHandler: OutputHandler,
): Promise<void> {
  // JSONファイルの読み込み
  const jsonContent = await Deno.readTextFile(jsonFile);
  const data = JSON.parse(jsonContent);
  outputHandler.debug('JSON Data:', data);

  // データベース情報の取得（プロパティの検証用）
  const database = await client.getDatabase(databaseId);
  outputHandler.debug('Database Info:', database);

  // プロパティの変換
  const propertyValues: CreatePageParameters['properties'] = {};
  for (const [key, value] of Object.entries(data.properties)) {
    const propType = database.properties[key]?.type;
    if (!propType) {
      outputHandler.info(
        `警告: プロパティ "${key}" はデータベースに存在しません`,
      );
      continue;
    }

    try {
      propertyValues[key] = formatPropertyForUpdate(value, propType);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new Error(
        `プロパティ "${key}" の変換に失敗しました: ${errorMessage}`,
      );
    }
  }

  return createPage(client, databaseId, propertyValues, outputHandler);
}

async function createPageInteractive(
  client: NotionClient,
  databaseId: string,
  outputHandler: OutputHandler,
): Promise<void> {
  // データベース情報の取得
  const database = await client.getDatabase(databaseId);
  outputHandler.debug('Database Info:', database);

  // プロパティ情報の整理
  const properties: Record<string, DatabaseProperty> = {};
  for (const [name, prop] of Object.entries(database.properties)) {
    properties[name] = {
      id: prop.id,
      name,
      type: prop.type,
      options: prop.type === 'select'
        ? prop.select?.options
        : prop.type === 'multi_select'
        ? prop.multi_select?.options
        : undefined,
      number: prop.type === 'number' ? prop.number : undefined,
      formula: prop.type === 'formula' ? prop.formula : undefined,
      required: ['title'].includes(prop.type),
    };
  }

  // プロパティ値の入力
  const propertyValues: CreatePageParameters['properties'] = {};

  for (const [name, prop] of Object.entries(properties)) {
    // 計算式プロパティはスキップ
    if (prop.type === 'formula') {
      continue;
    }

    let value: unknown;

    switch (prop.type) {
      case 'select': {
        if (prop.options && prop.options.length > 0) {
          const options = prop.options.map((opt) => opt.name);
          value = await Select.prompt({
            message: `${name} を選択してください:`,
            options,
            default: options[0],
          });
        } else {
          value = await Input.prompt(`${name} を入力してください:`);
        }
        break;
      }
      case 'multi_select': {
        if (prop.options && prop.options.length > 0) {
          const options = prop.options.map((opt) => opt.name);
          value = await Checkbox.prompt({
            message: `${name} を選択してください:`,
            options,
          });
        } else {
          const input = await Input.prompt(
            `${name} をカンマ区切りで入力してください:`,
          );
          value = input.split(',').map((v) => v.trim());
        }
        break;
      }
      case 'checkbox': {
        value = await Confirm.prompt(`${name}:`);
        break;
      }
      default: {
        let isValid = false;
        while (!isValid) {
          const input = await Input.prompt({
            message: `${name} を入力してください${
              prop.required ? ' (必須)' : ''
            }:`,
            validate: (value) => {
              if (prop.required && !value) {
                return `${name} は必須項目です`;
              }
              if (value && !validatePropertyValue(value, prop.type)) {
                return `無効な ${prop.type} 形式です`;
              }
              return true;
            },
          });

          if (!input && !prop.required) {
            break;
          }

          value = convertPropertyValue(input, prop.type);
          isValid = true;
        }
      }
    }

    if (value !== undefined) {
      propertyValues[name] = formatPropertyForUpdate(value, prop.type);
    }
  }

  return createPage(client, databaseId, propertyValues, outputHandler);
}

async function createPage(
  client: NotionClient,
  databaseId: string,
  propertyValues: CreatePageParameters['properties'],
  outputHandler: OutputHandler,
): Promise<void> {
  outputHandler.debug('Property Values:', propertyValues);
  const response = await client.createDatabasePage(
    databaseId,
    propertyValues,
  );
  outputHandler.debug('API Response:', response);

  outputHandler.success('データベースページを作成しました:');
  const output = [
    `ID: ${response.id}`,
    `URL: https://notion.so/${response.id.replace(/-/g, '')}`,
  ].join('\n');

  await outputHandler.handleOutput(output);
}

export const addCommand = new Command()
  .description('データベースに新規ページを追加')
  .arguments('<database_id_or_url:string>')
  .option('-d, --debug', 'デバッグモード')
  .option('-j, --input-json <path:string>', 'JSONファイルからページを作成')
  .action(async (options, databaseIdOrUrl) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();
    const pageResolver = await PageResolver.create();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      // データベースIDの解決
      const databaseId = await pageResolver.resolvePageId(databaseIdOrUrl);
      outputHandler.debug('Database ID:', databaseId);

      if (options.inputJson) {
        await createPageFromJson(
          client,
          databaseId,
          options.inputJson,
          outputHandler,
        );
      } else {
        await createPageInteractive(client, databaseId, outputHandler);
      }
    }, 'データベースページの作成に失敗しました');
  });
