import * as dotenv from 'dotenv';

export interface TestConfig {
  NOTION_TOKEN: string;
  NOTION_ROOT_ID: string;
}

export async function loadTestConfig(): Promise<TestConfig> {
  dotenv.config();

  const NOTION_TOKEN = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY;
  const NOTION_ROOT_ID = process.env.NOTION_ROOT_ID;

  if (!NOTION_TOKEN) {
    throw new Error('NOTION_TOKEN or NOTION_API_KEY is required in .env file');
  }
  if (!NOTION_ROOT_ID) {
    throw new Error('NOTION_ROOT_ID is required in .env file');
  }

  return {
    NOTION_TOKEN,
    NOTION_ROOT_ID,
  };
}
