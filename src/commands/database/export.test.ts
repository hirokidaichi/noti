import { describe, it, expect } from 'vitest';

// Notionプロパティの型定義
interface TitleProperty {
  type: 'title';
  title: { plain_text: string }[];
}

interface RichTextProperty {
  type: 'rich_text';
  rich_text: { plain_text: string }[];
}

interface SelectProperty {
  type: 'select';
  select: { name: string } | null;
}

interface MultiSelectProperty {
  type: 'multi_select';
  multi_select: { name: string }[];
}

interface DateProperty {
  type: 'date';
  date: { start: string; end?: string } | null;
}

interface NumberProperty {
  type: 'number';
  number: number | null;
}

interface CheckboxProperty {
  type: 'checkbox';
  checkbox: boolean;
}

interface UrlProperty {
  type: 'url';
  url: string | null;
}

interface EmailProperty {
  type: 'email';
  email: string | null;
}

interface PhoneProperty {
  type: 'phone_number';
  phone_number: string | null;
}

interface UnknownProperty {
  type: string;
}

type NotionProperty =
  | TitleProperty
  | RichTextProperty
  | SelectProperty
  | MultiSelectProperty
  | DateProperty
  | NumberProperty
  | CheckboxProperty
  | UrlProperty
  | EmailProperty
  | PhoneProperty
  | UnknownProperty;

// テスト対象の関数
function formatPropertyValue(property: NotionProperty | null): string {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return (property as TitleProperty).title?.[0]?.plain_text || '';
    case 'rich_text':
      return (property as RichTextProperty).rich_text?.[0]?.plain_text || '';
    case 'select':
      return (property as SelectProperty).select?.name || '';
    case 'multi_select':
      return (
        (property as MultiSelectProperty).multi_select
          ?.map((item) => item.name)
          .join(';') || ''
      );
    case 'date':
      return (property as DateProperty).date?.start || '';
    case 'number': {
      const num = (property as NumberProperty).number;
      return num !== null ? num.toString() : '';
    }
    case 'checkbox':
      return (property as CheckboxProperty).checkbox ? 'true' : 'false';
    case 'url':
      return (property as UrlProperty).url || '';
    case 'email':
      return (property as EmailProperty).email || '';
    case 'phone_number':
      return (property as PhoneProperty).phone_number || '';
    default:
      return '';
  }
}

describe('formatPropertyValue', () => {
  describe('title property', () => {
    it('should format title', () => {
      const property: TitleProperty = {
        type: 'title',
        title: [{ plain_text: 'My Title' }],
      };
      expect(formatPropertyValue(property)).toBe('My Title');
    });

    it('should return empty string for empty title', () => {
      const property: TitleProperty = {
        type: 'title',
        title: [],
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });

  describe('rich_text property', () => {
    it('should format rich_text', () => {
      const property: RichTextProperty = {
        type: 'rich_text',
        rich_text: [{ plain_text: 'Description text' }],
      };
      expect(formatPropertyValue(property)).toBe('Description text');
    });
  });

  describe('select property', () => {
    it('should format select', () => {
      const property: SelectProperty = {
        type: 'select',
        select: { name: 'Option A' },
      };
      expect(formatPropertyValue(property)).toBe('Option A');
    });

    it('should return empty string for null select', () => {
      const property: SelectProperty = {
        type: 'select',
        select: null,
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });

  describe('multi_select property', () => {
    it('should format multi_select with semicolon separator', () => {
      const property: MultiSelectProperty = {
        type: 'multi_select',
        multi_select: [{ name: 'Tag1' }, { name: 'Tag2' }, { name: 'Tag3' }],
      };
      expect(formatPropertyValue(property)).toBe('Tag1;Tag2;Tag3');
    });

    it('should return empty string for empty multi_select', () => {
      const property: MultiSelectProperty = {
        type: 'multi_select',
        multi_select: [],
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });

  describe('date property', () => {
    it('should format date start', () => {
      const property: DateProperty = {
        type: 'date',
        date: { start: '2024-01-15' },
      };
      expect(formatPropertyValue(property)).toBe('2024-01-15');
    });

    it('should return empty string for null date', () => {
      const property: DateProperty = {
        type: 'date',
        date: null,
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });

  describe('number property', () => {
    it('should format positive number', () => {
      const property: NumberProperty = {
        type: 'number',
        number: 42,
      };
      expect(formatPropertyValue(property)).toBe('42');
    });

    it('should format zero', () => {
      const property: NumberProperty = {
        type: 'number',
        number: 0,
      };
      expect(formatPropertyValue(property)).toBe('0');
    });

    it('should format negative number', () => {
      const property: NumberProperty = {
        type: 'number',
        number: -10,
      };
      expect(formatPropertyValue(property)).toBe('-10');
    });

    it('should format decimal number', () => {
      const property: NumberProperty = {
        type: 'number',
        number: 3.14159,
      };
      expect(formatPropertyValue(property)).toBe('3.14159');
    });

    it('should return empty string for null number', () => {
      const property: NumberProperty = {
        type: 'number',
        number: null,
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });

  describe('checkbox property', () => {
    it('should format true checkbox', () => {
      const property: CheckboxProperty = {
        type: 'checkbox',
        checkbox: true,
      };
      expect(formatPropertyValue(property)).toBe('true');
    });

    it('should format false checkbox', () => {
      const property: CheckboxProperty = {
        type: 'checkbox',
        checkbox: false,
      };
      expect(formatPropertyValue(property)).toBe('false');
    });
  });

  describe('url property', () => {
    it('should format url', () => {
      const property: UrlProperty = {
        type: 'url',
        url: 'https://example.com',
      };
      expect(formatPropertyValue(property)).toBe('https://example.com');
    });

    it('should return empty string for null url', () => {
      const property: UrlProperty = {
        type: 'url',
        url: null,
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });

  describe('email property', () => {
    it('should format email', () => {
      const property: EmailProperty = {
        type: 'email',
        email: 'test@example.com',
      };
      expect(formatPropertyValue(property)).toBe('test@example.com');
    });
  });

  describe('phone_number property', () => {
    it('should format phone number', () => {
      const property: PhoneProperty = {
        type: 'phone_number',
        phone_number: '+81-90-1234-5678',
      };
      expect(formatPropertyValue(property)).toBe('+81-90-1234-5678');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for null property', () => {
      expect(formatPropertyValue(null)).toBe('');
    });

    it('should return empty string for unknown property type', () => {
      const property: UnknownProperty = {
        type: 'unknown_type',
      };
      expect(formatPropertyValue(property)).toBe('');
    });
  });
});
