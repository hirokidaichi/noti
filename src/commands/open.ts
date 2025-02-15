import { Command } from '@cliffy/command';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { APIErrorCode, APIResponseError } from '@notionhq/client';
import { OutputHandler } from '../lib/command-utils/output-handler.ts';
import { ErrorHandler } from '../lib/command-utils/error-handler.ts';
import { PageResolver } from '../lib/command-utils/page-resolver.ts';

async function openBrowser(url: string) {
  let command: string[];

  switch (Deno.build.os) {
    case 'windows':
      command = ['cmd', '/c', 'start'];
      break;
    case 'linux':
      command = ['xdg-open'];
      break;
    case 'darwin':
      command = ['open'];
      break;
    default:
      throw new Error(`未対応のOS: ${Deno.build.os}`);
  }

  const process = new Deno.Command(command[0], {
    args: [...command.slice(1), url],
  });

  const { success } = await process.output();
  if (!success) {
    throw new Error(`ブラウザでの開封に失敗しました: ${url}`);
  }
}

async function getNotionUrl(client: NotionClient, id: string): Promise<string> {
  // まずページとして取得を試みる
  try {
    const page = await client.getPage(id);
    if ('url' in page) {
      return page.url;
    }
  } catch (error) {
    if (
      !(error instanceof APIResponseError &&
        error.code === APIErrorCode.ObjectNotFound)
    ) {
      throw error;
    }
  }

  // ページとして取得できない場合、データベースとして取得を試みる
  try {
    const database = await client.getDatabase(id);
    if ('url' in database) {
      return database.url;
    }
  } catch (error) {
    if (
      error instanceof APIResponseError &&
      error.code === APIErrorCode.ObjectNotFound
    ) {
      throw new Error(
        `指定されたID ${id} はページまたはデータベースとして見つかりませんでした`,
      );
    }
    throw error;
  }

  throw new Error('URLが取得できませんでした');
}

export const openCommand = new Command()
  .name('open')
  .description('Notionのページまたはデータベースをブラウザで開きます')
  .arguments('<id_or_url_alias:string>')
  .option('-d, --debug', 'デバッグモード')
  .action(async (options, idOrUrlAlias: string) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();
    const pageResolver = await PageResolver.create();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);

      // ページIDの解決
      const pageId = await pageResolver.resolvePageId(idOrUrlAlias);
      outputHandler.debug('Resolved Page ID', pageId);

      // URLの取得
      const url = await getNotionUrl(client, pageId);
      outputHandler.debug('Notion URL', url);

      // ブラウザで開く
      await openBrowser(url);
      outputHandler.success(`ブラウザで ${url} を開きました`);
    }, 'ページを開くことができませんでした');
  });
