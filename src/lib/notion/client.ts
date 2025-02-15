import { Client } from "npm:@notionhq/client@2.2.14";
import { Config } from "../config/config.ts";

// Notionのブロック型定義
interface BlockObject {
  object: "block";
  type: string;
  [key: string]: unknown;
}

// Notionのプロパティ型定義
interface PageProperties {
  [key: string]: {
    type: string;
    [key: string]: unknown;
  };
}

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
      await this.client.users.me({});
      return true;
    } catch (_error) {
      throw new Error("APIトークンが無効です。");
    }
  }

  async search(params: {
    query: string;
    page_size?: number;
    filter?: {
      property: "object";
      value: "page" | "database";
    };
  }) {
    return await this.client.search({
      query: params.query,
      page_size: params.page_size,
      filter: params.filter,
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

  async appendBlocks(pageId: string, blocks: unknown[]) {
    return await this.client.blocks.children.append({
      block_id: pageId,
      children: blocks as Parameters<typeof this.client.blocks.children.append>[0]["children"],
    });
  }

  async getDatabase(databaseId: string) {
    return await this.client.databases.retrieve({
      database_id: databaseId,
    });
  }

  async createPage(params: {
    parentId: string;
    title?: string;
    blocks?: unknown[];
  }) {
    const parentType = params.parentId.includes("-") ? "database_id" : "page_id";
    const properties = {
      ...(parentType === "database_id" ? {
        Name: {
          type: "title",
          title: params.title ? [{ text: { content: params.title } }] : [],
        },
      } : {
        title: {
          type: "title",
          title: params.title ? [{ text: { content: params.title } }] : [],
        },
      }),
    } as Parameters<typeof this.client.pages.create>[0]["properties"];

    const parent = parentType === "database_id"
      ? { database_id: params.parentId }
      : { page_id: params.parentId };

    return await this.client.pages.create({
      parent,
      properties,
      children: params.blocks as Parameters<typeof this.client.pages.create>[0]["children"],
    });
  }

  async removePage(pageId: string) {
    return await this.client.pages.update({
      page_id: pageId,
      archived: true, // Notionではアーカイブが削除に相当
    });
  }

  async deleteBlock(blockId: string) {
    return await this.client.blocks.delete({
      block_id: blockId,
    });
  }

  async updatePage(pageId: string, properties: {
    title: Array<{
      text: {
        content: string;
      };
    }>;
  }) {
    return await this.client.pages.update({
      page_id: pageId,
      properties: {
        title: {
          type: "title",
          title: properties.title,
        },
      },
    });
  }
} 