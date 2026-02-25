import { type DiainfoItem } from "../api";

interface Props {
  items: DiainfoItem[];
  loading?: boolean;
}

const STATUS_META: Record<
  string,
  { label: string; bg: string; dot: string; text: string; border: string }
> = {
  NORMAL: {
    label: "平常",
    bg: "bg-green-50",
    dot: "bg-green-400",
    text: "text-green-700",
    border: "border-green-100",
  },
  DELAY: {
    label: "遅延",
    bg: "bg-yellow-50",
    dot: "bg-yellow-400",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  STOP: {
    label: "運転見合",
    bg: "bg-red-50",
    dot: "bg-red-500",
    text: "text-red-700",
    border: "border-red-200",
  },
  PARTIAL: {
    label: "一部遅延",
    bg: "bg-orange-50",
    dot: "bg-orange-400",
    text: "text-orange-700",
    border: "border-orange-200",
  },
};

function statusMeta(status?: string) {
  return (
    STATUS_META[status?.toUpperCase() ?? ""] ??
    STATUS_META["NORMAL"]
  );
}

/** "YYYY-MM-DD HH:mm:ss" → "HH:mm 更新" */
function fmtUpdateDate(s?: string): string {
  if (!s) return "";
  const m = s.match(/(\d{2}:\d{2})/);
  return m ? `${m[1]} 更新` : "";
}

/** 広域情報のための副題 (e.g. "関東エリア" "JR東日本") */
function areaSubtitle(item: DiainfoItem): string {
  if (item.railName && !item.isAreaLevel) return "";
  const parts: string[] = [];
  if (item.railAreaName) parts.push(`${item.railAreaName}エリア`);
  if (item.railwayTypeName && !item.railAreaName) parts.push(item.railwayTypeName);
  return parts.join(" ");
}

export default function DiainfoPanel({ items, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        運行情報なし
      </div>
    );
  }

  const abnormal = items.filter(
    (t) => t.status && t.status.toUpperCase() !== "NORMAL",
  );
  const normal = items.filter(
    (t) => !t.status || t.status.toUpperCase() === "NORMAL",
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 遅延・運転見合わせ */}
      {abnormal.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            遅延・運転見合わせ ({abnormal.length})
          </h3>
          <div className="flex flex-col gap-2">
            {abnormal.map((item, i) => {
              const meta = statusMeta(item.status);
              const sub = areaSubtitle(item);
              const upd = fmtUpdateDate(item.updateDate);
              return (
                <div
                  key={i}
                  className={`${meta.bg} border ${meta.border} rounded-xl px-4 py-3 flex items-start gap-3`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${meta.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`font-semibold text-sm ${meta.text}`}>
                          {item.railName ?? item.railId ?? "不明路線"}
                        </span>
                        <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded ${meta.bg} ${meta.text} border ${meta.border}`}>
                          {meta.label}
                        </span>
                      </div>
                      {upd && (
                        <span className="text-xs text-gray-400 shrink-0">{upd}</span>
                      )}
                    </div>
                    {/* 広域情報の場合: エリア・路線種別を副題として表示 */}
                    {sub && (
                      <p className="text-xs text-gray-500 mt-0.5">📍 {sub}</p>
                    )}
                    {item.isAreaLevel && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        ⚠️ {item.railwayTypeName ?? "列車"}の一部に影響が出ています
                      </p>
                    )}
                    {item.message && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {abnormal.length === 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
          <span className="text-sm text-green-700 font-medium">現在、主要路線に遅延情報はありません</span>
        </div>
      )}

      {/* 平常運転 */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          平常運転 ({normal.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {normal.map((item, i) => (
            <div
              key={i}
              className="bg-green-50 rounded-xl px-3 py-2.5 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <span className="text-sm text-green-800 font-medium truncate">
                {item.railName ?? item.railId ?? "不明"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
