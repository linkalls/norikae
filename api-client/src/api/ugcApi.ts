import { HttpClient } from "../http";

import { cleanParams } from "../http";
import {
  CongestionData,
  CongestionPostRequest,
  CongestionTimelineData,
  CongestionTimelineRequest,
} from "../types";

/**
 * 混雑UGC API (https://navi-transit.yahooapis.jp)
 *
 * ユーザー投稿の混雑情報
 */
export class UgcApi {
  constructor(private readonly client: HttpClient) {}

  /**
   * 混雑情報を投稿 (POST /v2/congestion/ugc/train)
   *
   * @example
   * await api.ugc.postCongestion({
   *   railId: "22608",
   *   direction: "1",
   *   station: "1130101",
   *   stationTime: "202602251200",
   *   level: "3",
   * });
   */
  async postCongestion(params: CongestionPostRequest): Promise<CongestionData> {
    return this.client.post<CongestionData>(
      "v2/congestion/ugc/train",
      new URLSearchParams(
        cleanParams(params as unknown as Record<string, unknown>),
      ),
    );
  }

  /**
   * 混雑情報更新 (GET/query /v2/congestion/ugc/train)
   */
  async updateCongestion(
    params: Record<string, string>,
  ): Promise<CongestionData> {
    return this.client.get<CongestionData>("v2/congestion/ugc/train", {
      params,
    });
  }

  /**
   * 混雑情報削除 (DELETE /v2/congestion/ugc/train)
   *
   * @param railId       - 路線ID
   * @param direction    - 方向
   * @param station      - 駅ID
   * @param stationTime  - 時刻
   * @param id           - 投稿ID
   */
  async deleteCongestion(
    railId: number,
    direction: number,
    station: number,
    stationTime: string,
    id: string,
  ): Promise<CongestionData["ResultInfo"]> {
    return this.client.delete<CongestionData["ResultInfo"]>(
      "v2/congestion/ugc/train",
      {
        params: { railId, direction, station, stationTime, id },
      },
    );
  }

  /**
   * 混雑タイムライン取得 (GET /v2/congestion/ugc/train/timeline)
   *
   * @example
   * const timeline = await api.ugc.getTimeline({ railRangeId: "22608-1" });
   */
  async getTimeline(
    params: CongestionTimelineRequest,
  ): Promise<CongestionTimelineData> {
    return this.client.get<CongestionTimelineData>(
      "v2/congestion/ugc/train/timeline",
      { params },
    );
  }
}
