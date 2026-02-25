import { useEffect, useState } from "react";
import { type Route, type RouteSegment, type Section, type StationNameInfo, getStationNames } from "../api";

interface Props {
  routes: Route[];
  searchDate?: string;
  from?: string;   // 出発地名 (e.g. "渋谷")
  to?: string;     // 目的地名 (e.g. "新宿")
}

// ─── ユーティリティ ──────────────────────────────────────────────────

/** "YYYYMMDDHHmm" → "HH:MM" */
function fmtDateStr(s?: string): string {
  if (!s || s.length < 12) return "";
  return `${s.slice(8, 10)}:${s.slice(10, 12)}`;
}

function formatTime(time?: string) {
  if (!time || time.length < 8) return time ?? "";
  return `${time.slice(8, 10)}:${time.slice(10, 12)}`;
}

function fareLabel(n?: number) {
  if (!n) return null;
  return `¥${n.toLocaleString()}`;
}

const BADGE_STYLE: Record<string, string> = {
  最速: "bg-blue-500 text-white",
  乗換少: "bg-purple-500 text-white",
  最安: "bg-emerald-500 text-white",
};

// ─── Section row ───────────────────────────────────────────────────────

function LineTag({ section }: { section: Section }) {
  const color = section.line?.color ? `#${section.line.color}` : "#6b7280";
  const trainType = section.line?.trainType;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-xs font-bold whitespace-nowrap"
      style={{ backgroundColor: color }}
    >
      {section.line?.name ?? ""}
      {trainType && <span className="opacity-90">[{trainType}]</span>}
    </span>
  );
}

// type: 0=walk, 1=train, 2=bus etc
const WALK_TYPES = new Set([0, 3]); // 0=walk, 3=walk(transfer)

function SectionRow({ section }: { section: Section }) {
  const isWalk = section.type != null ? WALK_TYPES.has(section.type) : false;
  if (isWalk) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-sm text-gray-500">
        <span>🚶</span>
        <span>徒歩 {section.time}分</span>
      </div>
    );
  }
  const fromTime = formatTime(section.from?.time);
  const toTime = formatTime(section.to?.time);
  const lineColor = section.line?.color ? `#${section.line.color}` : "#9ca3af";
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-14 text-right text-sm text-gray-700 font-mono shrink-0">
        {fromTime && <div className="text-blue-700 font-bold">{fromTime}</div>}
        <div className="mt-6" />
        {toTime && <div className="text-red-600 font-bold">{toTime}</div>}
      </div>
      <div className="flex flex-col items-center shrink-0 gap-0 mt-1">
        <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 bg-white" />
        <div
          className="w-0.5 h-8 flex-1 min-h-8"
          style={{ backgroundColor: lineColor }}
        />
        <div className="w-2.5 h-2.5 rounded-full border-2 border-gray-400 bg-white" />
      </div>
      <div className="flex-1 text-sm">
        <div className="text-gray-900 font-medium">{section.from?.name}</div>
        <div className="my-1.5 flex items-center gap-1.5 flex-wrap">
          <LineTag section={section} />
          {section.time ? <span className="text-xs text-gray-500">{section.time}分</span> : null}
        </div>
        <div className="text-gray-900 font-medium">{section.to?.name}</div>
      </div>
    </div>
  );
}

// ─── PassStation 名称ルックアップ ──────────────────────────────────────

/** 徒歩区間の表示ウィジェット */
function WalkLegRow({ from, to, minutes }: { from?: string; to?: string; minutes?: number }) {
  return (
    <div className="flex items-start gap-3 py-1.5 pl-0">
      <div className="w-14 shrink-0" />
      <div className="flex flex-col items-center shrink-0 gap-0 mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-sky-300 border-2 border-white" />
        <div className="w-0.5 h-7 bg-sky-300 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 3px, #7dd3fc 3px, #7dd3fc 6px)" }} />
        <div className="w-2.5 h-2.5 rounded-full bg-sky-300 border-2 border-white" />
      </div>
      <div className="flex-1 text-sm">
        {from && <div className="text-gray-600">{from}</div>}
        <div className="my-1 flex items-center gap-1.5">
          <span className="text-sky-600">🚶</span>
          <span className="text-sky-700 font-medium text-xs">徒歩{minutes ? ` ${minutes}分` : ""}</span>
        </div>
        {to && <div className="text-gray-600">{to}</div>}
      </div>
    </div>
  );
}

