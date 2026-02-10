import { Command } from 'commander';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import type { DataSourceObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';

type PropertySchema = DataSourceObjectResponse['properties'][string];

// selectやmulti_selectのオプション名を抽出
function extractOptions(prop: PropertySchema): string[] {
  if (prop.type === 'select' && 'select' in prop) {
    return (
      (prop.select as { options?: { name: string }[] }).options?.map(
        (o) => o.name
      ) ?? []
    );
  }
  if (prop.type === 'multi_select' && 'multi_select' in prop) {
    return (
      (prop.multi_select as { options?: { name: string }[] }).options?.map(
        (o) => o.name
      ) ?? []
    );
  }
  if (prop.type === 'status' && 'status' in prop) {
    return (
      (prop.status as { options?: { name: string }[] }).options?.map(
        (o) => o.name
      ) ?? []
    );
  }
  return [];
}

// プロパティの詳細情報を取得
function getPropertyDetail(prop: PropertySchema): string {
  const options = extractOptions(prop);
  if (options.length > 0) {
    return `[${options.join(', ')}]`;
  }
  if (
    prop.type === 'number' &&
    'number' in prop &&
    (prop.number as { format?: string }).format
  ) {
    return `(${(prop.number as { format: string }).format})`;
  }
  return '';
}

export function formatSchema(
  properties: DataSourceObjectResponse['properties']
): string {
  const entries = Object.entries(properties);
  if (entries.length === 0) return 'プロパティがありません';

  // カラム幅を計算
  const nameWidth = Math.max(...entries.map(([name]) => name.length), 4);
  const typeWidth = Math.max(...entries.map(([, prop]) => prop.type.length), 4);

  const header = `${'Name'.padEnd(nameWidth)}  ${'Type'.padEnd(typeWidth)}  Detail`;
  const separator = `${'─'.repeat(nameWidth)}  ${'─'.repeat(typeWidth)}  ${'─'.repeat(20)}`;

  const rows = entries.map(([name, prop]) => {
    const detail = getPropertyDetail(prop);
    return `${name.padEnd(nameWidth)}  ${prop.type.padEnd(typeWidth)}  ${detail}`;
  });

  return [header, separator, ...rows].join('\n');
}

export const schemaCommand = new Command('schema')
  .description('データベースのスキーマ（プロパティ定義）を表示')
  .argument('<database_id_or_url>', 'データベースIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option('-j, --json', 'JSON形式で出力')
  .option('-o, --output <path>', '出力ファイルパス')
  .addHelpText(
    'after',
    `
Examples:
  $ noti database schema <database_id>
  $ noti database schema <database_id> --json
  $ noti database schema https://notion.so/xxxx -o schema.json --json

Output (default):
  Name      Type          Detail
  ──────    ────────────  ──────────────────
  Name      title
  Status    select        [Todo, In Progress, Done]
  Priority  number        (number)
  Tags      multi_select  [Feature, Bug]

Output (--json):
  DataSourceのproperties全体をJSON出力`
  )
  .action(
    async (
      databaseIdOrUrl: string,
      options: { debug?: boolean; json?: boolean; output?: string }
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

        // データソース情報の取得
        const dataSource = await client.getDataSourceWithProperties(databaseId);
        outputHandler.debug('DataSource Info:', dataSource);

        if (options.json) {
          await outputHandler.handleOutput(
            JSON.stringify(dataSource.properties, null, 2),
            { output: options.output, json: true }
          );
          return;
        }

        const output = formatSchema(dataSource.properties);
        await outputHandler.handleOutput(output, {
          output: options.output,
        });
      }, 'データベーススキーマの取得に失敗しました');
    }
  );
