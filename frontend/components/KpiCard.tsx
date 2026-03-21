import { KpiCard as KpiCardType, Theme } from "@/lib/types";

type Props = {
  card: KpiCardType;
  theme: Theme;
};

export default function KpiCard({ card, theme }: Props) {
  const isUp = card.deltaDirection !== "down";
  const deltaColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div
      className="p-4"
      style={{
        background: theme.cardBackground,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: `${theme.borderRadius}px`,
        boxShadow: theme.cardShadow,
      }}
    >
      <div className="text-[32px] font-extrabold leading-tight" style={{ color: theme.textColor }}>
        {card.formattedValue}
      </div>
      <div className="mt-1 text-sm" style={{ color: theme.subTextColor }}>
        {card.label}
      </div>
      <div
        className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
        style={{ background: `${deltaColor}22`, color: deltaColor }}
      >
        <span>{isUp ? "▲" : "▼"}</span>
        <span>{Math.abs(card.delta ?? 0)}%</span>
        <span>{card.deltaLabel ?? "vs previous"}</span>
      </div>
    </div>
  );
}
