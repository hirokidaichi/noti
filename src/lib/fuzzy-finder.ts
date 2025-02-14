import { TTYController } from "./tty-controller.ts";

export interface SearchItem {
  id: string;
  title: string;
  type: string;
  url?: string;
}

export class FuzzyFinder {
  private items: SearchItem[];
  private currentResults: SearchItem[];
  private searchText: string;
  private selectedIndex: number;
  private tty: TTYController;
  private cleanup: (() => void) | null = null;

  constructor(items: SearchItem[], tty: TTYController) {
    this.items = items;
    this.currentResults = items;
    this.searchText = "";
    this.selectedIndex = 0;
    this.tty = tty;
  }

  // 標準入力から行を読み込む
  private async readStdinLines(): Promise<string[]> {
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

  // ファジー検索の実装
  private fuzzySearch(query: string): SearchItem[] {
    if (!query) return this.items;
    
    const lowerQuery = query.toLowerCase();
    return this.items.filter(item => 
      item.title.toLowerCase().includes(lowerQuery)
    );
  }

  // シグナルハンドラの設定
  private setupSignalHandlers(): void {
    this.cleanup = () => {
      try {
        // 同期的にクリーンアップを実行
        this.tty.cleanupSync();
      } catch (_) {
        // エラーは無視
      }
      Deno.exit(0);
    };

    // SIGINTハンドラを設定
    Deno.addSignalListener("SIGINT", this.cleanup);
  }

  // シグナルハンドラの解除
  private cleanupSignalHandlers(): void {
    if (this.cleanup) {
      try {
        Deno.removeSignalListener("SIGINT", this.cleanup);
      } catch (_) {
        // エラーは無視
      }
      this.cleanup = null;
    }
  }

  // キー入力の処理
  private handleInput(input: string): { needsUpdate: boolean; shouldBreak: boolean } {
    let needsUpdate = false;
    let shouldBreak = false;

    if (input === "\x03") { // Ctrl+C
      this.selectedIndex = -1;
      if (this.cleanup) {
        this.cleanup();
      }
      shouldBreak = true;
    } else if (input === "\r") { // Enter
      if (this.currentResults.length > 0) {
        shouldBreak = true;
      }
    } else if (input === "\x7f") { // Backspace
      if (this.searchText.length > 0) {
        this.searchText = this.searchText.slice(0, -1);
        this.currentResults = this.fuzzySearch(this.searchText);
        this.selectedIndex = 0;
        needsUpdate = true;
      }
    } else if (input === "\x1b[A") { // Up arrow
      if (this.currentResults.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        needsUpdate = true;
      }
    } else if (input === "\x1b[B") { // Down arrow
      if (this.currentResults.length > 0) {
        this.selectedIndex = Math.min(this.currentResults.length - 1, this.selectedIndex + 1);
        needsUpdate = true;
      }
    } else if (!input.startsWith("\x1b")) { // 通常の文字入力
      this.searchText += input;
      this.currentResults = this.fuzzySearch(this.searchText);
      this.selectedIndex = 0;
      needsUpdate = true;
    }

    return { needsUpdate, shouldBreak };
  }

  // 検索の実行
  async find(initialQuery: string = ""): Promise<SearchItem | null> {
    try {
      this.setupSignalHandlers();
      // 標準入力から行を読み込む
      const stdinLines = await this.readStdinLines();
      if (stdinLines.length > 0) {
        // 標準入力から読み込んだ行を検索結果として使用
        this.items = stdinLines.map(line => ({
          id: line,
          title: line,
          type: "page",
          url: line
        }));
        this.currentResults = this.items;
      }

      this.searchText = initialQuery;
      if (initialQuery) {
        this.currentResults = this.fuzzySearch(initialQuery);
      }

      try {
        // rawモードを設定
        this.tty.enableRawMode();
        
        // 初期表示
        await this.tty.displayResults(this.currentResults, this.searchText, this.selectedIndex, !initialQuery);
        
        const buf = new Uint8Array(1024);
        while (true) {
          const n = await this.tty.read(buf);
          if (n === null) break;

          const input = new TextDecoder().decode(buf.subarray(0, n));
          const { needsUpdate, shouldBreak } = this.handleInput(input);

          if (shouldBreak) {
            break;
          }

          if (needsUpdate) {
            await this.tty.displayResults(this.currentResults, this.searchText, this.selectedIndex, false);
          }
        }
      } finally {
        // TTYのクリーンアップを実行
        this.tty.cleanupSync();
      }

      return this.selectedIndex >= 0 && this.currentResults.length > 0
        ? this.currentResults[this.selectedIndex]
        : null;
    } finally {
      this.cleanupSignalHandlers();
    }
  }
} 