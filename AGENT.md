# AGENT.md — norikae プロジェクト ガイド

このファイルは AI コーディングエージェントがこのリポジトリで作業する際のコンテキストです。

## プロジェクト概要

Yahoo! 乗換案内 APK から抽出した非公開 API を使った東京エリア乗換案内 Web アプリ。

```
norikae/
├── api-client/          # Yahoo Transit API クライアント (TypeScript)
├── decompiled/          # jadx でデコンパイルした APK ソース (参照のみ)
├── webui/               # フロントエンド (Vite + Hono + React + Tailwind)
└── docs/                # ドキュメント
```

## 技術スタック

| 層             | 技術                       |
| -------------- | -------------------------- |
| ランタイム     | Bun 1.3.9                  |
| フロントエンド | React 19 + Tailwind CSS v4 |
| BFF            | Hono (ポート 3000)         |
| ビルド         | Vite (ポート 5173)         |
| 言語           | TypeScript                 |

## よく使うコマンド

```bash
cd webui

# サーバー起動
bun run dev            # Hono + Vite 同時起動

# 型チェック
bun run typecheck

# 個別起動
bun run server         # Hono のみ
bun run client         # Vite のみ
```

## API クライアント

`webui/src/server/index.ts` が `api-client` を使って Yahoo Transit API を呼び出す BFF。

### 主要エンドポイント

| メソッド                             | 説明                 | 注意                                                               |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------ |
| `client.naviSearch(from, to, opts)`  | 経路検索             | PassStation[] のみ返す (セクション詳細なし)                        |
| `client.poi.searchByStationId(code)` | 駅コード→名前/路線名 | Feature[0].Name + TransitSearchInfo.Detail                         |
| `client.poi.suggestItems(q)`         | 駅名サジェスト       |                                                                    |
| `client.diainfo.check()`             | 運行情報             | detail[].diainfo.serviceCondition: 0=平常 1=遅延 2=停止 3=一部遅延 |

### PassStation データの注意事項

- `naviSearch` は `Section`/`Link` (区間詳細) を返さない — PassStation の ID リストのみ
- プラットフォーム番号は返らない (API 未対応)
- 出発・到着駅がターミナル駅の場合、`searchByStationId` の railName が経路と異なる場合がある
  → `buildSegments()` で最頻出 railName を採用して補正済み

### 乗換判定ロジック

`RouteResult.tsx` の `buildSegments()`:

1. `transfer === 0` → 全駅を 1 セグメント (直通)
2. `transfer > 0` → 中間駅 (出発・到着除く) の railName 変化点を検出し、**最大 transfer 回** で分割

## 検索履歴

- `App.tsx` の `useSearchHistory` フックで管理
- `localStorage` キー: `norikae-history`
- 最大 8 件保存、重複は自動除去

## URL 共有

- 経路検索時に `window.history.replaceState` で `?from=X&to=Y` に更新
- `initialFrom` / `initialTo` props で SearchForm に初期値を渡す
- Web Share API 対応 (非対応ブラウザは clipboard fallback)

## PWA

- `webui/public/manifest.json` に定義
- ショートカット: 経路検索 (`?tab=search`) / 運行情報 (`?tab=diainfo`)

## diainfo 構造

```typescript
{
  companyName?: string       // "JR東日本"
  railCode?: string          // null → isAreaLevel = true (広域情報)
  railName?: string          // null → isAreaLevel = true
  railwayTypeName?: string   // "特急", "在来線"
  railAreaName?: string      // "関東"
  diainfo: {
    serviceCondition: "0"|"1"|"2"|"3"  // 平常/遅延/停止/一部遅延
    updateDate?: string       // "YYYY-MM-DD HH:mm:ss"
    message?: string
  }
}
```

## ファイル別役割

| ファイル                                       | 役割                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `webui/src/server/index.ts`                    | Hono BFF。API プロキシ・CORS・エラー変換                                  |
| `webui/src/client/api.ts`                      | fetch ラッパー + 型定義 (SearchHistory, StationNameInfo, DiainfoItem ...) |
| `webui/src/client/App.tsx`                     | タブ管理・検索履歴フック・URL パラメータ読み込み・Toast                   |
| `webui/src/client/components/SearchForm.tsx`   | 検索フォーム + オートコンプリート + 履歴パネル                            |
| `webui/src/client/components/RouteResult.tsx`  | 経路カード・セグメント色分け・コピーボタン                                |
| `webui/src/client/components/DiainfoPanel.tsx` | 運行情報パネル (平常バナー・遅延カード)                                   |

## 既知の制限

- 到着時刻は**目安**（総所要時間を駅数で割った均等配分）
- プラットフォーム番号は API 非対応のため表示不可
- `naviSearch` は PassStation ID リストのみ返すため、出発・最終のみ確定時刻あり
- Yahoo Transit API は非公式利用のため、レート制限・仕様変更リスクあり
