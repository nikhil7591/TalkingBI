import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

import AreaChartComp from "@/components/charts/AreaChartComp";
import BarChartComp from "@/components/charts/BarChartComp";
import DonutChartComp from "@/components/charts/DonutChartComp";
import GaugeComp from "@/components/charts/GaugeComp";
import HeatmapComp from "@/components/charts/HeatmapComp";
import LineChartComp from "@/components/charts/LineChartComp";
import ScatterComp from "@/components/charts/ScatterComp";
import SparklineComp from "@/components/charts/SparklineComp";
import FunnelChartComp from "@/components/charts/FunnelChartComp";
import RadarChartComp from "@/components/charts/RadarChartComp";
import SunburstChartComp from "@/components/charts/SunburstChartComp";
import PieChartComp from "@/components/charts/PieChartComp";
import BubbleChartComp from "@/components/charts/BubbleChartComp";
import PolarBarChartComp from "@/components/charts/PolarBarChartComp";
import SankeyChartComp from "@/components/charts/SankeyChartComp";
import PictorialBarChartComp from "@/components/charts/PictorialBarChartComp";
import RoseChartComp from "@/components/charts/RoseChartComp";
import ComboChartComp from "@/components/charts/ComboChartComp";
import RadialBarChartComp from "@/components/charts/RadialBarChartComp";
import StepLineChartComp from "@/components/charts/StepLineChartComp";
import NightingaleChartComp from "@/components/charts/NightingaleChartComp";
import TreemapComp from "@/components/charts/TreemapComp";
import WaterfallComp from "@/components/charts/WaterfallComp";

type Props = {
  chart: Chart;
  theme: Theme;
};

export default function ChartRenderer({ chart, theme }: Props) {
  const [hoverTick, setHoverTick] = useState(0);
  const hasData = Array.isArray(chart.data) && chart.data.length > 0;
  const sourceType = (chart.type || "bar").toLowerCase();
  const safeChart = hasData
    ? chart
    : sourceType === "gauge" || sourceType === "radial-bar"
      ? {
          ...chart,
          type: sourceType,
          title: `${chart.title || "Chart"} (No Data)`,
          yAxis: { field: "value", label: "Value" },
          data: [{ value: 0 }],
        }
      : {
          ...chart,
          type: "bar",
          title: `${chart.title || "Chart"} (No Data)` ,
          xAxis: { field: "label", label: "Status" },
          yAxis: { field: "value", label: "Value" },
          data: [{ label: "No Data", value: 0 }],
        };
  const type = (safeChart.type || "bar").toLowerCase();

  const enhancedOption = useMemo(() => {
    if (!safeChart.echartsOption) {
      return null;
    }

    const cloned = JSON.parse(JSON.stringify(safeChart.echartsOption)) as Record<string, any>;
    cloned.animation = true;
    cloned.animationDurationUpdate = 700;
    cloned.animationEasingUpdate = "cubicOut";

    if (hoverTick > 0 && Array.isArray(cloned.series) && cloned.series.length > 0) {
      const firstSeries = cloned.series[0];
      if (firstSeries?.type === "gauge" && Array.isArray(firstSeries.data) && firstSeries.data[0]) {
        const currentValue = Number(firstSeries.data[0].value || 0);
        firstSeries.data[0].value = Math.max(0, Math.min(100, currentValue + 6));
      }
    }

    return cloned;
  }, [safeChart.echartsOption, hoverTick]);

  if (enhancedOption) {
    return (
      <div onMouseEnter={() => setHoverTick((prev) => prev + 1)} className="h-full w-full">
        <ReactECharts option={enhancedOption} style={{ width: "100%", height: "100%" }} notMerge />
      </div>
    );
  }

  if (type === "line") return <LineChartComp chart={safeChart} theme={theme} />;
  if (type === "bar") return <BarChartComp chart={safeChart} theme={theme} horizontal={false} />;
  if (type === "horizontal-bar") return <BarChartComp chart={safeChart} theme={theme} horizontal />;
  if (type === "stacked-bar") return <BarChartComp chart={safeChart} theme={theme} stacked />;
  if (type === "donut") return <DonutChartComp chart={safeChart} theme={theme} />;
  if (type === "area") return <AreaChartComp chart={safeChart} theme={theme} />;
  if (type === "gauge") return <GaugeComp chart={safeChart} theme={theme} />;
  if (type === "treemap") return <TreemapComp chart={safeChart} theme={theme} />;
  if (type === "heatmap") return <HeatmapComp chart={safeChart} theme={theme} />;
  if (type === "scatter") return <ScatterComp chart={safeChart} theme={theme} />;
  if (type === "waterfall") return <WaterfallComp chart={safeChart} theme={theme} />;
  if (type === "sparkline") return <SparklineComp chart={safeChart} theme={theme} />;
  if (type === "funnel") return <FunnelChartComp chart={safeChart} theme={theme} />;
  if (type === "radar") return <RadarChartComp chart={safeChart} theme={theme} />;
  if (type === "sunburst") return <SunburstChartComp chart={safeChart} theme={theme} />;
  if (type === "pie") return <PieChartComp chart={safeChart} theme={theme} />;
  if (type === "bubble") return <BubbleChartComp chart={safeChart} theme={theme} />;
  if (type === "polar-bar") return <PolarBarChartComp chart={safeChart} theme={theme} />;
  if (type === "sankey") return <SankeyChartComp chart={safeChart} theme={theme} />;
  if (type === "pictorial-bar") return <PictorialBarChartComp chart={safeChart} theme={theme} />;
  if (type === "rose") return <RoseChartComp chart={safeChart} theme={theme} />;
  if (type === "combo") return <ComboChartComp chart={safeChart} theme={theme} />;
  if (type === "radial-bar") return <RadialBarChartComp chart={safeChart} theme={theme} />;
  if (type === "step-line") return <StepLineChartComp chart={safeChart} theme={theme} />;
  if (type === "nightingale") return <NightingaleChartComp chart={safeChart} theme={theme} />;

  // Fallback for unsupported chart types.
  return <BarChartComp chart={safeChart} theme={theme} horizontal={false} />;
}
