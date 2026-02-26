# norikae — Yahoo! 乗換案内 内部 API リバースエンジニアリング

---

## ⚠️ 免責事項 / Disclaimer

本リポジトリは **個人学習・技術研究を目的としたリバースエンジニアリング成果物** です。

- 本ツールは内部 API のエンドポイント・リクエスト形式を解析したものです。
- **本リポジトリは Yahoo Japan Corporation とは一切関係がなく、同社の公認・承認を受けていません。**
- 解析・利用した API はいずれも **非公開の内部 API** であり、仕様は予告なく変更・廃止される可能性があります。
- 本ツールを使用することで生じるいかなる損害・不利益についても、作者は一切の責任を負いません。
- **本ツールを商用利用・大量アクセス・サービス提供の目的で使用することは禁止します。** 個人的な技術学習・研究の範囲内でご利用ください。
- Yahoo Japan Corporation の利用規約・著作権を尊重し、問題が指摘された場合は速やかに公開を停止します。

> This repository is for **personal research and educational purposes only**.  
> It is not affiliated with or endorsed by Yahoo Japan Corporation.  
> Use of undocumented internal APIs may violate the service's Terms of Service.  
> The author assumes no liability for any damage caused by use of this software.

---

## モノレポ構成

```
norikae/
├── api-client/     # TypeScript API クライアントライブラリ (fetch ベース、依存ゼロ)
├── webui/          # Vite + Hono + React + Tailwind CSS v4 の Web UI
├── decompiled/     # jadx デコンパイル出力 (13,955 Java ファイル)
└── jadx-bin/       # jadx 1.5.1
```

## セットアップ & 動かし方

### 前提条件

| ツール                | バージョン            | 入手先                             |
| --------------------- | --------------------- | ---------------------------------- | ----- |
| [Bun](https://bun.sh) | 1.3 以上              | `curl -fsSL https://bun.sh/install | bash` |
| Node.js               | 不要 (Bun のみで動作) | —                                  |

### 1. リポジトリのクローン

```bash
git clone https://github.com/<your-name>/norikae.git
cd norikae
```

### 2. 依存ライブラリのインストール

```bash
bun install
```

ルートで実行すると `api-client/` と `webui/` の両 workspace が一括インストールされます。

### 3. 環境変数の設定

```bash
cp webui/.env.example webui/.env   # .env.example がなければ手動で作成
```

`webui/.env` を編集:

```env
# Hono BFF サーバーのポート (デフォルト: 3000)
PORT=3000

# Yahoo OAuth アクセストークン
# 認証不要な naviSearch・assist・diainfo などは空でも動作します
# 認証が必要な API (マイ時刻表・ルートメモ等) を使う場合は設定してください
NORIKAE_ACCESS_TOKEN=
```

トークンの取得方法は [docs/auth.md](docs/auth.md) を参照してください。

### 4. 開発サーバーの起動

```bash
cd webui
bun run dev
```

- **Hono BFF** → `http://localhost:3000`
- **Vite (React)** → `http://localhost:5173` (またはコンソールに表示されたポート)

ブラウザで `http://localhost:5173` を開くと乗換検索 UI が使えます。

### 5. プロダクションビルド & 起動

```bash
cd webui

# ビルド (dist/ に出力)
bun run build

# Hono が dist/ の静的ファイルも配信
NODE_ENV=production bun run preview
```

ビルド後は `http://localhost:3000` 一本で動作します。

### 6. Cloudflare Workers へのデプロイ

Cloudflare アカウントをお持ちの場合、`wrangler` を使ってエッジにデプロイできます。

```bash
cd webui
# 初回はブラウザが開いて Cloudflare へのログインを求められます
bun run deploy
```

API トークン (`NORIKAE_ACCESS_TOKEN`) を使用する場合は、Cloudflare の環境変数としてシークレットを登録してください:

```bash
cd webui
npx wrangler secret put NORIKAE_ACCESS_TOKEN
```

### 6. 型チェック

```bash
# API クライアント
cd api-client && bun tsc --noEmit

# Web UI
cd webui && bun run typecheck
```

---

## 認証

すべての API は Yahoo の内部認証が必要です。  
`webui/.env` に `NORIKAE_ACCESS_TOKEN` を設定してください。

詳細は [docs/auth.md](docs/auth.md) を参照。

## ドキュメント

| ファイル                                       | 内容                         |
| ---------------------------------------------- | ---------------------------- |
| [docs/api-reference.md](docs/api-reference.md) | 全エンドポイント一覧・型定義 |
| [docs/auth.md](docs/auth.md)                   | 認証方法・トークン取得       |
| [docs/test-results.md](docs/test-results.md)   | 実 API 疎通テスト結果        |
| [api-client/README.md](api-client/README.md)   | API クライアント使い方       |
| [webui/README.md](webui/README.md)             | Web UI の起動・設定          |

## 技術スタック

|                   | バージョン                  |
| ----------------- | --------------------------- |
| ランタイム        | Bun 1.3.9                   |
| TypeScript        | 5.9.3                       |
| APK デコンパイル  | jadx 1.5.1                  |
| HTTP              | Native `fetch` (axios なし) |
| UI フレームワーク | React 19 + Vite 6           |
| サーバー          | Hono 4                      |
| スタイル          | Tailwind CSS v4             |
