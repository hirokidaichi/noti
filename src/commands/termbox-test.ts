import { Command } from "../deps.ts";
import TermBox from "jsr:@deno-library/termbox";

async function testTerminalControl(): Promise<void> {
  // TTYデバイスを直接オープン
  const tty = await Deno.open("/dev/tty", { read: true, write: true });
  const termbox = new TermBox();
  let exitMessage = "キャンセルされました";
  
  try {
    // TTYをrawモードに設定
    tty.setRaw(true, { cbreak: true });
    
    try {
      // 画面をクリア
      await termbox.screenClear();
      
      // カーソルを非表示
      await termbox.cursorHide();
      
      // テスト用のテキストを表示
      const text = "Press Enter to continue, Ctrl+C to exit...";
      for (let i = 0; i < text.length; i++) {
        termbox.setCell(i, 0, text[i]);
      }
      
      // 変更を反映
      await termbox.flush();
      
      // キー入力待ち
      const buf = new Uint8Array(1024);
      while (true) {
        const n = await tty.read(buf);
        if (n === null) break;
        
        const input = new TextDecoder().decode(buf.subarray(0, n));
        if (input === "\x03") { // Ctrl+C
          exitMessage = "キャンセルされました";
          break;
        }
        if (input === "\r") { // Enter
          // 新しいメッセージを表示
          await termbox.screenClear();
          const newText = "Thank you! Press any key to exit...";
          for (let i = 0; i < newText.length; i++) {
            termbox.setCell(i, 0, newText[i]);
          }
          await termbox.flush();
          
          // 任意のキー入力を待つ
          await tty.read(buf);
          exitMessage = "正常に終了しました";
          break;
        }
      }
    } finally {
      // TTYのrawモードを解除
      tty.setRaw(false);
    }
    
  } finally {
    // 画面をリセット
    await termbox.screenReset();
    // カーソルを表示
    await termbox.cursorShow();
    // 終了処理
    termbox.end();
    // TTYをクローズ
    tty.close();
  }

  // 標準出力に結果を出力（パイプに渡される）
  console.log(exitMessage);
}

export const termboxTestCommand = new Command()
  .name("termbox-test")
  .description("Test terminal control using termbox")
  .action(async () => {
    try {
      await testTerminalControl();
    } catch (error) {
      console.error("エラーが発生しました:", error);
      Deno.exit(1);
    }
  }); 