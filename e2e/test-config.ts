import { load } from '@std/dotenv';
import { assert } from '@std/assert';

export interface TestConfig {
  NOTION_TOKEN: string;
  NOTION_ROOT_ID: string;
}

export async function loadTestConfig(): Promise<TestConfig> {
  const env = await load({ export: true });

  assert(env.NOTION_TOKEN, 'NOTION_TOKEN is required in .env file');
  assert(env.NOTION_ROOT_ID, 'NOTION_ROOT_ID is required in .env file');

  return {
    NOTION_TOKEN: env.NOTION_TOKEN,
    NOTION_ROOT_ID: env.NOTION_ROOT_ID,
  };
}
