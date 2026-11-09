/**
 * 前端应用主组件
 * 负责聊天会话状态、SSE 事件消费和整体页面布局
 */
import {
  Activity,
  BarChart3,
  Eraser,
  MessageSquarePlus,
  Server,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Composer } from "./components/Composer";
import { EmptyState } from "./components/EmptyState";
import { MessageBubble } from "./components/MessageBubble";
import { streamQuery } from "./lib/agentApi";
import { cn } from "./lib/format";
import type { AgentEvent, ChatMessage, StepState } from "./types/agent";

const examples = [
  "统计 2025 年第一季度各大区的 GMV，并按 GMV 从高到低排序",
  "统计 2025 年 3 月各商品品类的销量和销售额",
  "查询华东地区 2025 年第一季度销售额最高的前 5 个商品",
  "按会员等级统计 2025 年第一季度的订单数和销售额",
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "Vite /api proxy";

function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function upsertStep(steps: StepState[] = [], event: Extract<AgentEvent, { type: "progress" }>) {
  const now = Date.now();
  const existing = steps.find((item) => item.step === event.step);
  const next = steps.filter((item) => item.step !== event.step);
  next.push({
    step: event.step,
    status: event.status,
    startedAt: existing?.startedAt ?? now,
    finishedAt: event.status === "success" || event.status === "error" ? now : undefined,
    updatedAt: now,
  });
  return next;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [activeController, setActiveController] = useState<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isStreaming = Boolean(activeController);
  const canSubmit = draft.trim().length > 0 && !isStreaming;

  const completedCount = useMemo(
    () => messages.filter((message) => message.role === "assistant" && message.status === "done").length,
    [messages],
  );

  useEffect(() => {
    if (messages.length === 0) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const startQuery = async (rawQuery = draft) => {
    const query = rawQuery.trim();
    if (!query || isStreaming) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: query,
      createdAt: Date.now(),
    };

    const assistantId = makeId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "正在连接问数智能体...",
      createdAt: Date.now(),
      status: "streaming",
      steps: [],
    };

    const controller = new AbortController();
    setActiveController(controller);
    setDraft("");
    setMessages((current) => [...current, userMessage, assistantMessage]);

    const onEvent = (event: AgentEvent) => {
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== assistantId) return message;

          if (event.type === "progress") {
            return {
              ...message,
              content: event.status === "running" ? `正在执行：${event.step}` : message.content,
              steps: upsertStep(message.steps, event),
            };
          }

          if (event.type === "result") {
            return {
              ...message,
              status: "done",
              content: "查询完成，已返回结构化结果。",
              result: event.data,
            };
          }

          return {
            ...message,
            status: "error",
            content: "这次查询没有成功。",
            error: event.message,
          };
        }),
      );
    };

    try {
      await streamQuery(query, { signal: controller.signal, onEvent });
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId && message.status === "streaming"
            ? { ...message, status: "done", content: "流程已结束，后端未返回查询结果。" }
            : message,
        ),
      );
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError";
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                status: isAbort ? "done" : "error",
                content: isAbort ? "已停止本次查询。" : "无法连接问数接口。",
                error: isAbort ? undefined : error instanceof Error ? error.message : String(error),
              }
            : message,
        ),
      );
    } finally {
      setActiveController(null);
    }
  };

  const stopQuery = () => {
    activeController?.abort();
  };

  const clearConversation = () => {
    if (isStreaming) return;
    setMessages([]);
    setDraft("");
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-space text-fg">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full bg-accent/10 blur-[140px] animate-breathe" />
        <div className="absolute -bottom-56 -right-32 h-[640px] w-[640px] rounded-full bg-iris/10 blur-[160px] animate-breathe [animation-delay:2.5s]" />
        <div className="absolute inset-0 tech-grid" />
        <div className="absolute inset-0 scanlines" />
        <div className="absolute inset-0 noise" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_30%,#050a12_100%)]" />
      </div>

      <div className="relative z-10 grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="relative hidden min-h-0 flex-col border-r border-line/50 bg-deep/45 backdrop-blur-xl lg:flex">
          <div className="border-b border-line/50 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/30 bg-gradient-to-br from-accent/15 via-transparent to-iris/15 shadow-glow">
                <BarChart3 className="h-5 w-5 text-accent" aria-hidden="true" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_#34f5a8]" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold tracking-wide">电商问数</div>
                <div className="truncate font-mono text-[10px] tracking-[0.22em] text-dim/70">
                  SHOPKEEPER · AGENT
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg border border-line/60 bg-white/[0.02] px-3 py-2">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-dim">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon shadow-[0_0_8px_#34f5a8]" />
                SYSTEM ONLINE
              </span>
              <span className="font-mono text-[10px] text-dim/50">v0.1</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
            <button
              type="button"
              onClick={clearConversation}
              disabled={isStreaming}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-[#38bdf8] text-sm font-semibold text-space shadow-[0_0_28px_-10px_rgba(34,211,238,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              新会话
            </button>

            <section>
              <div className="mb-2 px-1 font-mono text-[10px] tracking-[0.24em] text-dim/60">
                SAMPLE PROMPTS
              </div>
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <button
                    key={example}
                    type="button"
                    title={example}
                    disabled={isStreaming}
                    onClick={() => startQuery(example)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-line/60 bg-white/[0.015] px-3 py-3 text-left transition hover:border-accent/35 hover:bg-accent/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] text-accent/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="line-clamp-2 flex-1 text-[13px] leading-5 text-dim transition group-hover:text-fg">
                      {example}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="border-t border-line/50 p-4">
            <div className="rounded-xl border border-line/60 bg-white/[0.015] p-3 font-mono text-[10px]">
              <div className="mb-2 flex items-center gap-2 tracking-[0.18em] text-dim/60">
                <Server className="h-3 w-3" aria-hidden="true" />
                ENDPOINT
              </div>
              <div className="truncate text-dim" title={API_BASE_URL}>
                {API_BASE_URL}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2.5">
                <span className="inline-flex items-center gap-1.5 text-dim/60">
                  <Activity className="h-3 w-3" aria-hidden="true" />
                  DONE
                </span>
                <span className="text-accent">{String(completedCount).padStart(2, "0")}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-line/50 bg-space/55 px-4 backdrop-blur-xl lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent lg:hidden">
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">智能数据分析</span>
                  <span className="hidden rounded border border-line/70 bg-white/[0.02] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.16em] text-dim/70 sm:inline">
                    v0.1
                  </span>
                </div>
                <div className="truncate font-mono text-[10px] tracking-[0.16em] text-dim/60">
                  FASTAPI SSE · LANGGRAPH
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "hidden items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] sm:inline-flex",
                  isStreaming
                    ? "border-warn/30 bg-warn/10 text-warn"
                    : "border-neon/20 bg-neon/[0.06] text-neon",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isStreaming
                      ? "animate-pulse bg-warn"
                      : "bg-neon shadow-[0_0_8px_#34f5a8]",
                  )}
                />
                {isStreaming ? "STREAMING" : "SSE ONLINE"}
              </span>
              <button
                type="button"
                onClick={clearConversation}
                disabled={messages.length === 0 || isStreaming}
                className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-dim transition hover:border-line hover:bg-white/[0.03] hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                title="清空会话"
                aria-label="清空会话"
              >
                <Eraser className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {messages.length === 0 ? (
              <EmptyState examples={examples} onUseExample={(example) => setDraft(example)} />
            ) : (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 lg:px-8">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            )}
          </div>

          <Composer
            value={draft}
            disabled={!canSubmit}
            isStreaming={isStreaming}
            onChange={setDraft}
            onSubmit={() => startQuery()}
            onStop={stopQuery}
          />
        </main>
      </div>
    </div>
  );
}
