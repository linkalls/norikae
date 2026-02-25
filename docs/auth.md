# 認証ガイド

## 概要

Yahoo! 乗換案内 内部 API の認証は 2 層構造です。

| 層         | 方法                            | 対象                       |
| ---------- | ------------------------------- | -------------------------- |
| AppID 認証 | `User-Agent` ヘッダー           | ほぼ全エンドポイント       |
| OAuth 認証 | `Authorization: Bearer <token>` | `transit-sec.yahooapis.jp` |

---

## AppID (自動設定済み)

APK から抽出した AppID は `api-client/src/http.ts` に埋め込み済みです:

```typescript
export const DEFAULT_USER_AGENT =
  "Yahoo AppID:dj0zaiZpPWdPbmQ5Y1VFalVBMyZzPWNvbnN1bWVyc2VjcmV0Jng9ZDk-";
```

**設定不要。** すべてのリクエストに自動付与されます。

---

## OAuth アクセストークン

### 必要なエンドポイント

| エンドポイント                      | Base URL                   |
| ----------------------------------- | -------------------------- |
| `GET /v3/naviSearchAuth`            | `transit-sec.yahooapis.jp` |
| `GET /v2/registration/:type`        | `transit-sec.yahooapis.jp` |
| `GET /v1/registration/myTimetable`  | `transit-sec.yahooapis.jp` |
| `POST /v1/registration/myTimetable` | `transit-sec.yahooapis.jp` |

### 設定方法

`webui/.env` に記載:

```env
NORIKAE_ACCESS_TOKEN=your_bearer_token_here
```

### トークンの取得

アプリの認証フローでは Yahoo ID を使った OAuth 2.0 が使用されています。

APK を解析した結果:

1. アプリが Yahoo の OAuth 認可エンドポイントへリダイレクト
2. ユーザーが Yahoo ID でログイン
3. 認可コードを受け取り、`transit-sec.yahooapis.jp` のトークンエンドポイントで交換
4. Bearer トークンを取得

#### トークン抽出の方法 (Android デバッグ)

```bash
# Android デバイスで adb を使ってネットワークキャプチャ
adb shell "su -c 'tcpdump -i any -w /sdcard/capture.pcap'"
# アプリを操作してトークンを含むリクエストをキャプチャ

# または Frida でメモリから抽出
frida -U -n jp.co.yahoo.android.apps.transit \
  --eval "Java.perform(function() { /* hook HttpClient */ })"
```

### 認証不要なエンドポイント

以下は AppID User-Agent のみで動作するはず (ただしサーバー側の検証による):

- `GET /v3/naviSearch`
- `GET /v1/assist`
- `GET /v4/diainfo/check`
- `GET /v2/timetable/station`
- `GET /v1/poiSearch`

> **注意**: [疎通テスト結果](test-results.md) によると、現在これらも 403/404 を返す場合があります。  
> 追加の認証ヘッダーが必要な可能性があります。

---

## CORS

Yahoo API には CORS ヘッダーがないため、ブラウザから直接呼べません。  
Hono サーバー (`:3000`) を BFF として経由させることで解決しています。

```
Browser → Hono (:3000) → Yahoo API
```
