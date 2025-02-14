import { Command } from "../deps.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";
import { TTYController } from "../lib/tty-controller.ts";
import { FuzzyFinder, SearchItem } from "../lib/fuzzy-finder.ts";

// ANSIエスケープシーケンス
const ANSI = {
  reset: "\x1b[0m",
  reverse: "\x1b[7m",
  clear: "\x1b[2J\x1b[H",  // 画面クリアとカーソルをホームポジションへ
  clearToEnd: "\x1b[J",    // カーソル位置から画面末尾までクリア
  clearLine: "\x1b[2K\r",  // 現在行をクリアして行頭へ
  moveCursor: (y: number) => `\x1b[${y}H`,
  moveToHome: "\x1b[H",    // カーソルをホームポジションへ
  saveCursor: "\x1b[s",
  restoreCursor: "\x1b[u",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
};

// デバウンス処理用の関数
function debounce<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  delay: number
): (...args: Args) => Promise<T> {
  let timeoutId: number | undefined;

  return (...args: Args): Promise<T> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        const result = await fn(...args);
        resolve(result);
      }, delay);
    });
  };
}

// Notionのプロパティの型定義
interface NotionProperty {
  type: string;
  title?: {
    plain_text: string;
  }[];
}

interface NotionItem {
  id: string;
  object: string;
  url?: string;
  parent?: {
    type: string;
  };
  properties?: Record<string, NotionProperty>;
  title?: { plain_text: string }[];
}

// コマンドのオプション型定義
interface SearchOptions {
  debug: boolean;
  parent?: string;
}

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: NotionItem[]): SearchItem[] {
  return results.map((item) => {
    let title = "Untitled";
    
    if (item.object === "page") {
      if (item.parent?.type === "database_id") {
        for (const [_key, value] of Object.entries(item.properties ?? {})) {
          const typedValue = value as NotionProperty;
          if (typedValue.type === "title") {
            title = typedValue.title?.[0]?.plain_text || "Untitled";
            break;
          }
        }
      } else {
        title = item.properties?.title?.title?.[0]?.plain_text || "Untitled";
      }
    } else if (item.object === "database") {
      title = item.title?.[0]?.plain_text || "Untitled Database";
    }

    title = title.replace(/\r?\n/g, "\\n");

    if (title.length > 50) {
      title = title.slice(0, 50) + "...";
    }
    
    return {
      id: item.id,
      title,
      type: item.object,
      url: item.url,
    };
  });
}

// ターミナルのサイズを取得する関数
function getTerminalSize() {
  const defaultSize = { columns: 80, rows: 24 };
  
  try {
    const { columns, rows } = Deno.consoleSize();
    return { columns, rows };
  } catch {
    return defaultSize;
  }
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  url?: string;
}

// 標準入力から行を読み込む関数
async function readStdinLines(): Promise<string[]> {
  const lines: string[] = [];
  const buffer = new Uint8Array(1024);
  
  // 標準入力がパイプされているかチェック
  if (!Deno.stdin.isTerminal) {
    while (true) {
      const n = await Deno.stdin.read(buffer);
      if (n === null) break;
      
      const chunk = new TextDecoder().decode(buffer.subarray(0, n));
      const chunkLines = chunk.split("\n");
      
      // 最後の行が不完全な場合に備えて処理
      if (lines.length > 0 && !chunk.includes("\n")) {
        lines[lines.length - 1] += chunkLines[0];
      } else {
        lines.push(...chunkLines);
      }
    }
  }
  
  // 空行を除去して返す
  return lines.filter(line => line.trim().length > 0);
}

