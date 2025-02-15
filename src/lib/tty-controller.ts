// ANSIエスケープシーケンス
const ANSI = {
  reset: '\x1b[0m',
  reverse: '\x1b[7m',
  clear: '\x1b[2J\x1b[H', // 画面クリアとカーソルをホームポジションへ
  clearToEnd: '\x1b[J', // カーソル位置から画面末尾までクリア
  clearLine: '\x1b[2K\r', // 現在行をクリアして行頭へ
  moveCursor: (y: number) => `\x1b[${y}H`,
  moveToHome: '\x1b[H', // カーソルをホームポジションへ
  saveCursor: '\x1b[s',
  restoreCursor: '\x1b[u',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
};

export class TTYController {
  private tty: Deno.FsFile;
  private encoder = new TextEncoder();
  private isRawMode = false;

  constructor() {
    this.tty = Deno.openSync('/dev/tty', { read: true, write: true });
  }

  // TTYをrawモードに設定
  enableRawMode(): void {
    if (!this.isRawMode) {
      this.tty.setRaw(true, { cbreak: true });
      this.isRawMode = true;
    }
  }

  // TTYのrawモードを解除
  disableRawMode(): void {
    if (this.isRawMode) {
      this.tty.setRaw(false);
      this.isRawMode = false;
    }
  }

  // 画面をクリア
  async clear(): Promise<void> {
    await this.write(ANSI.clear + ANSI.moveToHome);
  }

  // カーソルを非表示
  async hideCursor(): Promise<void> {
    await this.write(ANSI.hideCursor);
  }

  // カーソルを表示
  async showCursor(): Promise<void> {
    await this.write(ANSI.showCursor);
  }

  // TTYに書き込み
  async write(text: string): Promise<void> {
    await this.tty.write(this.encoder.encode(text));
  }

  // TTYから読み込み
  async read(buffer: Uint8Array): Promise<number | null> {
    return await this.tty.read(buffer);
  }

  // エラーメッセージを表示
  async showError(message: string): Promise<void> {
    await this.clear();
    await this.write('エラー: ' + message + '\n');
    await this.write('------------------------\n');
    await this.write('Press any key to exit...\n');

    const buf = new Uint8Array(1024);
    await this.read(buf);
  }

  // デバッグ情報を表示
  async showDebug(data: unknown): Promise<void> {
    await this.clear();
    await this.write('=== Debug Information ===\n');
    await this.write(JSON.stringify(data, null, 2) + '\n');
    await this.write('========================\n');
    await this.write('Press any key to continue...\n');

    const buf = new Uint8Array(1024);
    await this.read(buf);
  }

  // 検索結果を表示
  async displayResults(
    items: Array<{ title: string; type: string }>,
    query: string,
    selectedIndex: number,
  ): Promise<void> {
    await this.hideCursor();
    await this.clear();

    const { rows } = Deno.consoleSize();
    const headerLines = 4;
    const footerLines = 2;
    const maxResultLines = Math.min(
      Math.floor(rows * 0.6),
      rows - headerLines - footerLines,
    );

    // ヘッダー部分
    await this.write('------------------------\n');
    await this.write('↑/↓: 移動, Enter: 選択, Ctrl+C: 終了\n');
    await this.write('------------------------\n');

    // 検索クエリと件数表示
    await this.write('Query > ' + query);
    await this.write(ANSI.saveCursor);
    await this.write('\n');

    if (items.length === 0) {
      await this.write('\n該当する結果がありません\n');
    } else {
      let startIndex = Math.max(
        0,
        Math.min(
          selectedIndex - Math.floor(maxResultLines / 2),
          items.length - maxResultLines,
        ),
      );
      startIndex = Math.max(0, startIndex);

      const displayItems = items.slice(startIndex, startIndex + maxResultLines);

      await this.write(
        `表示: ${startIndex + 1}-${
          Math.min(startIndex + maxResultLines, items.length)
        } / 全${items.length}件\n\n`,
      );

      for (let i = 0; i < displayItems.length; i++) {
        const item = displayItems[i];
        const actualIndex = startIndex + i;
        const icon = item.type === 'page' ? '📄' : '🗃️';
        const line = ` ${icon} ${item.title}`;

        if (actualIndex === selectedIndex) {
          await this.write(ANSI.reverse + line + ANSI.reset + '\n');
        } else {
          await this.write(line + '\n');
        }
      }
    }

    await this.write('\n------------------------\n');
    await this.write(ANSI.restoreCursor);
    await this.showCursor();
  }

  // 同期的なクリーンアップ
  cleanupSync(): void {
    try {
      this.disableRawMode();
      // 画面をクリアしてカーソルをホームポジションに移動
      this.tty.writeSync(this.encoder.encode(ANSI.clear));
      this.tty.writeSync(this.encoder.encode(ANSI.moveToHome));
      this.tty.writeSync(this.encoder.encode(ANSI.showCursor));
      this.tty.close();
    } catch (_) {
      // エラーは無視
    }
  }
}

// ANSIエスケープシーケンスをエクスポート
export { ANSI };
