import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';

interface PropertyDefinition {
  type: string;
  options?: string[];
}

interface DatabaseSchema {
  title: string;
  properties: Record<string, PropertyDefinition>;
}

// Notionプロパティ設定の生成
function generatePropertyConfig(
  properties: Record<string, PropertyDefinition>
) {
  const propertyConfig: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(properties)) {
    switch (prop.type) {
      case 'title':
        propertyConfig[name] = { title: {} };
        break;
      case 'rich_text':
        propertyConfig[name] = { rich_text: {} };
        break;
      case 'number':
        propertyConfig[name] = { number: {} };
        break;
      case 'select':
        propertyConfig[name] = {
          select: {
            options: prop.options?.map((option) => ({ name: option })) || [],
          },
        };
        break;
      case 'multi_select':
        propertyConfig[name] = {
          multi_select: {
            options: prop.options?.map((option) => ({ name: option })) || [],
          },
        };
        break;
      case 'date':
        propertyConfig[name] = { date: {} };
        break;
      case 'checkbox':
        propertyConfig[name] = { checkbox: {} };
        break;
      case 'url':
        propertyConfig[name] = { url: {} };
        break;
      case 'email':
        propertyConfig[name] = { email: {} };
        break;
      case 'phone_number':
        propertyConfig[name] = { phone_number: {} };
        break;
      default:
        propertyConfig[name] = { rich_text: {} };
    }
  }

  return propertyConfig;
}

export const createCommand = new Command('create')
  .description('スキーマJSONから新規データベースを作成')
  .argument('<parent_page_id>', '親ページIDまたはURL')
  .argument('<schema_file>', 'データベーススキーマのJSONファイル')
  .option('-d, --debug', 'デバッグモード')
  .addHelpText(
    'after',
    `
Examples:
  $ noti database create <parent_id> schema.json

スキーマJSON形式:
  {
    "title": "タスク管理",
    "icon": "📋",
    "properties": {
      "Name":     { "type": "title" },
      "Status":   { "type": "select", "options": ["Todo", "In Progress", "Done"] },
      "Priority": { "type": "number" },
      "Tags":     { "type": "multi_select", "options": ["Feature", "Bug"] },
      "Done":     { "type": "checkbox" },
      "URL":      { "type": "url" },
      "Email":    { "type": "email" },
      "DueDate":  { "type": "date" }
    }
  }

対応プロパティ型:
  title, rich_text, number, select, multi_select,
  checkbox, date, url, email, phone_number`
  )
  .action(
    async (
      parentPageId: string,
      schemaFile: string,
      options: { debug?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        const config = await Config.load();

        if (!config.token) {
          outputHandler.error(
            'NotionAPIトークンが設定されていません。`noti configure --token <token>` を実行してください。'
          );
          return;
        }

        const notionClient = new NotionClient(config);

        // 親ページIDの解決
        const resolvedParentId = await pageResolver.resolvePageId(parentPageId);
        outputHandler.debug('Parent Page ID:', resolvedParentId);

        // スキーマファイルの読み込み
        const schemaContent = await readFile(schemaFile, 'utf-8');
        let schema: DatabaseSchema;
        try {
          schema = JSON.parse(schemaContent);
        } catch {
          throw new Error(
            'スキーマファイルのJSONパースに失敗しました。正しいJSON形式か確認してください'
          );
        }
        outputHandler.debug('Schema:', schema);

        if (!schema.title) {
          outputHandler.error('スキーマにtitleが必要です');
          return;
        }

        if (!schema.properties || Object.keys(schema.properties).length === 0) {
          outputHandler.error('スキーマにpropertiesが必要です');
          return;
        }

        // titleプロパティの存在確認
        const hasTitleProperty = Object.values(schema.properties).some(
          (prop) => prop.type === 'title'
        );
        if (!hasTitleProperty) {
          outputHandler.error('スキーマにtype: "title"のプロパティが必要です');
          return;
        }

        const propertyConfig = generatePropertyConfig(schema.properties);
        outputHandler.debug('Property Config:', propertyConfig);

        const response = await notionClient.createDatabase({
          parent: { type: 'page_id', page_id: resolvedParentId },
          title: [{ text: { content: schema.title } }],
          properties: propertyConfig as Parameters<
            typeof notionClient.createDatabase
          >[0]['properties'],
        });

        outputHandler.success('データベースを作成しました');
        console.log(`${response.id}\t${schema.title}`);

        if ('url' in response) {
          outputHandler.info(`URL: ${response.url}`);
        }
      }, 'データベースの作成に失敗しました');
    }
  );
