# Cloudflare Pages 公開手順 — ADD:ON

1. GitHubの正しいアカウント (`CAKEsuzuharu`) で新規リポジトリ `ADDON-Portal` を作成（公開/非公開は任意）。このパッケージの**中身**をリポジトリ直下にコミットする。
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git から新しいリポジトリを選ぶ。
3. Framework preset: `None`、Build command: （空欄）、Build output directory: `.`、Production branch: `main` に設定。
4. 発行された `*.pages.dev` でトップ、企画、配信、応募案内と各リンクを検証する。
5. Workers & Pages の該当Pages → Custom domains → `add-on.site` を設定。対象ドメインのDNSが別管理なら案内に従ってCloudflare DNSへ切り替える（既存の他サービスのDNSレコードを消さない）。
6. `https://add-on.site` で配信一覧を確認する。APIがCORSエラーになる場合は**既存の** `api.adygta2.jp/streams` 側で `Access-Control-Allow-Origin: https://add-on.site` などを設定（必要なら旧ドメインも許可）。
7. ADYGTA2公開サイトを停止するのは上記確認の後。旧Pagesと配信API/Workerの紐付け、DNS、cron、KVを確認してから旧サイト側のカスタムドメインを解除するなどの方法を選ぶ。WorkerとAPIルートは削除しない。

## 既存配信システムについて

- 旧GitHubリポジトリから確認できるのは `scripts/update-streams.mjs` / `scripts/sync-streamers-from-sheet.mjs` と公開サイトの `api.adygta2.jp/streams` 参照です。
- Cloudflare Worker・KV・Cronの本番構成はGitHubリポジトリには含まれていません。本番の実在/設定はCloudflare管理画面で要確認です。
- 旧ZIPに含まれていた `data/streams.json` は過去のサンプルデータなので、新公開サイトから除外しています。既存モニターの `updatedAt` は必ず新しい日時を返してください。
- 既存APIのドメインは変更していません。将来的に `api.add-on.site` にしたい場合は、まずWorker側のドメインを整えてから `js/portal-streams.js` の `API` 定数を変更してください。