function useStationNames(codes: string[]) {
  const [names, setNames] = useState<Record<string, StationNameInfo>>({});
  const [loading, setLoading] = useState(false);
  const key = codes.join(",");
  useEffect(() => {
    if (!key) return;
    setLoading(true);
    getStationNames(codes)
      .then((d) => { setNames(d ?? {}); setLoading(false); })
      .catch(() => { setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { names, loading };
}

// ─── セグメント定義 ────────────────────────────────────────────────────

/** 連続する同一路線の駅をまとめたセグメント */
interface TrainSegment {
  railName?: string;
  companyName?: string;
  colorIdx: number;
  stationIndices: number[];
  isBus?: boolean; // バス路線かどうか
}

const TRACK_COLORS: { track: string; bg: string; dot: string; tag: string }[] = [
  { track: "#3b82f6", bg: "bg-blue-50", dot: "bg-blue-500", tag: "bg-blue-100 text-blue-700" },
  { track: "#f97316", bg: "bg-orange-50", dot: "bg-orange-500", tag: "bg-orange-100 text-orange-700" },
  { track: "#16a34a", bg: "bg-green-50", dot: "bg-green-600", tag: "bg-green-100 text-green-700" },
  { track: "#9333ea", bg: "bg-purple-50", dot: "bg-purple-500", tag: "bg-purple-100 text-purple-700" },
];

// ─── Route 詳細 (展開時) ─────────────────────────────────────────────

/** YYYYMMDDHHmm に分を加算 (クライアント側) */
function addMins(dateStr: string, minutes: number): string {
  if (!dateStr || dateStr.length < 12) return dateStr;
  const y = +dateStr.slice(0, 4), mo = +dateStr.slice(4, 6) - 1;
  const d = +dateStr.slice(6, 8), h = +dateStr.slice(8, 10), m = +dateStr.slice(10, 12);
  const dt = new Date(y, mo, d, h, m + minutes);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}${p(dt.getHours())}${p(dt.getMinutes())}`;
}

// ─── Edge ベース セグメント表示 ──────────────────────────────────────
// detail=full で返ってくる RouteInfo.Edge[] データを使って正確な区間を表示
function SegmentEdgeView({ segments, fromName, toName }: {
  segments: RouteSegment[];
  fromName?: string;
  toName?: string;
}) {
  // 非徒歩セグメントのインデックスリスト (転送マーカーや出発/到着バッジ用)
  const trainIndices = segments.map((_s, i) => i).filter((i) => !segments[i].isWalk);
  const firstTrainIdx = trainIndices[0] ?? -1;
  const lastTrainIdx = trainIndices[trainIndices.length - 1] ?? -1;
  // 最初の電車より前に徒歩がある場合 → 電車始点に「出発」を付けない (徒歩始点に委ねる)
  const hasWalkBeforeFirstTrain =
    firstTrainIdx > 0 && segments.slice(0, firstTrainIdx).some((s) => s.isWalk);
  // 最後の電車より後に徒歩がある場合 → 電車終点に「到着」を付けない (徒歩終点に委ねる)
  const hasWalkAfterLastTrain =
    lastTrainIdx >= 0 &&
    lastTrainIdx < segments.length - 1 &&
    segments.slice(lastTrainIdx + 1).some((s) => s.isWalk);

  return (
    <div className="space-y-0">
      {segments.map((seg, si) => {
        const isBus =
          seg.railName.includes("バス") ||
          seg.railName.toLowerCase().includes("bus");
        const trackColor = seg.color ?? "#888888";

        if (seg.isWalk) {
          // 徒歩区間
          // walkLabel = 出口名("JR東口"など) が railName に入っている場合の保持値
          const exitLabel = seg.walkLabel; // e.g. "JR東口"
          const walkFrom = exitLabel
            || seg.stops[0]?.name
            || (si === 0 ? fromName : undefined);
          const walkTo = seg.stops[seg.stops.length - 1]?.name
            || (si === segments.length - 1 ? toName : undefined);
          const depT = seg.departureTime;
          const arrT = seg.arrivalTime;
          return (
            <div key={si} className="flex items-start gap-3 py-1.5 pl-0">
              <div className="w-14 shrink-0" />
              <div className="flex flex-col items-center shrink-0 gap-0 mt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-300 border-2 border-white" />
                <div
                  className="w-0.5 h-7 bg-sky-300 opacity-60"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, #7dd3fc 0, #7dd3fc 4px, transparent 4px, transparent 8px)",
                    background: "none",
                    borderLeft: "2px dashed #7dd3fc",
                  }}
                />
                <div className="w-2.5 h-2.5 rounded-full bg-sky-300 border-2 border-white" />
              </div>
              <div className="flex-1 text-sm">
                {walkFrom && (
                  <div className="text-gray-600">
                    {walkFrom}
                    {exitLabel && (
                      <span className="ml-1.5 text-xs text-sky-600 font-medium bg-sky-50 border border-sky-200 rounded px-1">出口</span>
                    )}
                  </div>
                )}
                <div className="my-1 flex items-center gap-1.5">
                  <span className="text-sky-600">🚶</span>
                  <span className="text-sky-700 font-medium text-xs">
                    徒歩
                    {depT && arrT ? ` ${depT}〜${arrT}` : ""}
                  </span>
                </div>
                {walkTo && (
                  <div className="text-gray-600">{walkTo}</div>
                )}
              </div>
            </div>
          );
        }

        // 鉄道/バス区間
        return (
          <div key={si}>
            {/* 乗換マーカー: 直前が徒歩でない非徒歩セグメント同士の間 */}
            {si > 0 && !segments[si - 1].isWalk && (
              <div className="flex items-center gap-2 my-2 pl-1">
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0">
                  🔄
                </div>
                <span className="text-xs text-orange-600 font-medium">乗換</span>
              </div>
            )}
            {/* 路線名ヘッダー */}
            <div className="flex items-center gap-1.5 mb-1.5 pl-5 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: trackColor }}
              >
                {isBus ? "🚌 " : ""}
                {seg.railName}
              </span>
              {seg.trainKind && (
                <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium">
                  {seg.trainKind}
                </span>
              )}
              {seg.destination && (
                <span className="text-xs text-gray-500">
                  ▷ {seg.destination}
                </span>
              )}
              {seg.departureTime && seg.arrivalTime && (
                <span className="text-xs text-gray-400 tabular-nums">
                  {seg.departureTime}〜{seg.arrivalTime}
                </span>
              )}
              {seg.departureTrackNumber && (
                <span className="text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded px-1.5 py-0.5">
                  🚉 {seg.departureTrackNumber}発
                </span>
              )}
              {seg.arrivalTrackNumber && (
                <span className="text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded px-1.5 py-0.5">
                  🚉 {seg.arrivalTrackNumber}着
                </span>
              )}
            </div>
            {/* 停車駅リスト */}
            <div
              className="relative pl-4 space-y-0"
              style={{
                borderLeft: `3px solid ${trackColor}`,
                opacity: 0.9,
              }}
            >
              {seg.stops.map((stop, k) => {
                const isFirst = k === 0;
                const isLast = k === seg.stops.length - 1;
                const isRouteFirst = si === firstTrainIdx && isFirst && !hasWalkBeforeFirstTrain;
                const isRouteLast = si === lastTrainIdx && isLast && !hasWalkAfterLastTrain;
                // 出発地・目的地の表示名を優先
                const displayName =
                  isRouteFirst && fromName
                    ? fromName
                    : isRouteLast && toName
                      ? toName
                      : stop.name;
                const timeStr = isFirst
                  ? (stop.departureTime ?? stop.arrivalTime)
                  : isLast
                    ? (stop.arrivalTime ?? stop.departureTime)
                    : (stop.departureTime ?? stop.arrivalTime);

                return (
                  <div
                    key={k}
                    className="flex items-start gap-2 py-2 text-sm"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 border-white"
                      style={{
                        backgroundColor: isRouteFirst
                          ? "#3b82f6"
                          : isRouteLast
                            ? "#ef4444"
                            : trackColor,
                        marginLeft: "-7px",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-medium ${isRouteFirst
                            ? "text-blue-700"
                            : isRouteLast
                              ? "text-red-700"
                              : "text-gray-700"
                            }`}
                        >
                          {displayName}
                        </span>
                        {isRouteFirst && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                            出発
                          </span>
                        )}
                        {isRouteLast && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                            到着
                          </span>
                        )}
                      </div>
                    </div>
                    {timeStr && (
                      <span
                        className={`text-xs font-mono shrink-0 mt-0.5 tabular-nums ${isRouteFirst
                          ? "text-blue-600 font-bold"
                          : isRouteLast
                            ? "text-red-600 font-bold"
                            : "text-gray-400"
                          }`}
                      >
                        {timeStr}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RouteDetail({ route, fromName, toName }: { route: Route; fromName?: string; toName?: string }) {
  const hasSections = (route.section?.length ?? 0) > 0;
  const stationCodes = hasSections ? [] : (route.passStation ?? []);
  const { names, loading: namesLoading } = useStationNames(stationCodes);

  const passes = route.passStation ?? [];

  // 徒歩区間の検出 (名前上書き前のraw namesを使う)
  const timeWalk = route.timeWalk ?? 0;
  const firstStationName = passes.length > 0 ? (names[passes[0]]?.name ?? "") : "";
  const lastStationName = passes.length > 0 ? (names[passes[passes.length - 1]]?.name ?? "") : "";
  // 出発地名と最初の駅名が異なる → 入口徒歩あり
  const hasEntryWalk = timeWalk > 0 && fromName != null && firstStationName !== "" && fromName.trim() !== firstStationName.trim();
  // 目的地名と最後の駅名が異なる → 出口徒歩あり
  const hasExitWalk = timeWalk > 0 && toName != null && lastStationName !== "" && toName.trim() !== lastStationName.trim();
  // 入口・出口が両方ある場合は半分ずつ、片方のみなら全部
  const walkMinEntry = hasEntryWalk && hasExitWalk ? Math.ceil(timeWalk / 2) : (hasEntryWalk ? timeWalk : 0);
  const walkMinExit = hasEntryWalk && hasExitWalk ? Math.floor(timeWalk / 2) : (hasExitWalk ? timeWalk : 0);

  // 出発地・目的地コードから名前を上書き (検索パラメーターを優先、ただし徒歩区間がある側は上書きしない)
  const resolvedNames: Record<string, StationNameInfo> = { ...names };
  if (passes.length > 0 && fromName && !hasEntryWalk) resolvedNames[passes[0]] = { ...resolvedNames[passes[0]], name: fromName };
  if (passes.length > 0 && toName && !hasExitWalk) resolvedNames[passes[passes.length - 1]] = { ...resolvedNames[passes[passes.length - 1]], name: toName };

  // 各駅の推定到着時刻
  const departureTs = route.departureTime;
  const totalMinutes = route.totaltime ?? 0;
  const avgMinPerStop = passes.length > 1 ? totalMinutes / (passes.length - 1) : 0;
  const estimatedTime = (idx: number): string => {
    if (!departureTs || !avgMinPerStop) return "";
    return fmtDateStr(addMins(departureTs, Math.round(idx * avgMinPerStop)));
  };

  // ─ セグメント構築 ──────────────────────────────────────────────────
  // transfer===0 → 直通: 全駅を1セグメント
  // transfer>0  → 中間駅のrailName変化を最大transfer回検出して分割
  //               (出発・到着は大ターミナルで路線名がずれるため除外)
  const buildSegments = (): TrainSegment[] => {
    if (passes.length === 0) return [];

    /** コードの配列から最頻出railNameを返す */
    const dominantLine = (codes: string[]) => {
      const counts: Record<string, { count: number; company?: string }> = {};
      codes.forEach((c) => {
        const rn = resolvedNames[c]?.railName;
        if (rn) {
          if (!counts[rn]) counts[rn] = { count: 0, company: resolvedNames[c]?.companyName };
          counts[rn].count++;
        }
      });
      const best = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)[0];
      return best ? { railName: best[0], companyName: best[1].company } : {};
    };

    const maxTransfers = route.transfer ?? 0;

    if (maxTransfers === 0) {
      // 直通: 中間駅の最頻出路線名を使用
      const info = dominantLine(passes.slice(1, -1));
      return [{ ...info, colorIdx: 0, stationIndices: passes.map((_, i) => i) }];
    }

    // 乗換あり:
    // 出発・到着を除く中間駅の間でrailName変化点を検出 (最大transfer個)
    const changePoints: number[] = []; // passes[n] と passes[n+1] の間で変化
    for (let i = 1; i < passes.length - 2; i++) {
      const rn1 = resolvedNames[passes[i]]?.railName;
      const rn2 = resolvedNames[passes[i + 1]]?.railName;
      if (rn1 && rn2 && rn1 !== rn2) changePoints.push(i);
    }
    const splitAfter = new Set(changePoints.slice(0, maxTransfers));

    // 分割点でセグメントを構築
    const segs: TrainSegment[] = [];
    passes.forEach((_, idx) => {
      if (segs.length === 0 || splitAfter.has(idx - 1)) {
        segs.push({ colorIdx: segs.length % TRACK_COLORS.length, stationIndices: [idx] });
      } else {
        segs[segs.length - 1].stationIndices.push(idx);
      }
    });

    // 各セグメントの路線名を最頻出に補正 (出発・到着駅のmismatch対策)
    segs.forEach((seg) => {
      const info = dominantLine(seg.stationIndices.map((i) => passes[i]));
      seg.railName = info.railName;
      seg.companyName = info.companyName;
    });

    return segs;
  };

  const segments = buildSegments();
  // バス判定: companyName に "バス" を含む場合
  segments.forEach((seg) => {
    const cn = seg.companyName ?? "";
    if (cn.includes("バス") || cn.toLowerCase().includes("bus")) {
      seg.isBus = true;
    }
  });

  const hasEdgeSegments = (route.segments?.length ?? 0) > 0;

  return (
    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
      {/* Edge セグメント (detail=full で取得した正確なデータ) */}
      {hasEdgeSegments ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-3">
            経由
          </p>
          <SegmentEdgeView
            segments={route.segments!}
            fromName={fromName}
            toName={toName}
          />
        </div>
      ) : hasSections ? (
        <div>
          {route.section!.map((s, j) => <SectionRow key={j} section={s} />)}
        </div>
      ) : passes.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-3">
            経由駅 ({passes.length}駅)
          </p>

          {/* 読み込み中スケルトン */}
          {namesLoading ? (
            <div className="space-y-3 pl-4">
              {passes.map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0" />
                  <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + (i * 23) % 60}px` }} />
                  <div className="ml-auto h-3 w-10 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0">
              {/* 入口徒歩 (出発地→最初の駅) */}
              {hasEntryWalk && (
                <WalkLegRow from={fromName} to={firstStationName} minutes={walkMinEntry} />
              )}

              {segments.map((seg, si) => {
                const tc = seg.isBus
                  ? { track: "#f59e0b", bg: "bg-amber-50", dot: "bg-amber-500", tag: "bg-amber-100 text-amber-700" }
                  : TRACK_COLORS[seg.colorIdx];
                return (
                  <div key={si}>
                    {/* セグメント間の乗換マーカー */}
                    {si > 0 && (
                      <div className="flex items-center gap-2 my-2 pl-1">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0">🔄</div>
                        <span className="text-xs text-orange-600 font-medium">乗換</span>
                      </div>
                    )}
                    {/* 路線名ヘッダー */}
                    {seg.railName && (
                      <div className="flex items-center gap-1.5 mb-1.5 pl-5">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: tc.track }}
                        >
                          {seg.isBus ? "🚌 " : ""}{seg.railName}
                        </span>
                        {seg.companyName && (
                          <span className="text-xs text-gray-400">{seg.companyName}</span>
                        )}
                      </div>
                    )}
                    {/* 駅リスト (左側に路線色の縦線) */}
                    <div
                      className="relative pl-4 space-y-0"
                      style={{ borderLeft: `3px solid ${tc.track}`, borderRadius: "0 0 0 2px", opacity: 0.9 }}
                    >
                      {seg.stationIndices.map((idx) => {
                        const code = passes[idx];
                        const isFirst = idx === 0;
                        const isLast = idx === passes.length - 1;
                        const info = resolvedNames[code];
                        const displayName = info?.name;
                        const timeStr = isLast && route.arrivalTime
                          ? fmtDateStr(route.arrivalTime)
                          : estimatedTime(idx);
                        return (
                          <div
                            key={`${code}-${idx}`}
                            className="flex items-start gap-2 py-2 text-sm"
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 border-white"
                              style={{
                                backgroundColor: isFirst ? "#3b82f6" : isLast ? "#ef4444" : tc.track,
                                marginLeft: "-7px",
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-medium ${isFirst ? "text-blue-700"
                                  : isLast ? "text-red-700"
                                    : "text-gray-700"
                                  }`}>
                                  {displayName ?? (
                                    <span className="text-gray-300 text-xs">···</span>
                                  )}
                                </span>
                                {(isFirst || isLast) && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${isFirst ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                                    }`}>
                                    {isFirst ? "出発" : "到着"}
                                  </span>
                                )}
                              </div>
                            </div>
                            {timeStr && (
                              <span className={`text-xs font-mono shrink-0 mt-0.5 tabular-nums ${isFirst ? "text-blue-600 font-bold"
                                : isLast ? "text-red-600 font-bold"
                                  : "text-gray-400"
                                }`}>
                                {timeStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* 出口徒歩 (最後の駅→目的地) */}
              {hasExitWalk && (
                <WalkLegRow from={lastStationName} to={toName} minutes={walkMinExit} />
              )}

              {/* 徒歩あり・出口/入口なし の場合のまとめ表示 */}
              {timeWalk > 0 && !hasEntryWalk && !hasExitWalk && (
                <div className="flex items-center gap-2 mt-2 text-xs text-sky-600 bg-sky-50 px-3 py-2 rounded-lg">
                  <span>🚶</span>
                  <span>合計徒歩時間: 約{timeWalk}分含む</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            💡 到着時刻は目安です。実際の路線・号車は電光掲示板または駅係員へご確認ください
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">詳細情報なし</p>
      )}

      {/* 定期代 */}
      {(route.fare?.teiki1 || route.fare?.teiki3 || route.fare?.teiki6) && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">🎫 定期代</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {([
              { label: "1ヶ月", val: route.fare.teiki1 },
              { label: "3ヶ月", val: route.fare.teiki3 },
              { label: "6ヶ月", val: route.fare.teiki6 },
            ] as const).filter((x) => x.val).map(({ label, val }) => (
              <div key={label} className="bg-white rounded-lg p-2 border border-gray-100">
                <div className="text-gray-500">{label}</div>
                <div className="font-bold text-gray-800">¥{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 距離・CO2 */}
      {(route.distance || route.co2) ? (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
          {route.distance ? <span>📏 距離 {route.distance} km</span> : null}
          {route.co2 ? <span>🌿 CO₂ {route.co2} g/人</span> : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────

/** ルートのテキストサマリーを生成してクリップボードへ */
async function copyRouteSummary(
  route: Route,
  idx: number,
  fromName?: string,
  toName?: string,
) {
  const dep = fmtDateStr(route.departureTime);
  const arr = fmtDateStr(route.arrivalTime);
  const transfers = route.transfer ?? 0;
  const fare = route.fare?.total ? `¥${route.fare.total.toLocaleString()}` : "";
  const from = fromName ?? "出発地";
  const to = toName ?? "目的地";
  const lines = [
    `【経路 ${idx + 1}】${from} → ${to}`,
    `${dep} → ${arr} (${(route.totaltime ?? 0) + (route.timeOther ?? 0)}分${route.timeOther ? ` 乗換待${route.timeOther}分含` : ""})`,
    transfers === 0 ? "🟢 直通" : `🔄 乗換${transfers}回`,
    fare,
    route.passStation?.length ? `${route.passStation.length}駅経由` : "",
  ].filter(Boolean).join(" | ");
  await navigator.clipboard.writeText(lines);
}

export default function RouteResult({ routes, from: fromName, to: toName }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = async (route: Route, i: number) => {
    try {
      await copyRouteSummary(route, i, fromName, toName);
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* ignore */ }
  };

  if (routes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-3">🚃</div>
        <p className="text-sm">経路が見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {routes.map((route, i) => {
        const fare = fareLabel(route.fare?.total);
        const dep = fmtDateStr(route.departureTime);
        const arr = fmtDateStr(route.arrivalTime);
        const totalMin = (route.totaltime ?? 0) + (route.timeOther ?? 0);
        const transfers = route.transfer ?? 0;
        const badgeClass = route.badge ? (BADGE_STYLE[route.badge] ?? "bg-gray-400 text-white") : null;

        return (
          <details
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group"
          >
            <summary className="px-4 py-3.5 cursor-pointer list-none hover:bg-gray-50 transition select-none">
              {/* Row 1: 番号 + バッジ + 時刻 + 運賃 + 展開アイコン */}
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>

                {badgeClass && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${badgeClass}`}>
                    {route.badge}
                  </span>
                )}

                {/* 出発 → 到着 */}
                {dep && arr ? (
                  <div className="flex items-baseline gap-1 flex-1 min-w-0 overflow-hidden">
                    <span className="text-xl font-bold text-gray-900 tabular-nums">{dep}</span>
                    <span className="text-gray-400 shrink-0">→</span>
                    <span className="text-xl font-bold text-gray-900 tabular-nums">{arr}</span>
                    <span className="text-xs text-gray-400 ml-1 shrink-0">目安</span>
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="text-xl font-bold text-gray-800">
                      {totalMin > 0 ? `${totalMin}分` : "---"}
                    </span>
                  </div>
                )}

                {fare && (
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg shrink-0">
                    {fare}
                  </span>
                )}
                {/* コピーボタン */}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(route, i); }}
                  title="ルート情報をコピー"
                  className="text-gray-300 hover:text-blue-400 transition text-sm shrink-0 ml-1"
                >
                  {copiedIdx === i ? "✅" : "📋"}
                </button>
                <span className="text-gray-400 text-sm group-open:rotate-180 transition-transform duration-200 shrink-0">
                  ⌄
                </span>
              </div>

              {/* Row 2: 所要時間 + 乗換 + 経由駅 + 距離 */}
              <div className="flex flex-wrap items-center gap-2 pl-8 text-xs">
                {totalMin > 0 && (
                  <span className="text-gray-700 font-medium">{totalMin}分</span>
                )}
                {route.timeOther ? (
                  <span className="text-gray-400">(乗換待 {route.timeOther}分含)</span>
                ) : null}
                <span className={`px-1.5 py-0.5 rounded font-medium ${transfers === 0
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700"
                  }`}>
                  {transfers === 0 ? "🟢 直通" : `🔄 乗換${transfers}回`}
                </span>
                {route.passStation && route.passStation.length > 0 && (
                  <span className="text-gray-400">{route.passStation.length}駅経由</span>
                )}
                {route.distance ? (
                  <span className="text-gray-400">{route.distance}km</span>
                ) : null}
                {(route.timeWalk ?? 0) > 0 ? (
                  <span className="text-sky-600 font-medium bg-sky-50 px-1.5 py-0.5 rounded">🚶 徒歩{route.timeWalk}分</span>
                ) : null}
              </div>
            </summary>

            <RouteDetail route={route} fromName={fromName} toName={toName} />
          </details>
        );
      })}

      <p className="text-center text-xs text-gray-400 mt-1 px-4">
        ⚠️ 到着時刻は検索時刻からの目安です。実際の電車・号車は時刻表または駅係員にご確認ください。
      </p>
    </div>
  );
}
