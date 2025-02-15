import { TTYController } from "./tty-controller.ts";

export interface SearchItem {
  id: string;
  title: string;
  type: string;
  url?: string;
}

// 検索ロジックを独立したクラスとして分離
export class FuzzySearchEngine {
  constructor(private items: SearchItem[]) {}
  
  search(query: string): SearchItem[] {
    if (!query) return this.items;
    const lowerQuery = query.toLowerCase();
    return this.items.filter(item => 
      item.title.toLowerCase().includes(lowerQuery)
    );
  }
}

// 検索の状態管理を独立したクラスとして分離
export class SearchState {
  constructor(
    public searchText: string = "",
    public selectedIndex: number = 0,
    public currentResults: SearchItem[] = [],
    private items: SearchItem[] = []
  ) {}

  updateSearch(searchEngine: FuzzySearchEngine, newSearchText: string): void {
    this.searchText = newSearchText;
    this.currentResults = searchEngine.search(newSearchText);
    this.selectedIndex = 0;
  }

  moveSelection(direction: 'up' | 'down'): void {
    if (this.currentResults.length === 0) return;
    
    if (direction === 'up') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    } else {
      this.selectedIndex = Math.min(this.currentResults.length - 1, this.selectedIndex + 1);
    }
  }

  getSelectedItem(): SearchItem | null {
    return this.selectedIndex >= 0 && this.currentResults.length > 0
      ? this.currentResults[this.selectedIndex]
      : null;
  }
}

export class FuzzyFinder {
  private searchEngine: FuzzySearchEngine;
  private state: SearchState;
  private tty: TTYController;
  private cleanup: (() => void) | null = null;

  constructor(items: SearchItem[], tty: TTYController) {
    this.searchEngine = new FuzzySearchEngine(items);
    this.state = new SearchState("", 0, items, items);
    this.tty = tty;
  }

  // 標準入力から行を読み込む
  private async readStdinLines(): Promise<string[]> {
    // ガード節: 標準入力がターミナルの場合は早期リターン
    if (Deno.stdin.isTerminal()) {
      return [];
    }

    const lines: string[] = [];
    const buffer = new Uint8Array(1024);
    
    while (true) {
      const n = await Deno.stdin.read(buffer);
      if (n === null) break;
      
      const chunk = new TextDecoder().decode(buffer.subarray(0, n));
      const chunkLines = chunk.split("\n");
      
      this.appendChunkLines(lines, chunkLines, chunk.includes("\n"));
    }
    
    return this.filterEmptyLines(lines);
  }

  // チャンク行の追加処理を分離
  private appendChunkLines(lines: string[], chunkLines: string[], hasNewline: boolean): void {
    if (lines.length > 0 && !hasNewline) {
      lines[lines.length - 1] += chunkLines[0];
      return;
    }
    lines.push(...chunkLines);
  }

  // 空行のフィルタリングを分離
  private filterEmptyLines(lines: string[]): string[] {
    return lines.filter(line => line.trim().length > 0);
  }

  // シグナルハンドラの設定
  private setupSignalHandlers(): void {
    const cleanupHandler = () => this.performCleanup();
    this.cleanup = cleanupHandler;
    Deno.addSignalListener("SIGINT", cleanupHandler);
  }

  // シグナルハンドラの解除
  private cleanupSignalHandlers(): void {
    if (this.cleanup !== null) {
      try {
        Deno.removeSignalListener("SIGINT", this.cleanup);
      } catch (_) {
        // エラーは無視
      }
      this.cleanup = null;
    }
  }

  // クリーンアップ処理を分離
  private performCleanup(): void {
    try {
      this.tty.cleanupSync();
    } catch (_) {
      // エラーは無視
    }
    Deno.exit(0);
  }

  // キー入力の処理
  private handleInput(input: string): { needsUpdate: boolean; shouldBreak: boolean } {
    // 特殊キーの処理を分離
    if (this.isSpecialKey(input)) {
      return this.handleSpecialKey(input);
    }

    // 通常の文字入力
    if (!input.startsWith("\x1b")) {
      return this.handleNormalInput(input);
    }

    return { needsUpdate: false, shouldBreak: false };
  }

  // 特殊キーの判定
  private isSpecialKey(input: string): boolean {
    return ["\x03", "\r", "\x7f", "\x1b[A", "\x1b[B"].includes(input);
  }

  // 特殊キーの処理
  private handleSpecialKey(input: string): { needsUpdate: boolean; shouldBreak: boolean } {
    switch (input) {
      case "\x03": { // Ctrl+C
        this.state = new SearchState("", -1, this.state.currentResults);
        this.performCleanup();
        return { needsUpdate: false, shouldBreak: true };
      }

      case "\r": { // Enter
        return { 
          needsUpdate: false, 
          shouldBreak: this.state.currentResults.length > 0 
        };
      }

      case "\x7f": { // Backspace
        if (this.state.searchText.length === 0) {
          return { needsUpdate: false, shouldBreak: false };
        }
        const newSearchText = this.state.searchText.slice(0, -1);
        this.state.updateSearch(this.searchEngine, newSearchText);
        return { needsUpdate: true, shouldBreak: false };
      }

      case "\x1b[A": { // Up arrow
        this.state.moveSelection('up');
        return { needsUpdate: true, shouldBreak: false };
      }

      case "\x1b[B": { // Down arrow
        this.state.moveSelection('down');
        return { needsUpdate: true, shouldBreak: false };
      }
    }

    return { needsUpdate: false, shouldBreak: false };
  }

  // 通常の文字入力の処理
  private handleNormalInput(input: string): { needsUpdate: boolean; shouldBreak: false } {
    const newSearchText = this.state.searchText + input;
    this.state.updateSearch(this.searchEngine, newSearchText);
    return { needsUpdate: true, shouldBreak: false };
  }

  // 検索の実行
  async find(initialQuery: string = ""): Promise<SearchItem | null> {
    try {
      this.setupSignalHandlers();
      // 標準入力から行を読み込む
      const stdinLines = await this.readStdinLines();
      if (stdinLines.length > 0) {
        // 標準入力から読み込んだ行を検索結果として使用
        const items = stdinLines.map(line => ({
          id: line,
          title: line,
          type: "page",
          url: line
        }));
        this.searchEngine = new FuzzySearchEngine(items);
        this.state = new SearchState("", 0, items, items);
      }

      if (initialQuery) {
        this.state.updateSearch(this.searchEngine, initialQuery);
      }

      try {
        // rawモードを設定
        this.tty.enableRawMode();
        
        // 初期表示
        await this.tty.displayResults(
          this.state.currentResults,
          this.state.searchText,
          this.state.selectedIndex,
          !initialQuery
        );
        
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
            await this.tty.displayResults(
              this.state.currentResults,
              this.state.searchText,
              this.state.selectedIndex,
              false
            );
          }
        }
      } finally {
        // TTYのクリーンアップを実行
        this.tty.cleanupSync();
      }

      return this.state.getSelectedItem();
    } finally {
      this.cleanupSignalHandlers();
    }
  }
} 