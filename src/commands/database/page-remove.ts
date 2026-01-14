import { Command } from 'commander';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';

export const removeCommand = new Command('remove')
  .description('データベースページを削除')
  .argument('<database_page_id_or_url>', 'データベースページIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option('-f, --force', '削除を実行')
  .action(
    async (
      databasePageIdOrUrl: string,
      options: { debug?: boolean; force?: boolean }
    ) => {
      const outputHandler = new OutputHandler({ debug: options.debug });
      const errorHandler = new ErrorHandler();
      const pageResolver = await PageResolver.create();

      await errorHandler.withErrorHandling(async () => {
        // -f オプションが必須
        if (!options.force) {
          outputHandler.error(
            '削除を実行するには -f オプションを指定してください'
          );
          return;
        }

        const config = await Config.load();
        const client = new NotionClient(config);

        // ページIDの解決
        const pageId = await pageResolver.resolvePageId(databasePageIdOrUrl);
        outputHandler.debug('Page ID:', pageId);

        // ページ情報の取得
        const page = (await client.getPage(pageId)) as PageObjectResponse;
        outputHandler.debug('Page Info:', page);

        // タイトルの取得
        const title =
          Object.values(page.properties).find((prop) => prop.type === 'title')
            ?.title?.[0]?.plain_text || 'Untitled';

        // ページの削除
        await client.removePage(pageId);
        outputHandler.success(`ページ「${title}」を削除しました`);
      }, 'ページの削除に失敗しました');
    }
  );
