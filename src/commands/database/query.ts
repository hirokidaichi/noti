import { Command } from 'commander';
import { NotionClient } from '../../lib/notion/client.js';
import { Config } from '../../lib/config/config.js';
import { OutputHandler } from '../../lib/command-utils/output-handler.js';
import { ErrorHandler } from '../../lib/command-utils/error-handler.js';
import { PageResolver } from '../../lib/command-utils/page-resolver.js';

interface CommandOptions {
  debug?: boolean;
  json?: boolean;
  filter?: string[];
  sort?: string[];
  limit?: string;
}

interface PageResult {
  id: string;
  properties: Record<string, unknown>;
}

// Notionフィルタの型定義
interface TextFilter {
  equals?: string;
  does_not_equal?: string;
  contains?: string;
  does_not_contain?: string;
}

interface NumberFilter {
  equals?: number;
  does_not_equal?: number;
  greater_than?: number;
  less_than?: number;
  greater_than_or_equal_to?: number;
  less_than_or_equal_to?: number;
}

interface SelectFilter {
  equals?: string;
  does_not_equal?: string;
}

interface MultiSelectFilter {
  contains?: string;
  does_not_contain?: string;
}

interface CheckboxFilter {
  equals?: boolean;
}

interface DateFilter {
  equals?: string;
  before?: string;
  after?: string;
  on_or_before?: string;
  on_or_after?: string;
}

interface PropertyFilter {
  property: string;
  title?: TextFilter;
  rich_text?: TextFilter;
  number?: NumberFilter;
  select?: SelectFilter;
  status?: SelectFilter;
  multi_select?: MultiSelectFilter;
  checkbox?: CheckboxFilter;
  date?: DateFilter;
}

interface CompoundFilter {
  and?: PropertyFilter[];
  or?: PropertyFilter[];
}

type NotionFilter = PropertyFilter | CompoundFilter;

// Notionソートの型定義
interface PropertySort {
  property: string;
  direction: 'ascending' | 'descending';
}

interface TimestampSort {
  timestamp: 'created_time' | 'last_edited_time';
  direction: 'ascending' | 'descending';
}

type NotionSort = PropertySort | TimestampSort;

// プロパティ値からテキストを抽出
export function extractPropertyValue(
  property: Record<string, unknown>
): string {
  const type = property.type as string;

  switch (type) {
    case 'title':
    case 'rich_text': {
      const textArray = property[type] as Array<{ plain_text: string }>;
      return textArray?.map((t) => t.plain_text).join('') || '';
    }
    case 'number':
      return String(property.number ?? '');
    case 'select': {
      const select = property.select as { name: string } | null;
      return select?.name || '';
    }
    case 'multi_select': {
      const multiSelect = property.multi_select as Array<{ name: string }>;
      return multiSelect?.map((s) => s.name).join(', ') || '';
    }
    case 'status': {
      const status = property.status as { name: string } | null;
      return status?.name || '';
    }
    case 'date': {
      const date = property.date as { start: string; end?: string } | null;
      if (!date) return '';
      return date.end ? `${date.start} → ${date.end}` : date.start;
    }
    case 'checkbox':
      return property.checkbox ? '☑' : '☐';
    case 'url':
      return (property.url as string) || '';
    case 'email':
      return (property.email as string) || '';
    case 'phone_number':
      return (property.phone_number as string) || '';
    case 'created_time':
      return (property.created_time as string) || '';
    case 'last_edited_time':
      return (property.last_edited_time as string) || '';
    case 'formula': {
      const formula = property.formula as Record<string, unknown>;
      return String(formula?.string || formula?.number || '');
    }
    case 'relation': {
      const relation = property.relation as Array<{ id: string }>;
      return relation?.map((r) => r.id).join(', ') || '';
    }
    default:
      return '';
  }
}

// フィルタ文字列をパース
export function parseFilter(
  filterStr: string,
  schema: Record<string, { type: string }>
): PropertyFilter | null {
  // サポートする演算子: =, !=, >, <, >=, <=, contains, !contains
  const match = filterStr.match(
    /^(.+?)\s*(!=|>=|<=|=|>|<|contains|!contains)\s*(.+)$/
  );
  if (!match) {
    console.error(`無効なフィルタ形式: ${filterStr}`);
    return null;
  }

  const [, propertyName, operator, value] = match;
  const propertySchema = schema[propertyName];

  if (!propertySchema) {
    console.error(`プロパティが見つかりません: ${propertyName}`);
    return null;
  }

  const type = propertySchema.type;

  // プロパティタイプに応じたフィルタを構築
  switch (type) {
    case 'title':
    case 'rich_text':
      if (operator === '=') {
        return { property: propertyName, [type]: { equals: value } };
      } else if (operator === '!=') {
        return { property: propertyName, [type]: { does_not_equal: value } };
      } else if (operator === 'contains') {
        return { property: propertyName, [type]: { contains: value } };
      } else if (operator === '!contains') {
        return {
          property: propertyName,
          [type]: { does_not_contain: value },
        };
      }
      break;

    case 'number':
      if (operator === '=') {
        return { property: propertyName, number: { equals: Number(value) } };
      } else if (operator === '!=') {
        return {
          property: propertyName,
          number: { does_not_equal: Number(value) },
        };
      } else if (operator === '>') {
        return {
          property: propertyName,
          number: { greater_than: Number(value) },
        };
      } else if (operator === '<') {
        return { property: propertyName, number: { less_than: Number(value) } };
      } else if (operator === '>=') {
        return {
          property: propertyName,
          number: { greater_than_or_equal_to: Number(value) },
        };
      } else if (operator === '<=') {
        return {
          property: propertyName,
          number: { less_than_or_equal_to: Number(value) },
        };
      }
      break;

    case 'select':
    case 'status':
      if (operator === '=') {
        return { property: propertyName, [type]: { equals: value } };
      } else if (operator === '!=') {
        return { property: propertyName, [type]: { does_not_equal: value } };
      }
      break;

    case 'multi_select':
      if (operator === 'contains') {
        return { property: propertyName, multi_select: { contains: value } };
      } else if (operator === '!contains') {
        return {
          property: propertyName,
          multi_select: { does_not_contain: value },
        };
      }
      break;

    case 'checkbox':
      return {
        property: propertyName,
        checkbox: { equals: value.toLowerCase() === 'true' },
      };

    case 'date':
      if (operator === '=') {
        return { property: propertyName, date: { equals: value } };
      } else if (operator === '>') {
        return { property: propertyName, date: { after: value } };
      } else if (operator === '<') {
        return { property: propertyName, date: { before: value } };
      } else if (operator === '>=') {
        return { property: propertyName, date: { on_or_after: value } };
      } else if (operator === '<=') {
        return { property: propertyName, date: { on_or_before: value } };
      }
      break;
  }

  console.error(
    `サポートされていない演算子: ${operator} (プロパティタイプ: ${type})`
  );
  return null;
}

