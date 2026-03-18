import { Command } from 'commander';
import { pageCommand } from './database/page.js';
import { exportCommand } from './database/export.js';
import { listCommand } from './database/list.js';
import { importCommand } from './database/import.js';
import { createCommand } from './database/create.js';
import { queryCommand } from './database/query.js';
import { schemaCommand } from './database/schema.js';

export const databaseCommand = new Command('database')
  .description('データベースの一覧・スキーマ・クエリ・エクスポート・行操作')
  .addHelpText(
    'after',
    `
コマンド選択ガイド:
  データベース一覧を確認          → database list
  プロパティ定義を確認            → database schema <db_id>
  条件付きでデータを検索          → database query <db_id> -f "Status=Done"
  データを一括エクスポート         → database export <db_id> -f csv
  CSVからデータをインポート       → database import -f data.csv -d <db_id>
  データベースを新規作成          → database create <parent_id> schema.json
  行（ページ）のプロパティを操作  → database page (add/get/update/remove)`
  )
  .addCommand(pageCommand)
  .addCommand(exportCommand)
  .addCommand(listCommand)
  .addCommand(importCommand)
  .addCommand(createCommand)
  .addCommand(queryCommand)
  .addCommand(schemaCommand);
