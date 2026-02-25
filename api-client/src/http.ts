/**
 * HTTP クライアントの設定
 */
export interface ClientConfig {
  /** Yahoo AppID / Consumer Key */
  appId?: string;
  /** OAuth アクセストークン (認証が必要な API で使用) */
  accessToken?: string;
  /** リクエストタイムアウト (ms, デフォルト: 15000) */
  timeout?: number;
  /** カスタムヘッダー */
  headers?: Record<string, string>;
  /** 全リクエストに付与するデフォルトクエリパラメーター */
  defaultParams?: Record<string, string>;
}

/**
 * Base URL 定義
 */
export const BASE_URLS = {
  /** メイン乗換案内 API (naviSearch, trainSearch, location 等) */
  navi: "https://navi-transit.yahooapis.jp",
  /** POI・駅名補完 API (assist, poiSearch) */
  poiTransit: "https://poi-transit.yahooapis.jp",
  /** キャッシュ乗換案内 API (timetable/station, DiainfoCgm) */
  cacheNavi: "https://cache-navi-transit.yahooapis.jp",
  /** 運行情報キャッシュ API */
  diainfo: "https://cache-diainfo-transit.yahooapis.jp",
  /** マップ・POI API (reverseGeocode, address, keepItems) */
  map: "https://map.yahooapis.jp",
  /** 認証が必要な API (ルートメモ等) */
  naviSec: "https://transit-sec.yahooapis.jp",
  /** プッシュ通知 API */
  push: "https://subscription.push.yahooapis.jp",
} as const;

/**
 * User-Agent ヘッダー (APK から抽出)
 *
 * haas/y84.java の intercept で設定されている値を使用。
 * AppID: dj00aiZpPUVkd3FZTVJFZHhWNCZzPWNvbnN1bWVyc2VjcmV0Jng9N2E-
 */
export const DEFAULT_USER_AGENT =
  "Yahoo AppID:dj00aiZpPUVkd3FZTVJFZHhWNCZzPWNvbnN1bWVyc2VjcmV0Jng9N2E-";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

/** fetch の GET/DELETE に渡すオプション */
interface GetOptions {
  params?: object;
  headers?: Record<string, string>;
}

/** fetch の POST/PUT に渡すオプション */
interface PostOptions {
  headers?: Record<string, string>;
}

/**
 * fetch ベースの軽量 HTTP クライアント
 */
export class HttpClient {
  private readonly baseHeaders: Record<string, string>;
  private readonly defaultParams: Record<string, string>;

  constructor(
    private readonly baseUrl: string,
    config: ClientConfig = {},
    useAuth = false,
  ) {
    this.baseHeaders = {
      "User-Agent": DEFAULT_USER_AGENT,
      "Content-Type": "application/json",
      ...config.headers,
    };
    this.defaultParams = config.defaultParams ?? {};
    if (useAuth && config.accessToken) {
      this.baseHeaders["Authorization"] = `Bearer ${config.accessToken}`;
    }
  }

  private buildUrl(path: string, params?: object): string {
    const base = this.baseUrl.replace(/\/$/, "");
    const url = new URL(path.startsWith("/") ? path : `/${path}`, base);
    // defaultParams を先に設定し、リクエスト固有パラメーターで上書き可能にする
    for (const [k, v] of Object.entries(this.defaultParams)) {
      url.searchParams.set(k, v);
    }
    if (params) {
      for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return url.toString();
  }

  private mergeHeaders(extra?: Record<string, string>): Record<string, string> {
    return extra ? { ...this.baseHeaders, ...extra } : { ...this.baseHeaders };
  }

  private async send<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      console.error(`[NorikaeAPI] Error ${res.status}:`, body);
      throw new ApiError(res.status, body);
    }
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as T;
  }

  async get<T>(path: string, options: GetOptions = {}): Promise<T> {
    const url = this.buildUrl(path, options.params);
    return this.send<T>(url, {
      method: "GET",
      headers: this.mergeHeaders(options.headers),
    });
  }

  async post<T>(
    path: string,
    body?: string | URLSearchParams | object,
    options: PostOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path);
    let encodedBody: string | URLSearchParams | undefined;
    let contentType = "application/json";

    if (body instanceof URLSearchParams) {
      encodedBody = body;
      contentType = "application/x-www-form-urlencoded";
    } else if (typeof body === "string") {
      encodedBody = body;
    } else if (body !== undefined) {
      encodedBody = JSON.stringify(body);
    }

    return this.send<T>(url, {
      method: "POST",
      headers: this.mergeHeaders({
        "Content-Type": contentType,
        ...options.headers,
      }),
      body: encodedBody,
    });
  }

  async put<T>(
    path: string,
    body?: string | URLSearchParams | object,
    options: PostOptions = {},
  ): Promise<T> {
    const url = this.buildUrl(path);
    let encodedBody: string | URLSearchParams | undefined;
    let contentType = "application/json";

    if (body instanceof URLSearchParams) {
      encodedBody = body;
      contentType = "application/x-www-form-urlencoded";
    } else if (typeof body === "string") {
      encodedBody = body;
    } else if (body !== undefined) {
      encodedBody = JSON.stringify(body);
    }

    return this.send<T>(url, {
      method: "PUT",
      headers: this.mergeHeaders({
        "Content-Type": contentType,
        ...options.headers,
      }),
      body: encodedBody,
    });
  }

  async delete<T>(
    path: string,
    options: { params?: object; data?: unknown } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const init: RequestInit = {
      method: "DELETE",
      headers: this.mergeHeaders(),
    };
    if (options.data !== undefined) {
      init.body = JSON.stringify(options.data);
    }
    return this.send<T>(url, init);
  }
}

/**
 * HttpClient のファクトリー
 */
export function createHttpClient(
  baseUrl: string,
  config: ClientConfig = {},
  useAuth = false,
): HttpClient {
  return new HttpClient(baseUrl, config, useAuth);
}

/**
 * クエリパラメーターから undefined / null を除去するヘルパー
 */
export function cleanParams<T extends Record<string, unknown>>(
  params: T,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
}
