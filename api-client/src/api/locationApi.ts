import { HttpClient } from "../http";

import {
  LocationBusData,
  LocationTrainData,
  LocationTrainJrwData,
  LocationTrainJrwRequest,
  RealTimeCongestionData,
} from "../types";

/**
 * リアルタイム位置情報 API (https://navi-transit.yahooapis.jp)
 */
export class LocationApi {
  constructor(private readonly client: HttpClient) {}

  /**
   * バスリアルタイム位置情報取得 (POST /v3/location/bus)
   *
   * @param param - バスパラメーター文字列
   *
   * @example
   * const buses = await api.location.getBus("routeId=12345");
   */
  async getBus(param: string): Promise<LocationBusData> {
    return this.client.post<LocationBusData>(
      "/v3/location/bus",
      new URLSearchParams({ param }),
    );
  }

  /**
   * 列車リアルタイム位置情報取得 (POST /v2/location/train/trip)
   *
   * @param param    - 列車パラメーター文字列
   * @param stopinfo - 停車情報 (optional)
   */
  async getTrainTrip(
    param: string,
    stopinfo?: string,
  ): Promise<LocationTrainData> {
    const body = new URLSearchParams({ param });
    if (stopinfo) body.set("stopinfo", stopinfo);

    return this.client.post<LocationTrainData>(
      "/v2/location/train/trip",
      body,
    );
  }

  /**
   * JR西日本列車位置情報取得 (GET /v1/location/train/jrw)
   *
   * @example
   * const trains = await api.location.getTrainJrw({
   *   railway: "34602",
   *   direction: "1",
   *   station: "3460101",
   *   express: "0",
   * });
   */
  async getTrainJrw(
    params: LocationTrainJrwRequest,
  ): Promise<LocationTrainJrwData> {
    return this.client.get<LocationTrainJrwData>(
      "/v1/location/train/jrw",
      { params },
    );
  }

  /**
   * リアルタイム混雑情報 (改札) 取得 (GET /v1/congestion/realtime/gate/list/{station_id})
   *
   * @param stationId - 駅ID
   *
   * @example
   * const congestion = await api.location.getGateCongestion("1130101");
   */
  async getGateCongestion(stationId: string): Promise<RealTimeCongestionData> {
    return this.client.get<RealTimeCongestionData>(
      `/v1/congestion/realtime/gate/list/${stationId}`,
    );
  }
}
