import { Command } from 'commander';
import { AliasManager } from '../lib/config/aliases.js';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';
import { PageResolver } from '../lib/command-utils/page-resolver.js';

// エイリアス追加の共通処理を関数として抽出
const addAlias = async (
  alias: string,
  pageIdOrUrl: string,
  options: { debug?: boolean }
) => {
  const outputHandler = new OutputHandler({ debug: options.debug ?? false });
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
};

const addCommand = new Command('add')
  .description('エイリアスを追加')
  .argument('<alias>', 'エイリアス名')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .action(addAlias);

const setCommand = new Command('set')
  .description('エイリアスを追加（addコマンドと同じ）')
  .argument('<alias>', 'エイリアス名')
  .argument('<page_id_or_url>', 'ページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .action(addAlias);

const removeCommand = new Command('remove')
  .description('エイリアスを削除')
  .argument('<alias>', 'エイリアス名')
  .option('-d, --debug', 'デバッグモード')
  .action(async (alias: string, options: { debug?: boolean }) => {
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
  });

const listAliasCommand = new Command('list')
  .description('エイリアス一覧を表示')
  .option('-d, --debug', 'デバッグモード')
  .option('-j, --json', 'JSON形式で出力')
  .action(async (options: { debug?: boolean; json?: boolean }) => {
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
  });

export const aliasCommand = new Command('alias')
  .description('エイリアス管理')
  .addCommand(addCommand)
  .addCommand(setCommand)
  .addCommand(removeCommand)
  .addCommand(listAliasCommand);
