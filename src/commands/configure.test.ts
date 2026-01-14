import { describe, it, expect } from 'vitest';

// テスト対象の関数
function maskToken(token: string | undefined): string {
  if (!token) return '';
  return `${token.slice(0, 5)}${'*'.repeat(Math.max(0, token.length - 10))}${token.slice(-5)}`;
}

describe('maskToken', () => {
  it('should mask a standard token', () => {
    const token = 'secret_abcdefghijklmnopqrstuvwxyz';
    const masked = maskToken(token);

    expect(masked.startsWith('secre')).toBe(true);
    expect(masked.endsWith('vwxyz')).toBe(true);
    expect(masked).toContain('*');
    expect(masked.length).toBe(token.length);
  });

  it('should return empty string for undefined', () => {
    expect(maskToken(undefined)).toBe('');
  });

  it('should return empty string for empty token', () => {
    expect(maskToken('')).toBe('');
  });

  it('should handle short token (10 characters)', () => {
    const token = '1234567890';
    const masked = maskToken(token);

    // 10文字の場合: 先頭5文字 + 0個の* + 末尾5文字 = 10文字
    expect(masked).toBe('1234567890');
  });

  it('should handle very short token (5 characters)', () => {
    const token = '12345';
    const masked = maskToken(token);

    // 5文字の場合: 先頭5文字 + 負の数なので0個の* + 末尾5文字 = 重複あり
    expect(masked).toBe('1234512345');
  });

  it('should handle token with exactly 11 characters', () => {
    const token = '12345678901';
    const masked = maskToken(token);

    // 11文字の場合: 先頭5文字 + 1個の* + 末尾5文字 = 11文字
    expect(masked).toBe('12345*78901');
  });

  it('should preserve token length', () => {
    const tokens = ['a'.repeat(15), 'b'.repeat(20), 'c'.repeat(50)];

    for (const token of tokens) {
      const masked = maskToken(token);
      expect(masked.length).toBe(token.length);
    }
  });
});
