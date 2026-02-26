# norikae-webui

東京エリア乗換案内 Web アプリ — Vite + Bun + Hono + Tailwind CSS v4 + React 19

## 機能

| 機能                      | 詳細                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| 🔍 経路検索               | 駅名・スポット名で出発地/目的地/経由地を指定。出発・到着・終電モード  |
| 🚉 駅名オートコンプリート | 読み仮名・ローマ字対応のリアルタイムサジェスト (250ms debounce)       |
| 🗺️ 経路詳細               | 各駅の到着時刻（目安）・路線名・会社名・乗換表示                      |
| 🎨 路線色トラック         | 同じ列車の駅を同色で視覚的にグループ表示。乗換点に🔄マーカー          |
| 💴 運賃・定期代           | IC/1ヶ月/3ヶ月/6ヶ月定期代グリッド表示                                |
| 🌿 環境情報               | CO₂排出量 (g/人)・距離 (km)                                           |
| ⚡ 並び順                 | 速い / 乗換少 / 安い でリアルタイムソート                             |
| 📡 運行情報               | リアルタイム遅延・運転見合わせ（路線・エリア・会社名・更新時刻付き）  |
| 🕐 検索履歴               | 直近8件を localStorage に自動保存。クリックで再検索                   |
| 🔗 URL 共有               | `?from=渋谷&to=新宿` 形式で経路を共有。Web Share API / clipboard 対応 |
| 📋 ルートコピー           | 各経路カード📋ボタンでテキストサマリーをクリップボードへ              |
| 📱 PWA 対応               | manifest.json・ホーム画面追加・テーマカラー・ショートカット設定済み   |

## 起動方法

```bash
# 依存ライブラリのインストール
bun install

# 開発モード (Hono :3000 + Vite :5173 を同時起動)
bun run dev

# 型チェック
bun run typecheck

# プロダクションビルド
bun run build

# プロダクション起動 (Hono が静的ファイルも配信)
NODE_ENV=production bun run preview
```

### Cloudflare Workers へのデプロイ

```bash
# dist/static へのビルドと wrangler deploy を実行
bun run deploy
```

シークレットの設定:

```bash
wrangler secret put NORIKAE_ACCESS_TOKEN
```

## 環境変数

`webui/.env` を編集してください:

```env
# Hono サーバーポート (デフォルト: 3000)
PORT=3000

# Yahoo OAuth トークン (認証不要な API は空でOK)
NORIKAE_ACCESS_TOKEN=
```

APK から抽出した AppID は `api-client/src/http.ts` に埋め込み済みのため設定不要。

## アーキテクチャ

```
ブラウザ
  └─ Vite Dev Server (:5173)          ← React + Tailwind CSS v4
       └─ /api/* → Hono (:3000)       ← BFF / API プロキシ
            └─ norikae-api-client     ← Yahoo Transit API への fetch
```

### ディレクトリ構成

```
webui/
├── index.html                    # PWA メタタグ・manifest リンク
├── public/
│   ├── manifest.json             # PWA manifest (ホーム画面追加対応)
│   └── favicon.svg
└── src/
    ├── server/
    │   └── index.ts              # Hono BFF サーバー
    └── client/
        ├── main.tsx              # React エントリポイント
        ├── App.tsx               # タブ管理・検索履歴フック・URL共有
        ├── api.ts                # fetch → Hono ラッパー + 型定義
        ├── styles.css            # @import "tailwindcss"
        └── components/
            ├── SearchForm.tsx    # 検索フォーム + 履歴パネル
            ├── RouteResult.tsx   # 経路結果・セグメント色分け・コピー
            └── DiainfoPanel.tsx  # 運行情報パネル
```

## BFF API エンドポイント

| メソッド | パス                        | 説明                            |
| -------- | --------------------------- | ------------------------------- |
| `GET`    | `/health`                   | ヘルスチェック                  |
| `POST`   | `/api/search`               | 経路検索                        |
| `GET`    | `/api/suggest?q=`           | 駅名・地名オートコンプリート    |
| `GET`    | `/api/station-names?codes=` | 駅コード → 日本語名・路線名変換 |
| `GET`    | `/api/diainfo`              | 運行情報                        |
| `GET`    | `/api/stations?q=`          | 駅名完全一致検索                |

詳細: [../docs/api-reference.md](../docs/api-reference.md)

## URL 共有

検索後は URL が `?from=渋谷&to=新宿` に自動更新されます。  
共有ボタン (🔗 共有) または各ルートの📋ボタンで共有できます。

## 認証について

→ [../docs/auth.md](../docs/auth.md)

## 起動方法

```bash
# 依存ライブラリのインストール
bun install

# 開発モード (Hono :3000 + Vite :5173 を同時起動)
bun run dev

# 型チェック
bun run typecheck

# プロダクションビルド
bun run build

# プロダクション起動 (Hono が静的ファイルも配信)
NODE_ENV=production bun run preview
```

## 環境変数

`webui/.env` を編集してください:

```env
# Hono サーバーポート (デフォルト: 3000)
PORT=3000

# Yahoo OAuth トークン (認証不要な API は空でOK)
# 認証が必要なエンドポイント: ルートメモ, マイ時刻表など
NORIKAE_ACCESS_TOKEN=
```

APK から抽出した AppID は `api-client/src/http.ts` の `DEFAULT_USER_AGENT` に  
既に埋め込まれているため設定不要です。

## アーキテクチャ

```
デバイス
  └─ Vite Dev Server (:5173)    ← React + Tailwind CSS フロントエンド
       └─ /api/* proxy
            └─ Hono Server (:3000)  ← BFF / API プロキシ
                 └─ norikae-api-client  ← Yahoo API への fetch
```

### ディレクトリ構成

```
webui/
├── src/
│   ├── server/
│   │   └── index.ts        # Hono サーバー (ルーティング + BFF)
│   └── client/
│       ├── main.tsx         # React エントリポイント
│       ├── App.tsx          # タブ管理 (経路検索 / 運行情報)
│       ├── api.ts           # fetch → Hono ラッパー
│       ├── styles.css       # @import "tailwindcss"
│       └── components/
│           ├── SearchForm.tsx     # 出発地・目的地入力 + 補完
│           ├── RouteResult.tsx    # 経路結果カード
│           └── DiainfoPanel.tsx   # 運行情報パネル
├── .env                    # 環境変数 (gitignore)
├── .env.example            # テンプレート
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Hono API エンドポイント (BFF)

| メソッド | パス                     | 説明             |
| -------- | ------------------------ | ---------------- |
| `GET`    | `/health`                | ヘルスチェック   |
| `POST`   | `/api/search`            | ルート検索       |
| `GET`    | `/api/suggest?q=`        | 駅名・地名補完   |
| `GET`    | `/api/diainfo`           | 運行情報         |
| `GET`    | `/api/stations?q=`       | 駅名完全一致検索 |
| `GET`    | `/api/timetable/station` | 時刻表           |

詳細: [../docs/api-reference.md](../docs/api-reference.md)

## 機能

- 🔍 **経路検索** — 出発地/目的地/経由地/日時/種別
- ✨ **入力補完** — 250ms デバウンス、駅・スポット候補表示
- 📡 **運行情報** — 路線別遅延/停止/平常を色分け表示
- ⇅ **出発地・目的地の入れ替え**
- 🚄 **新幹線利用切替**

## 認証について

→ [../docs/auth.md](../docs/auth.md)
