/**
 * 首页空状态组件
 * 展示产品入口、雷达主视觉和可点击的示例问数问题
 */
import {
  ArrowRight,
  ArrowUpRight,
  LineChart,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

type EmptyStateProps = {
  examples: string[];
  onUseExample: (example: string) => void;
};

const highlights = [
  { label: "混合检索", en: "HYBRID RETRIEVAL", icon: Search },
  { label: "SQL 闭环", en: "SQL PIPELINE", icon: LineChart },
  { label: "电商数仓", en: "DATA WAREHOUSE", icon: ShoppingBag },
];

function RadarVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_70%)]" />
      <div className="absolute inset-0 rounded-full border border-accent/20" />
      <div className="absolute inset-[12%] rounded-full border border-accent/15" />
      <div className="absolute inset-[26%] rounded-full border border-accent/10" />
      <div className="absolute inset-[40%] rounded-full border border-dashed border-accent/10" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      <div className="radar-sweep absolute inset-0 animate-sweep rounded-full" />
      <div className="absolute inset-[7%] animate-orbit rounded-full border border-dashed border-accent/10" />

      <div className="absolute left-[26%] top-[34%]">
        <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon shadow-[0_0_12px_#34f5a8]" />
        <span className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full border border-neon/25" />
      </div>
      <div className="absolute left-[68%] top-[24%]">
        <span className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_#22d3ee]" />
        <span className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full border border-accent/30 [animation-delay:0.6s]" />
      </div>
      <div className="absolute left-[58%] top-[74%]">
        <span className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-iris shadow-[0_0_12px_#8b5cf6]" />
        <span className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full border border-iris/30 [animation-delay:1.2s]" />
      </div>

      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/20 bg-accent/5" />
      <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_24px_#22d3ee]" />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[8px] tracking-[0.3em] text-dim/40">
        SCANNING
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 font-mono text-[8px] tracking-[0.3em] text-dim/30">
        LIVE
      </div>
    </div>
  );
}

export function EmptyState({ examples, onUseExample }: EmptyStateProps) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-10 lg:px-8">
      <div className="my-auto w-full">
      <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1 font-mono text-[10px] tracking-[0.24em] text-accent">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            SHOPKEEPER AGENT
          </div>

          <h1 className="mt-5 font-display text-[46px] font-semibold leading-[1.04] tracking-tight sm:text-6xl">
            <span className="text-gradient">电商问数</span>
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-[0.2em] text-dim/70">
            <span>NATURAL LANGUAGE</span>
            <ArrowRight className="h-3 w-3 text-accent/60" aria-hidden="true" />
            <span>SQL</span>
            <ArrowRight className="h-3 w-3 text-accent/60" aria-hidden="true" />
            <span>INSIGHT</span>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-7 text-dim">
            用自然语言提问，自动完成关键词抽取、字段召回、SQL 生成与执行，给出可追溯的数据结果。
          </p>
        </div>

        <div className="hidden xl:block">
          <RadarVisual />
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between border-b border-line/50 pb-3">
          <span className="font-mono text-[10px] tracking-[0.28em] text-dim/60">
            SAMPLE QUERIES
          </span>
          <span className="font-mono text-[10px] text-dim/40">
            {String(examples.length).padStart(2, "0")}
          </span>
        </div>

        <div className="mt-3 grid gap-2.5 md:grid-cols-2">
          {examples.map((example, index) => (
            <button
              key={example}
              type="button"
              onClick={() => onUseExample(example)}
              className="group relative overflow-hidden rounded-xl border border-line/60 bg-white/[0.015] px-4 py-3.5 pr-10 text-left transition hover:border-accent/40 hover:bg-accent/[0.05]"
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-accent/60">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-1.5 block text-[13.5px] leading-6 text-dim transition group-hover:text-fg">
                {example}
              </span>
              <ArrowUpRight
                className="absolute right-3.5 top-3.5 h-4 w-4 text-dim/30 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
        {highlights.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="group relative overflow-hidden rounded-xl border border-line/60 bg-white/[0.015] px-4 py-3.5 transition hover:border-accent/30 hover:bg-accent/[0.04]"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[9px] text-dim/40">0{index + 1}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-fg/90">{item.label}</div>
              <div className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-dim/50">
                {item.en}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
