# ページ操作ワークフロー例

## Markdownファイルの準備

notiはMarkdown形式のファイルをNotionページに変換します。

### 対応するMarkdown要素

```markdown
# 見出し1（ページタイトルとして使用可能）
## 見出し2
### 見出し3

通常の段落テキスト

- 箇条書きリスト
- アイテム2
  - ネストしたアイテム

1. 番号付きリスト
2. アイテム2

> 引用ブロック

`インラインコード`

​```python
# コードブロック
def hello():
    print("Hello, World!")
​```

- [ ] チェックボックス（未完了）
- [x] チェックボックス（完了）
```

## ドキュメント作成フロー

```bash
# 1. ローカルでMarkdownを作成
cat > document.md << 'EOF'
# プロジェクト計画書

## 概要
このドキュメントはプロジェクトの計画を記載しています。

## スケジュール
- Phase 1: 要件定義（1週間）
- Phase 2: 設計（2週間）
- Phase 3: 実装（4週間）

## タスク
- [ ] 要件ヒアリング
- [ ] 設計レビュー
- [ ] 実装完了
EOF

# 2. Notionにページを作成
noti page create <parent_page_id> document.md

# 3. 作成されたURLが表示される
```

## ページ更新フロー

```bash
# 1. 現在の内容を取得
noti page get <page_id> -o current.md

# 2. ファイルを編集
# （エディタで編集）

# 3. 更新を反映
noti page update <page_id> current.md
```

## 複数ページの一括操作

```bash
# 検索してページIDを取得
noti search "議事録" --json | jq -r '.[] | select(.object=="page") | .id'

# 特定のページを取得してバックアップ
for id in $(noti search "議事録" --json | jq -r '.[] | select(.object=="page") | .id'); do
  noti page get "$id" -o "backup_${id}.md"
done
```
