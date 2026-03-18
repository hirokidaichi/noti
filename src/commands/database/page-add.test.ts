import { describe, it, expect } from 'vitest';
import { formatPropertyForUpdate } from './page-add.js';

describe('formatPropertyForUpdate', () => {
  it('should format title property', () => {
    const result = formatPropertyForUpdate('Test Title', 'title');
    expect(result).toEqual({
      title: [{ text: { content: 'Test Title' } }],
    });
  });

  it('should format rich_text property', () => {
    const result = formatPropertyForUpdate('Some text', 'rich_text');
    expect(result).toEqual({
      rich_text: [{ text: { content: 'Some text' } }],
    });
  });

  it('should format number property', () => {
    const result = formatPropertyForUpdate(42, 'number');
    expect(result).toEqual({ number: 42 });
  });

  it('should format select property', () => {
    const result = formatPropertyForUpdate('Option1', 'select');
    expect(result).toEqual({ select: { name: 'Option1' } });
  });

  it('should format multi_select property', () => {
    const result = formatPropertyForUpdate(['Tag1', 'Tag2'], 'multi_select');
    expect(result).toEqual({
      multi_select: [{ name: 'Tag1' }, { name: 'Tag2' }],
    });
  });

  it('should format checkbox property', () => {
    expect(formatPropertyForUpdate(true, 'checkbox')).toEqual({
      checkbox: true,
    });
    expect(formatPropertyForUpdate(false, 'checkbox')).toEqual({
      checkbox: false,
    });
  });

  it('should format date property', () => {
    const dateValue = { start: '2026-01-01', end: '2026-01-31' };
    const result = formatPropertyForUpdate(dateValue, 'date');
    expect(result).toEqual({ date: dateValue });
  });

  it('should format url property', () => {
    const result = formatPropertyForUpdate('https://example.com', 'url');
    expect(result).toEqual({ url: 'https://example.com' });
  });

  it('should format email property', () => {
    const result = formatPropertyForUpdate('test@example.com', 'email');
    expect(result).toEqual({ email: 'test@example.com' });
  });

  it('should format phone_number property', () => {
    const result = formatPropertyForUpdate('+81-90-1234-5678', 'phone_number');
    expect(result).toEqual({ phone_number: '+81-90-1234-5678' });
  });

  it('should throw error for unsupported property type', () => {
    expect(() => formatPropertyForUpdate('value', 'unknown_type')).toThrow(
      '未対応のプロパティタイプ: unknown_type'
    );
  });
});
