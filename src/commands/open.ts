import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { NotionClient } from '../lib/notion/client.js';
import { Config } from '../lib/config/config.js';
import { APIErrorCode, APIResponseError } from '@notionhq/client';
import { OutputHandler } from '../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../lib/command-utils/error-handler.js';
import { PageResolver } from '../lib/command-utils/page-resolver.js';

async function openBrowser(url: string): Promise<void> {
  let command: string;
  let args: string[];

  switch (process.platform) {
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', url];
      break;
    case 'linux':
      command = 'xdg-open';
      args = [url];
      break;
    case 'darwin':
      command = 'open';
      args = [url];
      break;
    default:
      throw new Error(`未対応のOS: ${process.platform}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ブラウザでの開封に失敗しました: ${url}`));
      }
    });
    child.unref();
  });
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
      !(
        error instanceof APIResponseError &&
        error.code === APIErrorCode.ObjectNotFound
      )
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
        `指定されたID ${id} はページまたはデータベースとして見つかりませんでした`
      );
    }
    throw error;
  }

  throw new Error('URLが取得できませんでした');
}

export const openCommand = new Command('open')
  .description('Notionのページまたはデータベースをブラウザで開きます')
  .argument('<id_or_url_alias>', 'ページID、URL、またはエイリアス')
  .option('-d, --debug', 'デバッグモード')
  .action(async (idOrUrlAlias: string, options: { debug?: boolean }) => {
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
