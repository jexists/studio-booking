// 작품 6단계 막대. 지난·현재 단계는 primary, 남은 단계는 테두리 색, 파손이면 오류 색.
export const STAGES = [
  { key: "FORMING", label: "성형" },
  { key: "BISQUE", label: "초벌" },
  { key: "GLAZED", label: "유약" },
  { key: "GLAZE_FIRED", label: "재벌" },
  { key: "DONE", label: "완성" },
  { key: "PICKED_UP", label: "수령" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export function stageLabel(key: StageKey) {
  return STAGES.find((s) => s.key === key)?.label ?? key;
}

export function StageBar({ stage, broken = false }: { stage: StageKey; broken?: boolean }) {
  const current = STAGES.findIndex((s) => s.key === stage);
  return (
    <div role="img" aria-label={`진행 단계: ${stageLabel(stage)}${broken ? " (파손)" : ""}`}>
      <div className="flex gap-1">
        {STAGES.map((s, i) => (
          <div
            key={s.key}
            className={`h-2 flex-1 rounded-sm ${i <= current ? (broken ? "bg-error" : "bg-primary") : "bg-line"}`}
          />
        ))}
      </div>
      <div className="mt-2 flex text-xs">
        {STAGES.map((s, i) => (
          <span
            key={s.key}
            className={`flex-1 text-center ${i === current ? "font-semibold text-ink" : "text-muted"}`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
