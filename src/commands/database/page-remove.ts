import { Command } from '@cliffy/command';
import { Confirm } from '@cliffy/prompt';
import { NotionClient } from '../../lib/notion/client.ts';
import { Config } from '../../lib/config/config.ts';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../../lib/command-utils/error-handler.ts';
import { PageResolver } from '../../lib/command-utils/page-resolver.ts';

export const removeCommand = new Command()
  .description('データベースページを削除')
  .arguments('<database_page_id_or_url:string>')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '確認なしで削除')
  .action(async (options, databasePageIdOrUrl) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();
    const pageResolver = await PageResolver.create();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      // ページIDの解決
      const pageId = await pageResolver.resolvePageId(databasePageIdOrUrl);
      outputHandler.debug('Page ID:', pageId);

      // ページ情報の取得
      const page = await client.getPage(pageId) as PageObjectResponse;
      outputHandler.debug('Page Info:', page);

      // タイトルの取得
      const title = Object.values(page.properties).find((prop) =>
        prop.type === 'title'
      )?.title?.[0]?.plain_text || 'Untitled';

      // 確認プロンプト（--forceオプションがない場合）
      if (!options.force) {
        const answer = await Confirm.prompt(
          `ページ「${title}」を削除しますか？`,
        );
        if (!answer) {
          outputHandler.info('削除をキャンセルしました');
          Deno.exit(0);
        }
      }

      // ページの削除
      await client.removePage(pageId);
      outputHandler.success(`ページ「${title}」を削除しました`);
    }, 'ページの削除に失敗しました');
  });
