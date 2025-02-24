import { Command } from '@cliffy/command';
// import { importCommand } from './database/import.ts';

export const databaseCommand = new Command()
  .name('database')
  .description('Notionデータベースを操作するコマンド');
// .command('import', importCommand); // TODO: インポート機能は開発中
