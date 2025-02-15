import { Command } from '@cliffy/command';
import { AliasManager } from '../lib/config/aliases.ts';
import { getPageUri } from '../lib/notion/page-uri.ts';
import { NotionClient } from '../lib/notion/client.ts';
import { Config } from '../lib/config/config.ts';
import { APIErrorCode, APIResponseError } from '@notionhq/client';

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
  .action(async (_options: unknown, idOrUrlAlias: string) => {
    const config = await Config.load();
    const client = new NotionClient(config);
    const aliasManager = await AliasManager.load();

    const pageIdOrUrl = aliasManager.get(idOrUrlAlias) || idOrUrlAlias;
    const pageUri = getPageUri(pageIdOrUrl);

    try {
      // URLからIDを抽出
      const id = pageUri.split('/').pop() || pageIdOrUrl;
      const url = await getNotionUrl(client, id);

      await openBrowser(url);
      console.log(`ブラウザで ${url} を開きました`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
        Deno.exit(1);
      }
      throw error;
    }
  });
