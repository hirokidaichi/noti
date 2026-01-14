import { describe, it, expect } from 'vitest';
import {
  extractPropertyValue,
  parseFilter,
  parseSort,
} from './query.js';

describe('extractPropertyValue', () => {
  it('should extract title text', () => {
    const property = {
      type: 'title',
      title: [{ plain_text: 'Hello' }, { plain_text: ' World' }],
    };
    expect(extractPropertyValue(property)).toBe('Hello World');
  });

  it('should extract rich_text', () => {
    const property = {
      type: 'rich_text',
      rich_text: [{ plain_text: 'Some text' }],
    };
    expect(extractPropertyValue(property)).toBe('Some text');
  });

  it('should extract number', () => {
    const property = { type: 'number', number: 42 };
    expect(extractPropertyValue(property)).toBe('42');
  });

  it('should handle null number', () => {
    const property = { type: 'number', number: null };
    expect(extractPropertyValue(property)).toBe('');
  });

  it('should extract select', () => {
    const property = { type: 'select', select: { name: 'Option1' } };
    expect(extractPropertyValue(property)).toBe('Option1');
  });

  it('should handle null select', () => {
    const property = { type: 'select', select: null };
    expect(extractPropertyValue(property)).toBe('');
  });

  it('should extract multi_select', () => {
    const property = {
      type: 'multi_select',
      multi_select: [{ name: 'Tag1' }, { name: 'Tag2' }],
    };
    expect(extractPropertyValue(property)).toBe('Tag1, Tag2');
  });

  it('should extract status', () => {
    const property = { type: 'status', status: { name: 'In Progress' } };
    expect(extractPropertyValue(property)).toBe('In Progress');
  });

  it('should extract date', () => {
    const property = { type: 'date', date: { start: '2024-01-01' } };
    expect(extractPropertyValue(property)).toBe('2024-01-01');
  });

  it('should extract date range', () => {
    const property = {
      type: 'date',
      date: { start: '2024-01-01', end: '2024-01-31' },
    };
    expect(extractPropertyValue(property)).toBe('2024-01-01 → 2024-01-31');
  });

  it('should extract checkbox true', () => {
    const property = { type: 'checkbox', checkbox: true };
    expect(extractPropertyValue(property)).toBe('☑');
  });

  it('should extract checkbox false', () => {
    const property = { type: 'checkbox', checkbox: false };
    expect(extractPropertyValue(property)).toBe('☐');
  });

  it('should extract url', () => {
    const property = { type: 'url', url: 'https://example.com' };
    expect(extractPropertyValue(property)).toBe('https://example.com');
  });

  it('should return empty string for unknown type', () => {
    const property = { type: 'unknown' };
    expect(extractPropertyValue(property)).toBe('');
  });
});

describe('parseFilter', () => {
  const schema = {
    Name: { type: 'title' },
    Description: { type: 'rich_text' },
    Count: { type: 'number' },
    Status: { type: 'status' },
    Priority: { type: 'select' },
    Tags: { type: 'multi_select' },
    Done: { type: 'checkbox' },
    DueDate: { type: 'date' },
  };

  it('should parse title equals filter', () => {
    const result = parseFilter('Name=Test', schema);
    expect(result).toEqual({
      property: 'Name',
      title: { equals: 'Test' },
    });
  });

  it('should parse title not equals filter', () => {
    const result = parseFilter('Name!=Test', schema);
    expect(result).toEqual({
      property: 'Name',
      title: { does_not_equal: 'Test' },
    });
  });

  it('should parse title contains filter', () => {
    const result = parseFilter('Name contains Test', schema);
    expect(result).toEqual({
      property: 'Name',
      title: { contains: 'Test' },
    });
  });

  it('should parse number equals filter', () => {
    const result = parseFilter('Count=10', schema);
    expect(result).toEqual({
      property: 'Count',
      number: { equals: 10 },
    });
  });

  it('should parse number greater than filter', () => {
    const result = parseFilter('Count>5', schema);
    expect(result).toEqual({
      property: 'Count',
      number: { greater_than: 5 },
    });
  });

  it('should parse number less than or equal filter', () => {
    const result = parseFilter('Count<=100', schema);
    expect(result).toEqual({
      property: 'Count',
      number: { less_than_or_equal_to: 100 },
    });
  });

  it('should parse status equals filter', () => {
    const result = parseFilter('Status=Done', schema);
    expect(result).toEqual({
      property: 'Status',
      status: { equals: 'Done' },
    });
  });

  it('should parse select not equals filter', () => {
    const result = parseFilter('Priority!=Low', schema);
    expect(result).toEqual({
      property: 'Priority',
      select: { does_not_equal: 'Low' },
    });
  });

  it('should parse multi_select contains filter', () => {
    const result = parseFilter('Tags contains Important', schema);
    expect(result).toEqual({
      property: 'Tags',
      multi_select: { contains: 'Important' },
    });
  });

  it('should parse checkbox filter', () => {
    const result = parseFilter('Done=true', schema);
    expect(result).toEqual({
      property: 'Done',
      checkbox: { equals: true },
    });
  });

  it('should parse date after filter', () => {
    const result = parseFilter('DueDate>2024-01-01', schema);
    expect(result).toEqual({
      property: 'DueDate',
      date: { after: '2024-01-01' },
    });
  });

  it('should return null for invalid format', () => {
    const result = parseFilter('invalid', schema);
    expect(result).toBeNull();
  });

  it('should return null for unknown property', () => {
    const result = parseFilter('Unknown=value', schema);
    expect(result).toBeNull();
  });
});

describe('parseSort', () => {
  const schema = {
    Name: { type: 'title' },
    Count: { type: 'number' },
    Status: { type: 'status' },
  };

  it('should parse ascending sort', () => {
    const result = parseSort('Name:asc', schema);
    expect(result).toEqual([
      { property: 'Name', direction: 'ascending' },
    ]);
  });

  it('should parse descending sort', () => {
    const result = parseSort('Count:desc', schema);
    expect(result).toEqual([
      { property: 'Count', direction: 'descending' },
    ]);
  });

  it('should default to ascending', () => {
    const result = parseSort('Name', schema);
    expect(result).toEqual([
      { property: 'Name', direction: 'ascending' },
    ]);
  });

  it('should parse timestamp sort', () => {
    const result = parseSort('created_time:desc', schema);
    expect(result).toEqual([
      { timestamp: 'created_time', direction: 'descending' },
    ]);
  });

  it('should parse last_edited_time sort', () => {
    const result = parseSort('last_edited_time:asc', schema);
    expect(result).toEqual([
      { timestamp: 'last_edited_time', direction: 'ascending' },
    ]);
  });

  it('should parse multiple sorts', () => {
    const result = parseSort('Status:asc,Name:desc', schema);
    expect(result).toEqual([
      { property: 'Status', direction: 'ascending' },
      { property: 'Name', direction: 'descending' },
    ]);
  });

  it('should skip unknown property', () => {
    const result = parseSort('Unknown:asc', schema);
    expect(result).toEqual([]);
  });
});
