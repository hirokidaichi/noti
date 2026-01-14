# noti クイックリファレンス

## 設定
```bash
noti configure                    # APIトークン設定
```

## ページ操作
```bash
noti page get <id>                # 取得（Markdown）
noti page get <id> -f json        # 取得（JSON）
noti page create <parent> file.md # 作成
noti page update <id> file.md     # 更新
noti page append <id> file.md     # 追記
noti page remove <id>             # 削除
```

## データベース操作
```bash
noti database list                # 一覧
noti database query <id>          # クエリ
noti database query <id> -f "Status=Done"           # フィルタ
noti database query <id> -s "Name:asc"              # ソート
noti database export <id> -f csv -o data.csv        # エクスポート
noti database import -f data.csv -d <id>            # インポート
noti database create              # 作成（インタラクティブ）
```

## データベースページ
```bash
noti database page add <db_id>              # 追加
noti database page add <db_id> -j data.json # JSONから追加
noti database page get <page_id>            # 取得
noti database page remove <page_id>         # 削除
```

## コメント
```bash
noti page comment get <id>                          # 取得
noti page comment add <id> "コメント"               # 追加
noti page comment reply <id> <thread> "返信"        # 返信
```

## 検索
```bash
noti search "キーワード"          # 検索
noti search "キーワード" --json   # JSON出力
```

## ブロック
```bash
noti block get <id>               # 取得
noti block list <parent_id>       # 一覧
noti block delete <id>            # 削除
```

## エイリアス
```bash
noti alias add <name> <id>        # 追加
noti alias list                   # 一覧
noti alias remove <name>          # 削除
noti open <alias>                 # ブラウザで開く
```

## ユーザー
```bash
noti user me                      # 自分
noti user list                    # 一覧
noti user get <id>                # 取得
```

## 共通オプション
```
-d, --debug     デバッグモード
-f, --force     確認スキップ
--json          JSON出力
-o, --output    ファイル出力
```

## フィルタ演算子
```
=, !=           等価
>, <, >=, <=    比較
contains        含む
!contains       含まない
```
