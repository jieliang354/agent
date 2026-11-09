/**
 * 智能体执行流程图组件
 * 阶段化 Live Pipeline：默认折叠为阶段概览，展开后按「解析 / 召回 / 生成 / 校验执行」四阶段展示，
 * 完整 LangGraph 拓扑保留在「全图」弹窗中。
 */
import {
  Check,
  ChevronDown,
  Circle,
  GitBranch,
  LoaderCircle,
  Maximize2,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/format";
import type { ProgressStatus, StepState } from "../types/agent";

type FlowStatus = ProgressStatus | "pending";

type GraphNode = {
  step: string;
  x: number;
  y: number;
  w?: number;
};

type Phase = {
  id: "parse" | "recall" | "build" | "verify";
  index: string;
  title: string;
  en: string;
  steps: string[];
};

type PhaseInfo = {
  status: FlowStatus;
  hasRunning: boolean;
  done: number;
  total: number;
  duration: number | null;
  nodes: Array<{ step: string; status: FlowStatus; state?: StepState }>;
};

const graphNodes: GraphNode[] = [
  { step: "抽取关键词", x: 410, y: 20 },
  { step: "召回字段信息", x: 150, y: 112 },
  { step: "召回指标信息", x: 410, y: 112 },
  { step: "召回字段取值", x: 670, y: 112 },
  { step: "合并召回信息", x: 410, y: 214 },
  { step: "过滤指标信息", x: 290, y: 318 },
  { step: "过滤表信息", x: 530, y: 318 },
  { step: "添加额外上下文", x: 410, y: 422, w: 176 },
  { step: "生成SQL", x: 410, y: 526 },
  { step: "校验SQL", x: 410, y: 630 },
  { step: "校正SQL", x: 670, y: 630 },
  { step: "执行SQL", x: 410, y: 724 },
];

const graphEdges: Array<{ d: string; from: string; to: string }> = [
  { d: "M410 60 L410 84 L150 84 L150 106", from: "抽取关键词", to: "召回字段信息" },
  { d: "M410 60 L410 106", from: "抽取关键词", to: "召回指标信息" },
  { d: "M410 60 L410 84 L670 84 L670 106", from: "抽取关键词", to: "召回字段取值" },
  { d: "M150 152 L150 178 L410 178 L410 208", from: "召回字段信息", to: "合并召回信息" },
  { d: "M410 152 L410 208", from: "召回指标信息", to: "合并召回信息" },
  { d: "M670 152 L670 178 L410 178 L410 208", from: "召回字段取值", to: "合并召回信息" },
  { d: "M410 254 L410 282 L290 282 L290 312", from: "合并召回信息", to: "过滤指标信息" },
  { d: "M410 254 L410 282 L530 282 L530 312", from: "合并召回信息", to: "过滤表信息" },
  { d: "M290 358 L290 386 L410 386 L410 416", from: "过滤指标信息", to: "添加额外上下文" },
  { d: "M530 358 L530 386 L410 386 L410 416", from: "过滤表信息", to: "添加额外上下文" },
  { d: "M410 462 L410 520", from: "添加额外上下文", to: "生成SQL" },
  { d: "M410 566 L410 624", from: "生成SQL", to: "校验SQL" },
  { d: "M410 670 L410 718", from: "校验SQL", to: "执行SQL" },
  { d: "M488 650 L586 650", from: "校验SQL", to: "校正SQL" },
  { d: "M670 670 L670 696 L410 696 L410 718", from: "校正SQL", to: "执行SQL" },
];

const branchLabels = [
  { text: "有误", x: 530, y: 642 },
  { text: "无误", x: 366, y: 704 },
];

const phases: Phase[] = [
  {
    id: "parse",
    index: "01",
    title: "解析",
    en: "PARSE",
    steps: ["抽取关键词"],
  },
  {
    id: "recall",
    index: "02",
    title: "召回",
    en: "RECALL",
    steps: ["召回字段信息", "召回指标信息", "召回字段取值", "合并召回信息"],
  },
  {
    id: "build",
    index: "03",
    title: "生成",
    en: "GENERATE",
    steps: ["过滤指标信息", "过滤表信息", "添加额外上下文", "生成SQL"],
  },
  {
    id: "verify",
    index: "04",
    title: "校验执行",
    en: "VERIFY & RUN",
    steps: ["校验SQL", "校正SQL", "执行SQL"],
  },
];

const stepLabels: Record<string, string> = {
  生成SQL: "生成 SQL",
  校验SQL: "校验 SQL",
  校正SQL: "校正 SQL",
  执行SQL: "执行 SQL",
};

// 校正 SQL 是「校验有误」时才触发的可选分支，未触发时不计入必达进度
const optionalSteps = new Set(["校正SQL"]);

function isStepRelevant(step: string, statusMap: Record<string, StepState>) {
  return !optionalSteps.has(step) || statusMap[step] != null;
}

function labelFor(step: string) {
  return stepLabels[step] ?? step;
}

function getStatusMap(steps: StepState[]) {
  return steps.reduce<Record<string, StepState>>((map, item) => {
    map[item.step] = item;
    return map;
  }, {});
}

function statusFor(step: string, map: Record<string, StepState>): FlowStatus {
  return map[step]?.status ?? "pending";
}

function statusText(status: FlowStatus, hasRunning: boolean) {
  if (status === "success") return "已完成";
  if (status === "error") return "异常";
  if (status === "running") return hasRunning ? "运行中" : "执行中";
  return "待执行";
}

function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) return `${Math.max(1, Math.round(milliseconds))}ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${rest}s`;
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stepDuration(state: StepState | undefined, now: number) {
  if (!state?.startedAt) return null;
  const end = state.finishedAt ?? (state.status === "running" ? now : null);
  if (end == null) return null;
  return Math.max(0, end - state.startedAt);
}