// ソート文字列をパース
export function parseSort(
  sortStr: string,
  schema: Record<string, { type: string }>
): NotionSort[] {
  const sorts: NotionSort[] = [];

  const parts = sortStr.split(',');
  for (const part of parts) {
    const [propertyName, direction = 'asc'] = part.trim().split(':');

    // タイムスタンプの特別処理
    if (
      propertyName === 'created_time' ||
      propertyName === 'last_edited_time'
    ) {
      sorts.push({
        timestamp: propertyName,
        direction: direction === 'desc' ? 'descending' : 'ascending',
      });
      continue;
    }

    if (!schema[propertyName]) {
      console.error(`プロパティが見つかりません: ${propertyName}`);
      continue;
    }

    sorts.push({
      property: propertyName,
      direction: direction === 'desc' ? 'descending' : 'ascending',
    });
  }

  return sorts;
}

export const queryCommand = new Command('query')
  .description('データベースをクエリ（フィルタ/ソート対応）')
  .argument('<database_id_or_url>', 'データベースIDまたはURL')
  .option('-d, --debug', 'デバッグモード')
  .option('--json', 'JSON形式で出力')
  .option(
    '-f, --filter <condition>',
    'フィルタ条件（例: "Status=Done", "Priority!=Low"）',
    (val, prev: string[]) => [...(prev || []), val],
    []
  )
  .option(
    '-s, --sort <property:direction>',
    'ソート条件（例: "Name:asc", "Created:desc"）',
    (val, prev: string[]) => [...(prev || []), val],
    []
  )
  .option('--limit <number>', '取得件数', '50')
  .action(async (databaseIdOrUrl: string, options: CommandOptions) => {
    const outputHandler = new OutputHandler({ debug: options.debug });
    const errorHandler = new ErrorHandler();

    await errorHandler.withErrorHandling(async () => {
      const config = await Config.load();
      const client = new NotionClient(config);
      const resolver = await PageResolver.create();

      const databaseId = await resolver.resolveDatabaseId(databaseIdOrUrl);
      outputHandler.debug('Database ID:', databaseId);

      // データソースからスキーマを取得
      const dataSource = await client.getDataSourceWithProperties(databaseId);
      const schema: Record<string, { type: string }> = {};
      for (const [name, prop] of Object.entries(dataSource.properties)) {
        schema[name] = { type: prop.type };
      }
      outputHandler.debug('Schema:', schema);

      // フィルタを構築
      let filter: NotionFilter | undefined;
      if (options.filter && options.filter.length > 0) {
        const filters = options.filter
          .map((f) => parseFilter(f, schema))
          .filter((f): f is PropertyFilter => f !== null);

        if (filters.length === 1) {
          filter = filters[0];
        } else if (filters.length > 1) {
          filter = { and: filters };
        }
      }
      outputHandler.debug('Filter:', filter);

      // ソートを構築
      let sorts: NotionSort[] | undefined;
      if (options.sort && options.sort.length > 0) {
        sorts = options.sort.flatMap((s) => parseSort(s, schema));
      }
      outputHandler.debug('Sorts:', sorts);

      // クエリ実行
      // Notion SDK の型定義は非常に複雑なため、ここではキャストを使用
      const response = await client.queryDatabase({
        database_id: databaseId,
        filter: filter as Parameters<typeof client.queryDatabase>[0]['filter'],
        sorts: sorts as Parameters<typeof client.queryDatabase>[0]['sorts'],
        page_size: parseInt(options.limit || '50', 10),
      });

      const pages = response.results as PageResult[];
      outputHandler.debug('Results count:', pages.length);

      if (options.json) {
        await outputHandler.handleOutput(pages, { json: true });
        return;
      }

      if (pages.length === 0) {
        console.log('結果がありません');
        return;
      }

      // プロパティ名を取得（タイトルを先頭に）
      const propNames = Object.keys(schema);
      const titleProp = propNames.find((p) => schema[p].type === 'title');
      const displayProps = titleProp
        ? [titleProp, ...propNames.filter((p) => p !== titleProp).slice(0, 4)]
        : propNames.slice(0, 5);

      // ヘッダー出力
      console.log(['ID', ...displayProps].join('\t'));

      // データ出力
      for (const page of pages) {
        const values = displayProps.map((prop) => {
          const propValue = page.properties[prop] as Record<string, unknown>;
          if (!propValue) return '';
          const text = extractPropertyValue(propValue);
          return text.slice(0, 30);
        });
        console.log([page.id, ...values].join('\t'));
      }
    }, 'データベースのクエリに失敗しました');
  });
