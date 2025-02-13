import { Client } from "../../deps.ts";
import { Config } from "../config/config.ts";

export class NotionClient {
  private client: Client;

  constructor(config: Config) {
    if (!config.token) {
      throw new Error("Notion APIトークンが設定されていません。`noti configure` を実行してください。");
    }
    this.client = new Client({
      auth: config.token,
    });
  }

  async validateToken() {
    try {
      await this.client.users.me();
      return true;
    } catch (error) {
      throw new Error("APIトークンが無効です。");
    }
  }

  async search(params: {
    query: string;
    page_size?: number;
  }) {
    return await this.client.search({
      query: params.query,
      page_size: params.page_size,
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    });
  }

  async getPage(pageId: string) {
    return await this.client.pages.retrieve({
      page_id: pageId,
    });
  }

  async getBlocks(pageId: string) {
    return await this.client.blocks.children.list({
      block_id: pageId,
      page_size: 100,
    });
  }

  async getDatabase(databaseId: string) {
    return await this.client.databases.retrieve({
      database_id: databaseId,
    });
  }
} 