function getPhaseInfo(
  phase: Phase,
  statusMap: Record<string, StepState>,
  now: number,
): PhaseInfo {
  const relevantSteps = phase.steps.filter((step) => isStepRelevant(step, statusMap));
  const nodes = relevantSteps.map((step) => ({
    step,
    status: statusFor(step, statusMap),
    state: statusMap[step],
  }));

  const done = nodes.filter((node) => node.status === "success").length;
  const hasRunning = nodes.some((node) => node.status === "running");
  const status: FlowStatus = nodes.some((node) => node.status === "error")
    ? "error"
    : hasRunning
      ? "running"
      : done === nodes.length
        ? "success"
        : done > 0
          ? "running"
          : "pending";

  const starts = nodes
    .map((node) => node.state?.startedAt)
    .filter((value): value is number => typeof value === "number");
  const ends = nodes
    .map((node) => node.state?.finishedAt)
    .filter((value): value is number => typeof value === "number");

  const start = starts.length > 0 ? Math.min(...starts) : null;
  const end =
    status === "success" || status === "error"
      ? ends.length > 0
        ? Math.max(...ends)
        : null
      : start != null
        ? now
        : null;
  const duration = start != null && end != null ? Math.max(0, end - start) : null;

  return { status, hasRunning, done, total: nodes.length, duration, nodes };
}

function NodeIcon({ status }: { status: FlowStatus }) {
  if (status === "running") {
    return <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />;
  }

  if (status === "success") {
    return <Check className="h-3 w-3" aria-hidden="true" />;
  }

  if (status === "error") {
    return <X className="h-3 w-3" aria-hidden="true" />;
  }

  return <Circle className="h-2.5 w-2.5" aria-hidden="true" />;
}

