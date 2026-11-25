# ADD:ON 配信カードの職業情報 — 既存Worker統合方式

## データフロー

1. `ADDON-Portal-Bot` リポジトリのDiscord Botが30分ごとに、対象サーバーの選択ロールをGoogle Sheetsの `streamers!E:E` (`roles`) に更新する
2. 配信監視の既存Cloudflare Worker `adygta-streams` が、従来と同じ `GOOGLE_SHEET_CSV_URL` で `streamers` 一覧を取得する。CSV列は `enabled,name,platform,id,roles`
3. Workerが `platform + channel ID` によりロールを配信データへ統合し、既存 `STREAMS_KV` の `streams` に保存する
4. 公式サイトの `js/portal-streams.js` は `https://api.adygta2.jp/streams` に含まれる `streams[].roles` を直接表示する

`roles` は例として `["警察", "救急隊"]`。空のときは `[]`。

## 既存Workerのデプロイは別途必要

**2026年11月25日現在、サイト側は上記APIの `roles` を表示するように変更済みだが、Cloudflareの現行Workerにはこちらからアクセス・デプロイできていない。** Workerが `roles` を返すまで職業タグは表示されない。

Worker側では以下の2箇所だけ変更する。

- `loadConfigFromSheets` のCSVマッピングに `roles` を追加
- `updateStreams` の出力で、配信データと元CSVのロール情報を `platform + ID` で結び付ける

現行Workerを丸ごと過去のソースに戻さないこと。YouTube Shard / RSS改修・KV構成・Cron・認証を維持しながら差分適用する。

## 配信者の行ずれについて

Workerでの配信者とロールの統合はCSVの同じ行から取得した `platform + id` を利用し、Worker内の並べ替えではずれない。一方、**Botが `streamers!E` に書き込む瞬間に別の処理がA:Dを並べ替えたり再作成したりすると、Bot側の更新が行ずれする可能性は残る**。配信者インポート処理ではE列を消さず、並べ替えや更新をBotと同時に行わないこと。

## 旧方式について

`data/streamer-roles.json` と `scripts/publish-streamer-roles.mjs` を使用した別GitHub Actionsでの公開方法は使わない。新しいWorker・追加GitHub Secretsも不要。**配信監視Workerの `GOOGLE_SHEET_CSV_URL` が現在の「ADD:ON サイト用情報」スプレッドシートの `streamers` タブを指していること**を確認する。
