<p align="center">
  <h1 align="center">noti</h1>
  <p align="center">
    <strong>AIエージェントと人間のためのNotion CLI</strong>
  </p>
  <p align="center">
    NotionをAIワークフローにシームレスに統合
  </p>
</p>

<p align="center">
  <a href="#クイックスタート">クイックスタート</a> •
  <a href="#agent-skills">Agent Skills</a> •
  <a href="#cliの使い方">CLIの使い方</a> •
  <a href="./README.md">English</a>
</p>

---

## notiとは？

**noti**はNotionとClaude CodeなどのAIエージェントをつなぐツールです。手動でコピー＆ペーストする代わりに、AIアシスタントがNotionワークスペースを直接読み取り、作成、管理できます。

- **AI ネイティブ設計** — Claude Code Agent Skillとしてシームレスに統合
- **Notion API完全対応** — ページ、データベース、ブロック、コメント、検索
- **非対話型** — すべてのコマンドがプロンプトなしで動作、自動化に最適
- **Markdownファースト** — 使い慣れたMarkdown形式で読み書き

## クイックスタート

### 1. インストール

```bash
npm install -g @hirokidaichi/noti
```

またはソースからビルド：

```bash
git clone https://github.com/hirokidaichi/noti.git
cd noti
npm install && npm run build && npm link
```

### 2. 設定

[Notion Integrations](https://www.notion.so/my-integrations)からIntegration Tokenを取得し、設定します：

```bash
noti configure --token <your_token>
```

### 3. Agent Skillsのインストール（Claude Code用）

```bash
# ホームディレクトリにインストール（グローバルに利用可能）
noti setup-skills --user

# または現在のプロジェクトのみにインストール
noti setup-skills --project
```

これでClaude Codeがnotiの全コマンドを使えるようになります。

## Agent Skills

notiは**Claude Code Agent Skill**として設計されています。インストール後、Claudeは以下のことができます：

### Notionの読み取りと理解

```
「先週の議事録を読んで」
「プロジェクトデータベースで優先度が高いタスクは？」
「日記の最新エントリを見せて」
```

### コンテンツの作成と更新

```
「今日の議論をまとめたページを作成して」
「プロジェクトデータベースに優先度高でタスクを追加して」
「今日のメモをデイリーログに追記して」
```

### 検索とクエリ

```
「四半期レビューに言及しているページをすべて検索して」
「期限順に未完了タスクを一覧表示して」
「顧客データベースをCSVでエクスポートして」
```

### ワークスペースの管理

```
「タスクデータベースに'tasks'というエイリアスを設定して」
「先月の完了アイテムをアーカイブして」
「このCSVデータを連絡先データベースにインポートして」
```

## CLIの使い方

すべてのコマンドはターミナルでも使えます：

### ページ操作

```bash
noti page get <id>                    # Markdownとして取得
noti page create <parent> file.md     # Markdownから作成
noti page update <id> file.md -f      # 内容を更新
noti page append <id> file.md         # 内容を追記
noti page remove <id> -f              # ページを削除
```

### データベース操作

```bash
noti database list                    # データベース一覧
noti database query <id>              # クエリ実行
noti database query <id> -f "Status=Done" -s "Name:asc"
noti database export <id> -f csv -o data.csv
noti database import -f data.csv -d <id>
```

### 検索

```bash
noti search "キーワード"               # ワークスペースを検索
noti search "キーワード" --json        # JSON出力
```

### エイリアス

```bash
noti alias add tasks <database_id>    # ショートカットを作成
noti open tasks                       # ブラウザで開く
```

## コマンドリファレンス

| コマンド | 説明 |
|---------|------|
| `configure` | Notion APIトークンの設定 |
| `page` | ページ操作（get/create/update/append/remove） |
| `database` | データベース操作（list/query/export/import/create） |
| `search` | ページとデータベースの検索 |
| `block` | ブロック操作（get/list/delete） |
| `alias` | ページ/データベースへのショートカット管理 |
| `user` | ユーザー情報 |
| `open` | ブラウザでページを開く |
| `setup-skills` | Claude Code用Agent Skillsをインストール |

## 使用例

### デイリースタンドアップの自動化

```bash
# Claudeがスタンドアップノートを作成
「昨日、今日、ブロッカーのセクションを含む今日のスタンドアップノートを作成して」
```

### データベースのバックアップ

```bash
# 重要なデータをエクスポート
noti database export <id> -f csv -o backup_$(date +%Y%m%d).csv
```

### 一括インポート

```bash
# バリデーション付きでデータをインポート
noti database import -f contacts.csv -d <id> --dry-run  # まず検証
noti database import -f contacts.csv -d <id>            # 実行
```

### 議事録ワークフロー

```bash
# Claudeが議事録を管理
「プロダクトミーティングの議事録を見つけてアクションアイテムをまとめて」
「議論した決定事項のフォローアップページを作成して」
```

## 設定

設定ファイルは `~/.config/noti/` に保存されます：

- `config.json` — APIトークンと設定
- `aliases.json` — ページ/データベースのエイリアス

## 要件

- Node.js 18+
- Notion Integration Token
- Claude Code（Agent Skills用）

## ライセンス

MIT

## コントリビューション

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

---

<p align="center">
  <sub>AIワークフロー時代のために構築</sub>
</p>
