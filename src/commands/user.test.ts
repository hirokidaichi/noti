import { describe, it, expect } from 'vitest';

// テスト対象の型定義
type NotionUser = {
  id: string;
  name: string;
  type: string;
  email?: string;
  avatar_url?: string | null;
};

// テスト対象の関数
function formatUser(user: NotionUser): string {
  return [
    `- **ID**: \`${user.id}\``,
    `- **名前**: ${user.name}`,
    `- **タイプ**: ${user.type}`,
    'email' in user && user.email ? `- **メール**: ${user.email}` : null,
    user.avatar_url ? `- **アバター**: ${user.avatar_url}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

describe('formatUser', () => {
  it('should format user with all fields', () => {
    const user: NotionUser = {
      id: 'user-123',
      name: 'Test User',
      type: 'person',
      email: 'test@example.com',
      avatar_url: 'https://example.com/avatar.png',
    };

    const result = formatUser(user);

    expect(result).toContain('- **ID**: `user-123`');
    expect(result).toContain('- **名前**: Test User');
    expect(result).toContain('- **タイプ**: person');
    expect(result).toContain('- **メール**: test@example.com');
    expect(result).toContain('- **アバター**: https://example.com/avatar.png');
  });

  it('should format user without email', () => {
    const user: NotionUser = {
      id: 'user-456',
      name: 'Bot User',
      type: 'bot',
    };

    const result = formatUser(user);

    expect(result).toContain('- **ID**: `user-456`');
    expect(result).toContain('- **名前**: Bot User');
    expect(result).toContain('- **タイプ**: bot');
    expect(result).not.toContain('メール');
    expect(result).not.toContain('アバター');
  });

  it('should format user without avatar', () => {
    const user: NotionUser = {
      id: 'user-789',
      name: 'No Avatar User',
      type: 'person',
      email: 'noavatar@example.com',
      avatar_url: null,
    };

    const result = formatUser(user);

    expect(result).toContain('- **メール**: noavatar@example.com');
    expect(result).not.toContain('アバター');
  });

  it('should format user with empty email string', () => {
    const user: NotionUser = {
      id: 'user-empty',
      name: 'Empty Email User',
      type: 'person',
      email: '',
    };

    const result = formatUser(user);

    expect(result).not.toContain('メール');
  });

  it('should return lines in correct order', () => {
    const user: NotionUser = {
      id: 'user-order',
      name: 'Order Test',
      type: 'person',
      email: 'order@example.com',
      avatar_url: 'https://avatar.url',
    };

    const result = formatUser(user);
    const lines = result.split('\n');

    expect(lines[0]).toContain('ID');
    expect(lines[1]).toContain('名前');
    expect(lines[2]).toContain('タイプ');
    expect(lines[3]).toContain('メール');
    expect(lines[4]).toContain('アバター');
  });
});
