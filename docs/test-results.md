# API 疎通テスト結果

実施日: 2026-02-25  
環境: Windows 11, Bun 1.3.9, curl

---

## 概要

| エンドポイント                                        | ステータス  | 結果                                                          |
| ----------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| `navi-transit.yahooapis.jp/v3/naviSearch`             | ❌ 404      | `X-YahooJ-AuthError: Not found URL.`                          |
| `navi-transit.yahooapis.jp/v1/assist`                 | ❌ 404      | `{"Error":{"Message":"The URL You Requested Was Not Found"}}` |
| `cache-diainfo-transit.yahooapis.jp/v4/diainfo/check` | ❌ 403      | `{"Error":{"Message":"Your Request was Forbidden"}}`          |
| `map.yahooapis.jp/v1/poiSearch`                       | ❌ 403/HTML | HTML エラーページ                                             |
| `localhost:3000/health` (Hono)                        | ✅ 200      | `{"ok":true}`                                                 |
| `localhost:3000/api/suggest?q=渋谷` (Hono)            | ✅ 200      | `{"ok":true,"data":{"stations":[],"spots":[]}}`               |

---

## 詳細

### 接続性テスト

```
$ curl -I https://navi-transit.yahooapis.jp/v3/naviSearch \
    -H "User-Agent: Yahoo AppID:dj0zaiZpPWdPbmQ5Y1VFalVBMyZzPWNvbnN1bWVyc2VjcmV0Jng9ZDk-"

HTTP/1.1 404 Not Found
Date: Wed, 25 Feb 2026 13:14:53 GMT
Connection: keep-alive
Cache-Control: no-store
Content-Type: application/xml
X-Frame-Options: SAMEORIGIN
X-YahooJ-AuthError: Not found URL.   ← Yahoo 認証エラー
```

→ **サーバーには到達している** (RTT: ~240ms)。AppID のみでは不十分。

### /v1/assist

```
$ curl https://navi-transit.yahooapis.jp/v1/assist?query=渋谷&results=3
{"Error":{"Message":"The URL You Requested Was Not Found"}}
```

→ 404。AppID が登録済み URL として認識されていない。

### /v4/diainfo/check

```
$ curl https://cache-diainfo-transit.yahooapis.jp/v4/diainfo/check?big=0
{"Error":{"Message":"Your Request was Forbidden"}}
```

→ 403。Bearer トークンが必要な可能性が高い。

### map.yahooapis.jp/v1/poiSearch

```
$ curl https://map.yahooapis.jp/v1/poiSearch?query=渋谷駅
<!DOCTYPE HTML ...> (認証エラー HTML ページ)
```

→ Yahoo Maps API は個別の API キー設定が必要。

---

## 原因分析

1. **AppID だけでは不十分**: `X-YahooJ-AuthError` はヤフー認証基盤のエラー。  
   `User-Agent` の AppID に加えて Bearer トークンが必要と考えられる。

2. **IP/GeoIP 制限**: Yahoo の内部 API は日本国内 IP または特定 IP レンジからのみ許可している可能性がある。

3. **デバイス証明書**: Android アプリは APK 署名に紐づいたデバイス証明書を使って認証している可能性がある (Certificate pinning)。

---

## Hono サーバー (BFF) 動作確認

```bash
# ヘルスチェック ✅
$ curl http://localhost:3000/health
{"ok":true,"ts":"2026-02-25T13:13:38.298Z"}

# サジェスト (空結果だが 200 ✅ — Yahoo API が 403 のため空)
$ curl "http://localhost:3000/api/suggest?q=渋谷"
{"ok":true,"data":{"stations":[],"spots":[]}}
```

→ **Hono サーバーは正常動作**。Yahoo API 認証が通ればデータが返ってくる。

---

## TypeScript コンパイル

```bash
$ cd api-client && bun tsc --noEmit
# exit code: 0 ✅ (エラーなし)

$ cd webui && bun run typecheck
# exit code: 0 ✅ (エラーなし)
```

---

## 対応方針

有効な OAuth トークンを取得する方法:

1. **adb + Frida** でアプリ実行時のネットワークを傍受 → Bearer トークンを抽出
2. **`NORIKAE_ACCESS_TOKEN`** に設定して再テスト
3. 詳細は [auth.md](auth.md) を参照
