import { Command, Input } from "../deps.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";
import Fuse from "https://esm.sh/fuse.js@6.6.2";
import { readLines } from "https://deno.land/std@0.155.0/io/mod.ts";

// デバウンス処理用の関数
async function debounce<T>(
  fn: (...args: any[]) => Promise<T>,
  delay: number
): Promise<(...args: any[]) => Promise<T>> {
  let timeoutId: number | undefined;
  let lastPromise: Promise<T> | undefined;

  return async (...args: any[]): Promise<T> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        lastPromise = fn(...args);
        resolve(await lastPromise);
      }, delay);
    });
  };
}

// 検索結果の整形用ヘルパー関数
function formatNotionResults(results: any[]) {
  return results.map((item: any) => {
    let title = "Untitled";
    
    if (item.object === "page") {
      // データベース内のページの場合
      if (item.parent.type === "database_id") {
        // プロパティを探索してタイトルを見つける
        for (const [key, value] of Object.entries(item.properties)) {
          if (value.type === "title") {
            title = value.title[0]?.plain_text || "Untitled";
            break;
          }
        }
      } else {
        // 通常のページの場合
        title = item.properties?.title?.title?.[0]?.plain_text || "Untitled";
      }
    } else if (item.object === "database") {
      title = item.title[0]?.plain_text || "Untitled Database";
    }

    // 改行を\nにエスケープ
    title = title.replace(/\r?\n/g, "\\n");

    // タイトルを50文字で切り詰める
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

export const searchCommand = new Command()
  .name("search")
  .description("Search pages and databases in Notion")
  .arguments("[query:string]")
  .option("-o, --output <file:string>", "Output file path")
  .option("-d, --debug", "デバッグモード")
  .option("-p, --parent <id:string>", "親ページまたはデータベースのID")
  .action(async ({ output, debug, parent }, query) => {
    const config = await Config.load();
    const client = new NotionClient(config);
    
    try {
      const searchParams: any = {
        query: query || "",
        page_size: 100,
      };

      // 親ページが指定されている場合は検索条件に追加
      if (parent) {
        searchParams.filter = {
          property: "parent",
          value: parent,
        };
      }

      const results = await client.search(searchParams);

      if (results.results.length === 0) {
        console.error("検索結果が見つかりませんでした。");
        return;
      }

      if (debug) {
        console.error("=== Debug: First Result ===");
        console.error(JSON.stringify(results.results[0], null, 2));
        console.error("========================");
      }

      // 検索結果をフォーマット
      const items = formatNotionResults(results.results);

      // インタラクティブモードかファイル出力モードかを判断
      if (output) {
        await Deno.writeTextFile(
          output,
          JSON.stringify(items, null, 2)
        );
        console.error(`結果を ${output} に保存しました。`);
      } else {
        // インタラクティブモードの実装
        const selected = await fuzzyFinder(items, query || "", client, parent);
        if (selected) {
          console.log(selected.id);
        }
      }
    } catch (error) {
      console.error("検索中にエラーが発生しました:", error.message);
      Deno.exit(1);
    }
  });

// ANSIエスケープシーケンス
const ANSI = {
  reset: "\x1b[0m",
  reverse: "\x1b[7m",
  clear: "\x1b[2J\x1b[H",
  clearLine: "\x1b[2K",
  moveCursor: (y: number) => `\x1b[${y}H`,
  saveCursor: "\x1b[s",
  restoreCursor: "\x1b[u",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
};

// ターミナルのサイズを取得する関数
function getTerminalSize() {
  // デフォルト値
  const defaultSize = { columns: 80, rows: 24 };
  
  try {
    const { columns, rows } = Deno.consoleSize();
    return { columns, rows };
  } catch {
    return defaultSize;
  }
}

// Fuzzy Finder の実装
async function fuzzyFinder(items: any[], initialQuery: string = "", client: NotionClient, parentId?: string) {
  let selectedItem = null;
  let currentResults = initialQuery ? items : [];  // 初期結果を表示
  let searchText = initialQuery;
  let selectedIndex = 0;

  // デバウンスされた検索関数を作成
  const debouncedSearch = await debounce(async (query: string) => {
    const searchParams: any = {
      query,
      page_size: 50,
    };

    // 親ページが指定されている場合は検索条件に追加
    if (parentId) {
      searchParams.filter = {
        property: "parent",
        value: parentId,
      };
    }

    const results = await client.search(searchParams);
    return formatNotionResults(results.results);
  }, 500);

  // 入力モードに入る前に画面をクリア
  process.stdout.write(ANSI.clear);
  
  // 生のモードに切り替え
  const originalRaw = Deno.stdin.isRaw;
  Deno.stdin.setRaw(true);

  try {
    // バッファサイズを増やす（日本語入力に対応）
    const buf = new Uint8Array(1024);
    
    // 初期表示（検索キーワードが指定されている場合は結果を表示）
    displayResults(currentResults, searchText, selectedIndex, !initialQuery);

    while (true) {
      const n = await Deno.stdin.read(buf);
      if (n === null) break;

      const input = new TextDecoder().decode(buf.subarray(0, n));
      let needsUpdate = false;
      let needsSearch = false;
      
      // Ctrl+C で終了
      if (input === "\x03") {
        process.stdout.write(ANSI.clear);
        process.stdout.write(ANSI.showCursor);  // カーソルを表示して終了
        return null;
      }

      // Enter で選択
      if (input === "\r") {
        if (currentResults.length > 0) {
          selectedItem = currentResults[selectedIndex];
          break;
        }
        continue;
      }

      // Backspace
      if (input === "\x7f") {
        if (searchText.length > 0) {
          // 最後の文字を削除（サロゲートペアを考慮）
          const lastChar = searchText.slice(-1);
          const charLength = lastChar.length;
          searchText = searchText.slice(0, -charLength);
          needsSearch = true;
          needsUpdate = true;
        }
      }
      // 上矢印
      else if (input === "\x1b[A") {
        if (currentResults.length > 0) {
          selectedIndex = Math.max(0, selectedIndex - 1);
          needsUpdate = true;
        }
      }
      // 下矢印
      else if (input === "\x1b[B") {
        if (currentResults.length > 0) {
          selectedIndex = Math.min(currentResults.length - 1, selectedIndex + 1);
          needsUpdate = true;
        }
      }
      // 通常の文字入力
      else if (input.length >= 1) {
        // エスケープシーケンスでない場合のみ処理
        if (!input.startsWith("\x1b")) {
          searchText += input;
          needsSearch = true;
          needsUpdate = true;
        }
      }

      // 検索の実行（デバウンスされた関数を使用）
      if (needsSearch) {
        debouncedSearch(searchText).then((results) => {
          currentResults = results;
          selectedIndex = 0;
          displayResults(currentResults, searchText, selectedIndex, false);
        });
      }

      // 画面を更新（検索結果の更新とは独立して実行）
      if (needsUpdate) {
        displayResults(currentResults, searchText, selectedIndex, false);
      }
    }
  } finally {
    // 元のモードに戻す
    Deno.stdin.setRaw(originalRaw);
    process.stdout.write(ANSI.clear);
    process.stdout.write(ANSI.showCursor);  // カーソルを必ず表示して終了
  }

  return selectedItem;
}

// 結果表示用のヘルパー関数
function displayResults(items: any[], query: string, selectedIndex: number, isInitial: boolean) {
  // カーソルを非表示
  process.stdout.write(ANSI.hideCursor);

  // 画面をクリア
  process.stdout.write(ANSI.clear);

  // ターミナルのサイズを取得
  const { rows } = getTerminalSize();
  
  // ヘッダーとフッターで使用する行数
  const headerLines = 5; // Query, 区切り線2つ, ヘルプ行
  const footerLines = 2; // 区切り線1つ, 予備1行
  
  // 結果表示に使える最大行数
  const maxResultLines = rows - headerLines - footerLines;

  // 検索バーを最上部に表示し、カーソル位置を保存
  process.stdout.write("Query > " + query);
  process.stdout.write(ANSI.saveCursor);
  process.stdout.write("\n------------------------\n");

  // ヘルプを表示
  process.stdout.write("↑/↓: 移動, Enter: 選択, Ctrl+C: 終了\n");
  process.stdout.write("------------------------\n");
  
  if (isInitial) {
    process.stdout.write("検索文字列を入力してください\n");
  } else if (items.length === 0) {
    process.stdout.write("該当する結果がありません\n");
  } else {
    // 表示開始位置を計算（選択項目が必ず表示されるようにする）
    let startIndex = Math.max(0, Math.min(
      selectedIndex - Math.floor(maxResultLines / 2),
      items.length - maxResultLines
    ));
    startIndex = Math.max(0, startIndex);

    // 表示件数を制限
    const displayItems = items.slice(startIndex, startIndex + maxResultLines);
    
    // 全体の件数と現在の表示範囲を表示
    if (items.length > maxResultLines) {
      process.stdout.write(`表示: ${startIndex + 1}-${Math.min(startIndex + maxResultLines, items.length)} / 全${items.length}件\n`);
    }

    displayItems.forEach((item, i) => {
      const actualIndex = startIndex + i;
      const icon = item.type === "page" ? "📄" : "🗃️";
      const line = ` ${icon} ${item.title}`;
      
      if (actualIndex === selectedIndex) {
        // 選択中の項目は反転表示
        process.stdout.write(ANSI.reverse + line + ANSI.reset + "\n");
      } else {
        process.stdout.write(line + "\n");
      }
    });
  }
  
  process.stdout.write("------------------------\n");

  // カーソル位置を復元し、カーソルを表示
  process.stdout.write(ANSI.restoreCursor);
  process.stdout.write(ANSI.showCursor);
} 