function StatusLabel({
  status,
  hasRunning,
  className,
}: {
  status: FlowStatus;
  hasRunning: boolean;
  className?: string;
}) {
  const color =
    status === "success"
      ? "text-neon"
      : status === "error"
        ? "text-danger"
        : status === "running"
          ? "text-accent"
          : "text-dim/45";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 font-mono text-[9px] tracking-[0.12em]",
        color,
        className,
      )}
    >
      {status === "running" && hasRunning ? (
        <LoaderCircle className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "success" && "bg-neon",
            status === "error" && "bg-danger",
            status === "running" && "bg-accent",
            status === "pending" && "bg-line",
          )}
        />
      )}
      {statusText(status, hasRunning)}
    </span>
  );
}

function NodePill({
  step,
  status,
  state,
  now,
  activeRef,
}: {
  step: string;
  status: FlowStatus;
  state?: StepState;
  now: number;
  activeRef?: Ref<HTMLDivElement>;
}) {
  const duration = stepDuration(state, now);
  const showDuration = duration != null && duration >= 50;
  const running = status === "running";
  const title = `${labelFor(step)} · ${statusText(status, running)}${
    showDuration ? ` · ${formatDuration(duration)}` : ""
  }`;

  return (
    <div
      ref={running ? activeRef : undefined}
      title={title}
      className={cn(
        "relative flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 text-[11.5px] backdrop-blur transition sm:text-[12px]",
        status === "pending" && "border-line/60 bg-white/[0.015] text-dim/65",
        status === "running" && "border-accent/55 bg-accent/[0.08] text-fg shadow-glow",
        status === "success" && "border-neon/25 bg-neon/[0.05] text-fg/80",
        status === "error" && "border-danger/50 bg-danger/10 text-danger",
      )}
    >
      {running && (
        <span
          className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-lg border border-accent/40"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
          status === "pending" && "border-line/60 bg-white/[0.02] text-dim/45",
          status === "running" && "border-accent/40 bg-accent/15 text-accent",
          status === "success" && "border-neon/25 bg-neon/10 text-neon",
          status === "error" && "border-danger/40 bg-danger/10 text-danger",
        )}
      >
        <NodeIcon status={status} />
      </span>
      <span className="min-w-0 flex-1 truncate">{labelFor(step)}</span>
      {showDuration && (
        <span className="shrink-0 font-mono text-[9px] text-dim/40">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}

function ArrowConnector({ active }: { active?: boolean }) {
  return (
    <div className="mx-auto flex h-5 w-4 flex-col items-center" aria-hidden="true">
      <span className={cn("w-px flex-1", active ? "bg-accent/55" : "bg-line/60")} />
      <ChevronDown
        className={cn("-mt-1 h-2.5 w-2.5", active ? "text-accent/60" : "text-dim/30")}
      />
    </div>
  );
}

function MergeConnector({ count, active }: { count: number; active?: boolean }) {
  const centers = Array.from(
    { length: count },
    (_, index) => ((index + 0.5) / count) * 100,
  );

  return (
    <div
      className="relative mx-auto my-1 hidden h-5 w-full max-w-[620px] sm:block"
      aria-hidden="true"
    >
      {centers.map((center) => (
        <span
          key={center}
          className="absolute top-0 h-2 w-px bg-line/60"
          style={{ left: `${center}%` }}
        />
      ))}
      <span
        className="absolute top-2 h-px bg-line/60"
        style={{
          left: `${centers[0]}%`,
          right: `${100 - centers[centers.length - 1]}%`,
        }}
      />
      <span
        className={cn(
          "absolute left-1/2 top-2 h-2.5 w-px",
          active ? "bg-accent/55" : "bg-line/60",
        )}
      />
      <ChevronDown
        className={cn(
          "absolute left-1/2 top-3.5 h-2.5 w-2.5 -translate-x-1/2",
          active ? "text-accent/55" : "text-dim/30",
        )}
      />
    </div>
  );
}

function ParallelFrame({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line/50 bg-white/[0.01] p-2">
      <div className="mb-1.5 flex items-center justify-between px-1 font-mono text-[8px] tracking-[0.18em] text-dim/35">
        <span>PARALLEL</span>
        <span>×{count}</span>
      </div>
      <div
        className={cn(
          "grid gap-1.5",
          count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function PhaseNodes({
  phase,
  info,
  now,
  activeRef,
}: {
  phase: Phase;
  info: PhaseInfo;
  now: number;
  activeRef: Ref<HTMLDivElement>;
}) {
  const node = (step: string) => {
    const entry = info.nodes.find((item) => item.step === step);
    return (
      <NodePill
        step={step}
        status={entry?.status ?? "pending"}
        state={entry?.state}
        now={now}
        activeRef={activeRef}
      />
    );
  };

  if (phase.id === "parse") {
    return <div className="max-w-[240px]">{node("抽取关键词")}</div>;
  }

  if (phase.id === "recall") {
    return (
      <div className="max-w-[620px]">
        <ParallelFrame count={3}>
          {["召回字段信息", "召回指标信息", "召回字段取值"].map((step) => (
            <div key={step}>{node(step)}</div>
          ))}
        </ParallelFrame>
        <div className="sm:hidden">
          <ArrowConnector active={info.hasRunning} />
        </div>
        <MergeConnector count={3} active={info.hasRunning} />
        <div className="mx-auto max-w-[220px]">{node("合并召回信息")}</div>
      </div>
    );
  }

  if (phase.id === "build") {
    return (
      <div className="max-w-[620px]">
        <div className="mx-auto max-w-[460px]">
          <ParallelFrame count={2}>
            {["过滤指标信息", "过滤表信息"].map((step) => (
              <div key={step}>{node(step)}</div>
            ))}
          </ParallelFrame>
          <div className="sm:hidden">
            <ArrowConnector active={info.hasRunning} />
          </div>
          <MergeConnector count={2} active={info.hasRunning} />
        </div>
        <div className="mx-auto max-w-[240px]">{node("添加额外上下文")}</div>
        <ArrowConnector active={info.hasRunning} />
        <div className="mx-auto max-w-[240px]">{node("生成SQL")}</div>
      </div>
    );
  }

  const correction = info.nodes.find((entry) => entry.step === "校正SQL");
  const correctionTriggered = correction != null;

  return (
    <div className="max-w-[520px]">
      <div className="max-w-[240px]">{node("校验SQL")}</div>
      <div className="flex flex-wrap items-center gap-2 pl-3 pt-1">
        <GitBranch className="h-3 w-3 text-dim/35" aria-hidden="true" />
        <span className="font-mono text-[9px] text-dim/45">有误</span>
        <span className="text-dim/25">→</span>
        {correctionTriggered ? (
          <div className="min-w-[180px]">{node("校正SQL")}</div>
        ) : (
          <span className="rounded-md border border-dashed border-line/60 px-2 py-1 font-mono text-[9px] text-dim/35">
            校正 SQL · 未触发
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 pl-3 font-mono text-[9px] text-dim/40">
        <span className="h-4 w-px bg-line/60" aria-hidden="true" />
        无误 ↓
      </div>
      <div className="max-w-[240px]">{node("执行SQL")}</div>
    </div>
  );
}

function PhaseBlock({
  phase,
  info,
  isLast,
  now,
  activeRef,
}: {
  phase: Phase;
  info: PhaseInfo;
  isLast: boolean;
  now: number;
  activeRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
      <div className="relative flex justify-center">
        {!isLast && (
          <span
            className="absolute bottom-0 left-1/2 top-6 w-px -translate-x-1/2 bg-gradient-to-b from-line/70 to-line/20"
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "relative z-10 mt-0.5 grid h-5 w-5 place-items-center rounded-full border",
            info.status === "success" && "border-neon/30 bg-neon/10 text-neon",
            info.status === "running" && "border-accent/40 bg-accent/10 text-accent",
            info.status === "error" && "border-danger/40 bg-danger/10 text-danger",
            info.status === "pending" && "border-line/70 bg-space text-dim/40",
          )}
        >
          {info.status === "success" ? (
            <Check className="h-2.5 w-2.5" aria-hidden="true" />
          ) : info.status === "error" ? (
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          ) : info.status === "running" ? (
            info.hasRunning ? (
              <LoaderCircle className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
            ) : (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            )
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-line" />
          )}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[9px] tracking-[0.12em] text-dim/40">
            {phase.index}
          </span>
          <span className="text-[13px] font-medium text-fg">{phase.title}</span>
          <span className="hidden font-mono text-[8px] tracking-[0.18em] text-dim/30 sm:inline">
            {phase.en}
          </span>
          <StatusLabel status={info.status} hasRunning={info.hasRunning} />
          {info.duration != null && info.duration > 0 && (
            <span className="ml-auto font-mono text-[10px] text-dim/45">
              {formatDuration(info.duration)}
            </span>
          )}
        </div>
        <div className="mt-2.5">
          <PhaseNodes phase={phase} info={info} now={now} activeRef={activeRef} />
        </div>
      </div>
    </div>
  );
}

function FlowNodeCard({ node, status }: { node: GraphNode; status: FlowStatus }) {
  const width = node.w ?? 156;

  return (
    <div
      className="absolute -translate-x-1/2"
      style={{ left: node.x, top: node.y, width }}
    >
      <div
        title={`${labelFor(node.step)} · ${statusText(status, status === "running")}`}
        className={cn(
          "relative flex h-10 items-center gap-2 rounded-lg border px-2.5 text-[12.5px] font-medium backdrop-blur transition",
          status === "pending" && "border-line/70 bg-space/60 text-dim",
          status === "running" && "border-accent/50 bg-accent/10 text-fg shadow-glow",
          status === "success" && "border-neon/30 bg-neon/[0.06] text-fg",
          status === "error" && "border-danger/50 bg-danger/10 text-danger",
        )}
      >
        {status === "running" && (
          <span
            className="pointer-events-none absolute inset-0 animate-pulse-ring rounded-lg border border-accent/40"
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
            status === "pending" && "border-line/70 bg-white/[0.02] text-dim/60",
            status === "running" && "border-accent/40 bg-accent/15 text-accent",
            status === "success" && "border-neon/30 bg-neon/10 text-neon",
            status === "error" && "border-danger/40 bg-danger/10 text-danger",
          )}
        >
          <NodeIcon status={status} />
        </span>
        <span className="min-w-0 flex-1 truncate">{labelFor(node.step)}</span>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", className)} />
      {label}
    </span>
  );
}

function FullGraph({ statusMap }: { statusMap: Record<string, StepState> }) {
  const uid = useId().replace(/:/g, "");
  const markerId = (kind: string) => `flow-arrow-${kind}-${uid}`;

  return (
    <div className="relative mx-auto h-[780px] w-[820px] rounded-lg border border-line/50 bg-[linear-gradient(rgba(120,180,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(120,180,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 820 780"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id={markerId("dim")}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="6"
            refY="4"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="rgba(120,180,255,0.35)" />
          </marker>
          <marker
            id={markerId("active")}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="6"
            refY="4"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="#22d3ee" />
          </marker>
          <marker
            id={markerId("done")}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="6"
            refY="4"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="#34f5a8" />
          </marker>
        </defs>

        {graphEdges.map((edge) => {
          const fromStatus = statusFor(edge.from, statusMap);
          const toStatus = statusFor(edge.to, statusMap);
          const isRunning = fromStatus === "running" || toStatus === "running";
          const isDone = fromStatus === "success" && toStatus === "success";
          const isReached = fromStatus === "success" && !isDone && !isRunning;

          const marker = isRunning ? "active" : isDone ? "done" : "dim";
          const stroke = isRunning
            ? "#22d3ee"
            : isDone
              ? "rgba(52,245,168,0.48)"
              : isReached
                ? "rgba(34,211,238,0.28)"
                : "rgba(120,180,255,0.12)";

          return (
            <path
              key={edge.d}
              d={edge.d}
              stroke={stroke}
              strokeWidth={isRunning ? 1.8 : 1.4}
              strokeLinecap="round"
              strokeDasharray={isRunning ? "7 9" : undefined}
              markerEnd={`url(#${markerId(marker)})`}
              className={cn(isRunning && "animate-flow")}
            />
          );
        })}

        {branchLabels.map((label) => (
          <text
            key={label.text}
            x={label.x}
            y={label.y}
            fill="rgba(143,166,191,0.65)"
            fontFamily="JetBrains Mono, Consolas, monospace"
            fontSize="11"
            fontWeight="500"
          >
            {label.text}
          </text>
        ))}
      </svg>

      {graphNodes.map((node) => (
        <FlowNodeCard
          key={node.step}
          node={node}
          status={statusFor(node.step, statusMap)}
        />
      ))}
    </div>
  );
}

function GraphModal({
  statusMap,
  onClose,
  closeRef,
}: {
  statusMap: Record<string, StepState>;
  onClose: () => void;
  closeRef: Ref<HTMLButtonElement>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-space/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="完整执行图"
      onMouseDown={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line/70 bg-deep shadow-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-accent/25 bg-accent/10 text-accent">
              <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-fg">完整执行图</div>
              <div className="font-mono text-[9px] tracking-[0.18em] text-dim/50">
                LANGGRAPH · 12 NODES
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-3 font-mono text-[9px] text-dim/50 sm:flex">
              <LegendDot className="bg-line" label="待执行" />
              <LegendDot className="bg-accent" label="运行中" />
              <LegendDot className="bg-neon" label="已完成" />
              <LegendDot className="bg-danger" label="异常" />
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md border border-line/60 bg-white/[0.02] text-dim transition hover:border-accent/40 hover:text-fg"
              title="关闭"
              aria-label="关闭"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <FullGraph statusMap={statusMap} />
        </div>
      </div>
    </div>
  );
}

export function StepRail({ steps = [] }: { steps?: StepState[] }) {
  const [expanded, setExpanded] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const activeRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const uid = useId().replace(/:/g, "");

  const hasRunning = steps.some((item) => item.status === "running");
  const activeStep = steps.find((item) => item.status === "running")?.step ?? null;

  useEffect(() => {
    if (!hasRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [hasRunning]);

  useEffect(() => {
    if (!expanded) return;
    const container = timelineRef.current;
    const node = activeRef.current;
    if (!container || !node) return;

    const containerRect = container.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const isOutside =
      nodeRect.top < containerRect.top + 8 || nodeRect.bottom > containerRect.bottom - 8;

    if (isOutside) {
      container.scrollTo({
        top: Math.max(0, container.scrollTop + nodeRect.top - containerRect.top - 16),
        behavior: "smooth",
      });
    }
  }, [expanded, activeStep]);

  useEffect(() => {
    if (!graphOpen) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGraphOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [graphOpen]);

  if (steps.length === 0) return null;

  const statusMap = getStatusMap(steps);
  const relevantGraphNodes = graphNodes.filter((node) =>
    isStepRelevant(node.step, statusMap),
  );
  const total = relevantGraphNodes.length;
  const doneCount = relevantGraphNodes.filter(
    (node) => statusMap[node.step]?.status === "success",
  ).length;

  const starts = steps
    .map((item) => item.startedAt)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const ends = steps
    .map((item) => item.finishedAt ?? (item.status === "running" ? now : null))
    .filter((value): value is number => typeof value === "number");
  const totalStart = starts.length > 0 ? Math.min(...starts) : null;
  const totalEnd = ends.length > 0 ? Math.max(...ends) : null;
  const totalDuration =
    totalStart != null && totalEnd != null ? Math.max(0, totalEnd - totalStart) : null;

  const statuses = steps.map((item) => item.status);
  const overallStatus: FlowStatus = statuses.includes("error")
    ? "error"
    : statuses.includes("running")
      ? "running"
      : doneCount === total
        ? "success"
        : doneCount > 0
          ? "running"
          : "pending";
  const overallRunning = statuses.includes("running");

  const phaseInfos = phases.map((phase) => ({
    phase,
    info: getPhaseInfo(phase, statusMap, now),
  }));

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-line/70 bg-space/40">
      <div className="px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-accent/25 bg-accent/10 text-accent">
              <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="shrink-0 text-sm font-medium text-fg">执行流程</span>
            <span className="hidden font-mono text-[9px] tracking-[0.2em] text-dim/45 sm:inline">
              PIPELINE
            </span>
            <StatusLabel status={overallStatus} hasRunning={overallRunning} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[11px] text-dim/70">
              <span className={doneCount === total ? "text-neon" : "text-accent"}>
                {doneCount}
              </span>
              <span className="mx-0.5 text-dim/40">/</span>
              {total}
            </span>
            {totalDuration != null && totalDuration > 0 && (
              <span className="hidden font-mono text-[10px] text-dim/45 sm:inline">
                {formatClock(totalDuration)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setGraphOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-line/60 bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-dim transition hover:border-accent/35 hover:text-fg"
              title="查看完整执行图"
            >
              <Maximize2 className="h-3.5 w-3.5 text-accent/70" aria-hidden="true" />
              <span>全图</span>
            </button>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`pipeline-${uid}`}
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex items-center gap-1 rounded-md border border-line/60 bg-white/[0.02] px-2 py-1 font-mono text-[10px] text-dim transition hover:border-accent/35 hover:text-fg"
            >
              {expanded ? "收起" : "展开"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {phaseInfos.map(({ phase, info }) => (
            <div
              key={phase.id}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
                info.status === "success" && "border-neon/20 bg-neon/[0.04]",
                info.status === "running" && "border-accent/30 bg-accent/[0.06]",
                info.status === "error" && "border-danger/30 bg-danger/[0.06]",
                info.status === "pending" && "border-line/50 bg-white/[0.01]",
              )}
            >
              <span className="font-mono text-[9px] text-dim/40">{phase.index}</span>
              <span className="truncate text-[11px] font-medium text-fg/80">
                {phase.title}
              </span>
              <span className="ml-auto hidden font-mono text-[9px] text-dim/40 sm:inline">
                {info.done}/{info.total}
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  info.status === "success" && "bg-neon",
                  info.status === "running" && "animate-pulse bg-accent",
                  info.status === "error" && "bg-danger",
                  info.status === "pending" && "bg-line",
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {expanded && (
        <div id={`pipeline-${uid}`} className="border-t border-line/60 px-3 pb-4 pt-4 sm:px-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="font-mono text-[9px] tracking-[0.18em] text-dim/45">
              EXECUTION TIMELINE
            </span>
            <span className="font-mono text-[9px] text-dim/35">
              {doneCount}/{total} STEPS
            </span>
          </div>

          <div
            ref={timelineRef}
            className="max-h-[520px] overflow-y-auto pr-1 sm:max-h-[620px]"
          >
            {phaseInfos.map(({ phase, info }, index) => (
              <PhaseBlock
                key={phase.id}
                phase={phase}
                info={info}
                isLast={index === phaseInfos.length - 1}
                now={now}
                activeRef={activeRef}
              />
            ))}
          </div>
        </div>
      )}

      {graphOpen &&
        createPortal(
          <GraphModal
            statusMap={statusMap}
            onClose={() => setGraphOpen(false)}
            closeRef={closeButtonRef}
          />,
          document.body,
        )}
    </section>
  );
}
