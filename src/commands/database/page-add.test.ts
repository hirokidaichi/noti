import { describe, it, expect } from 'vitest';
import {
  formatPropertyForUpdate,
  isReadOnlyType,
  validatePropertyValue,
} from './page-add.js';

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

  it('should format status property', () => {
    const result = formatPropertyForUpdate('Done', 'status');
    expect(result).toEqual({ status: { name: 'Done' } });
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

  it('should format date property with object', () => {
    const dateValue = { start: '2026-01-01', end: '2026-01-31' };
    const result = formatPropertyForUpdate(dateValue, 'date');
    expect(result).toEqual({ date: dateValue });
  });

  it('should auto-convert date string to object', () => {
    const result = formatPropertyForUpdate('2026-01-01', 'date');
    expect(result).toEqual({ date: { start: '2026-01-01' } });
  });

  it('should auto-convert ISO datetime string to date object', () => {
    const result = formatPropertyForUpdate('2026-01-01T10:00:00', 'date');
    expect(result).toEqual({ date: { start: '2026-01-01T10:00:00' } });
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

  it('should format relation property', () => {
    const result = formatPropertyForUpdate(['id1', 'id2'], 'relation');
    expect(result).toEqual({
      relation: [{ id: 'id1' }, { id: 'id2' }],
    });
  });

  it('should format people property', () => {
    const result = formatPropertyForUpdate(['user1'], 'people');
    expect(result).toEqual({
      people: [{ object: 'user', id: 'user1' }],
    });
  });

  it('should throw error for unsupported property type', () => {
    expect(() => formatPropertyForUpdate('value', 'unknown_type')).toThrow(
      '未対応のプロパティタイプ: unknown_type'
    );
  });
});

describe('isReadOnlyType', () => {
  it('should return true for read-only types', () => {
    expect(isReadOnlyType('formula')).toBe(true);
    expect(isReadOnlyType('rollup')).toBe(true);
    expect(isReadOnlyType('created_time')).toBe(true);
    expect(isReadOnlyType('created_by')).toBe(true);
    expect(isReadOnlyType('last_edited_time')).toBe(true);
    expect(isReadOnlyType('last_edited_by')).toBe(true);
    expect(isReadOnlyType('unique_id')).toBe(true);
  });

  it('should return false for writable types', () => {
    expect(isReadOnlyType('title')).toBe(false);
    expect(isReadOnlyType('select')).toBe(false);
    expect(isReadOnlyType('status')).toBe(false);
    expect(isReadOnlyType('number')).toBe(false);
    expect(isReadOnlyType('date')).toBe(false);
  });
});

describe('validatePropertyValue', () => {
  it('should pass valid string for title', () => {
    expect(validatePropertyValue('Name', 'hello', 'title')).toBeNull();
  });

  it('should fail non-string for title', () => {
    expect(validatePropertyValue('Name', 42, 'title')).toContain('文字列');
  });

  it('should pass valid number', () => {
    expect(validatePropertyValue('Priority', 5, 'number')).toBeNull();
  });

  it('should fail non-number for number', () => {
    expect(validatePropertyValue('Priority', '5', 'number')).toContain('数値');
  });

  it('should pass valid array for multi_select', () => {
    expect(
      validatePropertyValue('Tags', ['a', 'b'], 'multi_select')
    ).toBeNull();
  });

  it('should fail non-array for multi_select', () => {
    expect(validatePropertyValue('Tags', 'single', 'multi_select')).toContain(
      '配列'
    );
  });

  it('should pass valid boolean for checkbox', () => {
    expect(validatePropertyValue('Done', true, 'checkbox')).toBeNull();
  });

  it('should fail non-boolean for checkbox', () => {
    expect(validatePropertyValue('Done', 'yes', 'checkbox')).toContain(
      'true/false'
    );
  });

  it('should pass date string', () => {
    expect(validatePropertyValue('Due', '2026-01-01', 'date')).toBeNull();
  });

  it('should pass date object', () => {
    expect(
      validatePropertyValue('Due', { start: '2026-01-01' }, 'date')
    ).toBeNull();
  });

  it('should fail invalid date value', () => {
    expect(validatePropertyValue('Due', 42, 'date')).toContain('日付');
  });

  it('should pass valid string for status', () => {
    expect(validatePropertyValue('Status', 'Done', 'status')).toBeNull();
  });

  it('should pass valid array for relation', () => {
    expect(validatePropertyValue('Related', ['id1'], 'relation')).toBeNull();
  });

  it('should fail non-array for relation', () => {
    expect(validatePropertyValue('Related', 'id1', 'relation')).toContain(
      '配列'
    );
  });
});
