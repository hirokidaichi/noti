/**
 * 通知メッセージの型定義
 */
export interface NotificationMessage {
  title: string;
  body?: string;
}

/**
 * 通知を送信する関数
 */
export function sendNotification(message: NotificationMessage): boolean {
  try {
    // 今はシンプルにコンソールに出力するだけ
    console.log(`[${message.title}] ${message.body || ''}`);
    return true;
  } catch (error) {
    console.error('Notification failed:', error);
    return false;
  }
} 