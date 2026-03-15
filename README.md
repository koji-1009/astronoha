# astronoha

言葉で探す、150年の議会。

国立国会図書館が提供する複数のAPIを横断し、明治から令和までの国会・帝国議会の発言をキーワードで検索するWebアプリケーション。Chrome built-in AI（Prompt API）によるブラウザ内LLM要約を備え、サーバーコストゼロで運用できる。

## 機能

* **横断検索** — 国会会議録API（1947〜）と帝国議会会議録API（1890〜1947）を単一のキーワードで同時検索
* **年代ヒートマップ** — D1に永続化した年別発言件数をヒートマップで可視化
* **発言者プロファイル** — 議員の頻出キーワードと関連書籍を一覧
* **タイムライン** — 議事録とNDLサーチの出版物を日付軸で重ね合わせ表示
* **ブラウザAI要約** — Chrome built-in AI（Prompt API）で発言の現代語要約、関連キーワード提案、時代背景解説
* **関連書籍** — NDLサーチAPIから検索キーワードに関連する書籍を表示（書影付き）

## 技術スタック

| カテゴリ          | 技術                           |
| ------------- | ---------------------------- |
| フレームワーク       | Astro 6 (SSR)                |
| UI            | React 19 (Islands)           |
| ランタイム         | Cloudflare Workers (workerd) |
| DB            | Cloudflare D1 (ヒートマップ)       |
| バリデーション       | Zod 4                        |
| XMLパーサー       | fast-xml-parser              |
| lint / format | Biome 2                      |
| テスト           | Vitest, Playwright           |
| 言語            | TypeScript (strictest)       |

## アーキテクチャ

[CRZ（Crumple Zone Architecture）](https://zenn.dev/and_and/articles/crz-architecture)に基づくMPA-first設計。

* **Layer 1-2（HTML/CSS）** — 検索フォーム、発言一覧、ヒートマップ、ページネーション。JSなしで100%動作
* **Layer 3-4（React Islands）** — 設定プレビュー、Chrome AI要約パネル。壊れてもコア機能に影響しない
* **Server Islands** — 「両方」モードで国会・帝国議会を独立したServer Islandとして並行描画。関連書籍もServer Islandで遅延取得

### キャッシュ戦略

```
CDNページキャッシュ（1時間）
  └─ 同一URLのリクエストはCloudflareエッジから即座に返却
APIレスポンスキャッシュ（12時間, Cloudflare Cache API）
  └─ 同一キーワードのNDL API呼び出しをper-PoPでキャッシュ
レートリミット（1秒/ホスト, per-isolate）
  └─ キャッシュミス時のみ適用。異なるAPIホストは独立
```

## セットアップ

```bash
npm install
npm run dev
```

### D1（ヒートマップ用）

```bash
npx wrangler d1 create astronoha-heatmap
npx wrangler d1 migrations apply astronoha-heatmap --local
```

## コマンド

```bash
npm run dev        # 開発サーバー（workerd）
npm run build      # プロダクションビルド
npm run preview    # ビルド結果プレビュー
npm run check      # Biome lint + format
npm run format     # Biome auto-format
npm test           # Vitest
npm run e2e        # Playwright E2E（要ビルド）
```

## API出典

* [国会会議録検索システム API](https://kokkai.ndl.go.jp/api.html) — 国立国会図書館
* [帝国議会会議録検索システム API](https://teikokugikai-i.ndl.go.jp/) — 国立国会図書館
* [NDLサーチ API](https://ndlsearch.ndl.go.jp/help/api) — 国立国会図書館

国立国会図書館ウェブサイトのコンテンツ利用規約に従い、すべての検索結果ページに出典を表記しています。

## ライセンス

MIT