// Fuzzy Finder の実装
async function fuzzyFinder(
  items: SearchResult[],
  initialQuery: string = "",
  client: NotionClient,
  parentId?: string
): Promise<SearchResult | null> {
  // 標準入力から行を読み込む
  const stdinLines = await readStdinLines();
  if (stdinLines.length > 0) {
    // 標準入力から読み込んだ行を検索結果として使用
    items = stdinLines.map(line => ({
      id: line,
      title: line,
      type: "page",
      url: line
    }));
  }

  let selectedItem: SearchResult | null = null;
  let currentResults = items;
  let searchText = initialQuery;
  let selectedIndex = 0;

  // TTYコントローラーを初期化
  const tty = new TTYController();
  
  try {
    // rawモードを設定
    tty.enableRawMode();
    
    // 初期表示
    await tty.displayResults(currentResults, searchText, selectedIndex, !initialQuery);
    
    const buf = new Uint8Array(1024);
    while (true) {
      const n = await tty.read(buf);
      if (n === null) break;

      const input = new TextDecoder().decode(buf.subarray(0, n));
      let needsUpdate = false;
      
      if (input === "\x03") { // Ctrl+C
        selectedItem = null;
        break;
      }

      if (input === "\r") { // Enter
        if (currentResults.length > 0) {
          selectedItem = currentResults[selectedIndex];
          break;
        }
        continue;
      }

      if (input === "\x7f") { // Backspace
        if (searchText.length > 0) {
          searchText = searchText.slice(0, -1);
          currentResults = fuzzySearch(items, searchText);
          selectedIndex = 0;
          needsUpdate = true;
        }
      }
      else if (input === "\x1b[A") { // Up arrow
        if (currentResults.length > 0) {
          selectedIndex = Math.max(0, selectedIndex - 1);
          needsUpdate = true;
        }
      }
      else if (input === "\x1b[B") { // Down arrow
        if (currentResults.length > 0) {
          selectedIndex = Math.min(currentResults.length - 1, selectedIndex + 1);
          needsUpdate = true;
        }
      }
      else if (!input.startsWith("\x1b")) { // 通常の文字入力
        searchText += input;
        currentResults = fuzzySearch(items, searchText);
        selectedIndex = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await tty.displayResults(currentResults, searchText, selectedIndex, false);
      }
    }
  } finally {
    // TTYのクリーンアップ
    tty.cleanupSync();
  }

  // 最終的な選択結果を標準出力に出力
  if (selectedItem) {
    // 標準出力がパイプまたはリダイレクトされている場合
    if (!Deno.stdout.isTerminal) {
      // IDのみを出力
      Deno.stdout.writeSync(new TextEncoder().encode(selectedItem.id + "\n"));
    } else {
      // ターミナルの場合は選択結果の詳細を表示
      const output = [
        "\n選択されたアイテム:",
        `ID: ${selectedItem.id}`,
        `タイトル: ${selectedItem.title}`,
        `タイプ: ${selectedItem.type}`,
        selectedItem.url ? `URL: ${selectedItem.url}` : "",
      ].filter(Boolean).join("\n") + "\n";
      
      Deno.stdout.writeSync(new TextEncoder().encode(output));
    }
  }

  return selectedItem;
}

// 簡易的なファジー検索の実装
function fuzzySearch(items: SearchResult[], query: string): SearchResult[] {
  if (!query) return items;
  
  const lowerQuery = query.toLowerCase();
  return items.filter(item => 
    item.title.toLowerCase().includes(lowerQuery)
  );
}

export const searchFuzzyCommand = new Command()
  .name("search-fuzzy")
  .description("Search pages and databases in Notion with fuzzy finder")
  .arguments("[query:string]")
  .option("-d, --debug", "デバッグモード")
  .option("-p, --parent <id:string>", "親ページまたはデータベースのID")
  .action(async (options: { debug?: boolean; parent?: string }, query: string = "") => {
    const config = await Config.load();
    const client = new NotionClient(config);
    const tty = new TTYController();
    
    try {
      const searchParams = {
        query: query || "",
        page_size: 100,
        ...(options.parent ? {
          filter: {
            property: "object" as const,
            value: "page" as const,
          },
        } : {}),
      };

      const results = await client.search(searchParams);

      if (results.results.length === 0) {
        await tty.showError("検索結果が見つかりませんでした。");
        return;
      }

      if (options.debug) {
        await tty.showDebug(results.results[0]);
      }

      const items = formatNotionResults(results.results as NotionItem[]);
      const finder = new FuzzyFinder(items, tty);
      await finder.find(query || "");
    } catch (error) {
      console.error(`エラーが発生しました: ${error}`);
      Deno.exit(1);
    } finally {
      tty.cleanupSync();
    }
  }); 