# ADD:ON Official Portal

ADD:ON公式サイト。v10 UIをベースに、ADYGTA2公開リポジトリの配信表示仕様を引き継いだ静的サイトです。

## ページ

- `index.html` — トップ、現在の配信、ZERO紹介、応募案内
- `projects.html` — 企画一覧
- `project-zero.html` — ZERO概要・コンテンツタブ
- `project-adygta.html` — 過去企画ADYGTAの紹介・職業フィルター
- `streams.html` — YouTube/Twitch LIVE一覧・プラットフォーム別絞り込み・手動更新
- `adiyon.html` — 運営母体紹介
- `apply.html` — 応募案内（現在準備中）

## 配信表示の仕組み（ADYGTA2との共通仕様）

旧リポジトリ `CAKEsuzuharu/ADYGTA2-Portal-Public` と同じ
`https://api.adygta2.jp/streams` をブラウザから取得します。独立した監視バックエンドを**新規作成しません**。
既存の監視・認証・Cronスケジュールは変更せずに利用してください。

- `status: "LIVE"` のYouTube/Twitchのみ表示し、総視聴者数と配信件数を集計
- 表示は視聴者数の多い順、トップには最大3件を掲載
- 一覧はYouTube/Twitchフィルター、更新ボタン対応
- APIの `updatedAt` を最終更新時刻として表示
- `updatedAt` が30分以上前なら、誤ったLIVE表示を避けて更新停止と表示
- タブ表示中は90秒ごとに情報を再取得（バックエンドの5分更新とは別）
- 取得不能時はエラー表示。旧サイトのデモ配信カードや古い静的JSONは表示しません

**注意:** このリポジトリに配信監視のAPIキーやcronを複製しません。API側の監視対象が旧ADYGTA2のままだと、その配信が表示されます。ADD:ON参加者への監視対象変更は既存バックエンド側で行う必要があります。`api.adygta2.jp` のCORS設定が `adygta2.jp` のみ許可する場合、新しい `https://add-on.site` も許可してください。現在のWorkerやCronの稼働状態はこのリポジトリだけでは検証できません。

## Cloudflare Pages への接続

詳しくは `CLOUDFLARE_SETUP.md` を参照してください。**旧ADYGTA2のPagesプロジェクトを先に削除しないこと**。既存の配信APIとルーティングが旧サイトに依存している可能性があります。

GitHubへ登録する際、ZIPの中身をリポジトリのルートに配置してください。Cloudflare Pagesのビルドコマンドは空欄、ビルド出力ディレクトリは `.` です。
