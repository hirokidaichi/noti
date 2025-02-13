import { Command, Input } from "../deps.ts";
import { NotionClient } from "../lib/notion/client.ts";
import { Config } from "../lib/config/config.ts";
import Fuse from "https://esm.sh/fuse.js@6.6.2";
import { readLines } from "https://deno.land/std@0.155.0/io/mod.ts";

export const searchCommand = new Command()
  .name("search")
  .description("Search pages and databases in Notion")
  .arguments("[query:string]")
  .option("-o, --output <file:string>", "Output file path")
  .option("-d, --debug", "デバッグモード")
  .action(async (options, query = "") => {
    const config = await Config.load();
    const client = new NotionClient(config);
    
    try {
      const results = await client.search({
        query,
        page_size: 100,
      });

      if (results.results.length === 0) {
        console.error("検索結果が見つかりませんでした。");
        return;
      }

      if (options.debug) {
        console.error("=== Debug: First Result ===");
        console.error(JSON.stringify(results.results[0], null, 2));
        console.error("========================");
      }

      // 検索結果をフォーマット
      const items = results.results.map((item: any) => {
        let title = "Untitled";
        
        if (item.object === "page") {
          // ページのタイトルを取得する方法をデバッグ
          if (options.debug) {
            console.error("=== Debug: Page Properties ===");
            console.error(JSON.stringify(item.properties, null, 2));
            console.error("========================");
          }

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

      // インタラクティブモードかファイル出力モードかを判断
      if (options.output) {
        await Deno.writeTextFile(
          options.output,
          JSON.stringify(items, null, 2)
        );
        console.error(`結果を ${options.output} に保存しました。`);
        await say(`結果を ${options.output} に保存しました。`);
      } else {
        // インタラクティブモードの実装
        const selected = await fuzzyFinder(items);
        if (selected) {
          await openInBrowser(selected.url);
          console.error(`${selected.title} を開きました。`);
          await say(`${selected.title} を開きました。`);
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

// Fuzzy Finder の実装
async function fuzzyFinder(items: any[]) {
  const fuse = new Fuse(items, {
    keys: ["title"],
    threshold: 0.3,
  });

  let selectedItem = null;
  let currentResults = [];  // 初期状態では空の配列
  let searchText = "";
  let selectedIndex = 0;

  // 入力モードに入る前に画面をクリア
  process.stdout.write(ANSI.clear);
  
  // 生のモードに切り替え
  const originalRaw = Deno.stdin.isRaw;
  Deno.stdin.setRaw(true);

  try {
    const buf = new Uint8Array(8);
    
    // 初期表示
    displayResults(currentResults, searchText, selectedIndex, true);

    while (true) {
      const n = await Deno.stdin.read(buf);
      if (n === null) break;

      const input = new TextDecoder().decode(buf.subarray(0, n));
      let needsUpdate = false;
      
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
          searchText = searchText.slice(0, -1);
          currentResults = searchText ? 
            fuse.search(searchText).map(r => r.item) : 
            [];  // 検索文字列が空の場合は結果も空に
          selectedIndex = Math.min(selectedIndex, currentResults.length - 1);
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
      else if (input.length === 1 && input.charCodeAt(0) >= 32) {
        searchText += input;
        currentResults = fuse.search(searchText).map(r => r.item);
        selectedIndex = 0;
        needsUpdate = true;
      }

      // 画面を更新
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

  // 検索バーを最上部に表示し、カーソル位置を保存
  process.stdout.write("検索 > " + query);
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
    items.forEach((item, i) => {
      const icon = item.type === "page" ? "📄" : "🗃️";
      const line = ` ${icon} ${item.title}`;
      
      if (i === selectedIndex) {
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

// ブラウザでURLを開く
async function openInBrowser(url: string) {
  const cmd = {
    darwin: ["open"],
    linux: ["xdg-open"],
    windows: ["cmd", "/c", "start"],
  }[Deno.build.os] || ["open"];

  const process = new Deno.Command(cmd[0], {
    args: [...cmd.slice(1), url],
  });
  
  await process.output();
}

// 音声通知
async function say(message: string) {
  const process = new Deno.Command("say", {
    args: [message],
  });
  await process.output();
} 