import { Command } from '@cliffy/command';
import { AliasManager } from '../lib/config/aliases.ts';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';
import { PageResolver } from '../lib/command-utils/page-resolver.ts';

export const aliasCommand = new Command()
  .name('alias')
  .description('エイリアス管理')
  .command(
    'add',
    new Command()
      .description('エイリアスを追加')
      .arguments('<alias:string> <page_id_or_url:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, alias: string, pageIdOrUrl: string) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();
        const pageResolver = await PageResolver.create();

        await errorHandler.withErrorHandling(async () => {
          // ページIDの解決
          const pageId = await pageResolver.resolvePageId(pageIdOrUrl);
          outputHandler.debug('Page ID:', pageId);

          // エイリアスの追加
          const aliasManager = await AliasManager.load();
          aliasManager.set(alias, pageId);
          await aliasManager.update();

          outputHandler.success(`エイリアス "${alias}" を追加しました`);
        }, 'エイリアスの追加に失敗しました');
      }),
  )
  .command(
    'remove',
    new Command()
      .description('エイリアスを削除')
      .arguments('<alias:string>')
      .option('-d, --debug', 'デバッグモード')
      .action(async (options, alias: string) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();

        await errorHandler.withErrorHandling(async () => {
          const aliasManager = await AliasManager.load();
          outputHandler.debug('Current Aliases:', aliasManager.getAll());

          if (!aliasManager.get(alias)) {
            throw new Error(`エイリアス "${alias}" は存在しません`);
          }

          aliasManager.remove(alias);
          await aliasManager.update();

          outputHandler.success(`エイリアス "${alias}" を削除しました`);
        }, 'エイリアスの削除に失敗しました');
      }),
  )
  .command(
    'list',
    new Command()
      .description('エイリアス一覧を表示')
      .option('-d, --debug', 'デバッグモード')
      .option('-j, --json', 'JSON形式で出力')
      .action(async (options) => {
        const outputHandler = new OutputHandler({ debug: options.debug });
        const errorHandler = new ErrorHandler();

        await errorHandler.withErrorHandling(async () => {
          const aliasManager = await AliasManager.load();
          const aliases = aliasManager.getAll();
          outputHandler.debug('Aliases:', aliases);

          if (options.json) {
            await outputHandler.handleOutput(JSON.stringify(aliases, null, 2), {
              json: true,
            });
            return;
          }

          if (Object.keys(aliases).length === 0) {
            outputHandler.info('エイリアスは登録されていません');
            return;
          }

          const output = Object.entries(aliases)
            .map(([alias, pageId]) => `${alias}: ${pageId}`)
            .join('\n');

          await outputHandler.handleOutput(output);
        }, 'エイリアス一覧の取得に失敗しました');
      }),
  );
