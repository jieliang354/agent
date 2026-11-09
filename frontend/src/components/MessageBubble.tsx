/**
 * 聊天消息气泡组件
 * 组合展示用户问题、智能体回复、执行流程和结果表格
 */
import { Bot, Check, Copy, Terminal, UserRound } from "lucide-react";
import { useState } from "react";
import { ResultTable } from "./ResultTable";
import { StepRail } from "./StepRail";
import { cn, formatQueryId, formatTime, toClipboardText } from "../lib/format";
import type { ChatMessage } from "../types/agent";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = message.result !== undefined ? toClipboardText(message.result) : message.content;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用时静默降级，不影响主流程
    }
  };

  const streaming = message.status === "streaming";

  return (
    <article className={cn("group flex animate-rise gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/30 bg-gradient-to-br from-accent/15 to-iris/10 text-accent">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </div>
      )}

      <div className={cn("min-w-0 flex-1", isUser && "flex max-w-[760px] justify-end")}>
        {isUser ? (
          <div className="max-w-[720px]">
            <div className="rounded-2xl rounded-br-md border border-accent/25 bg-gradient-to-br from-[#0e2b4a] to-[#102f52] px-4 py-3 shadow-[0_0_32px_-18px_rgba(34,211,238,0.9)]">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-fg">{message.content}</p>
              <div className="mt-2 text-right font-mono text-[10px] text-dim/60">
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-panel/45 backdrop-blur-md">
            <span
              className="absolute inset-y-6 left-0 w-px bg-gradient-to-b from-accent via-iris to-transparent"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between gap-3 border-b border-line/50 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] tracking-[0.14em]">
                <Terminal className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-accent">AGENT</span>
                <span className="text-dim/35">/</span>
                <span className="truncate text-dim/70">{formatQueryId(message.createdAt)}</span>
                {streaming && (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded border border-warn/25 bg-warn/10 px-1.5 py-0.5 text-[9px] text-warn">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-warn" />
                    RUNNING
                  </span>
                )}
              </div>

              {!streaming && (
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-md border border-transparent p-1.5 text-dim/45 opacity-0 transition hover:border-line/70 hover:bg-white/[0.03] hover:text-fg focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                  title={copied ? "已复制" : "复制"}
                  aria-label={copied ? "已复制" : "复制"}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-neon" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>

            <div className="px-4 py-4">
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-fg/90">
                {message.content}
                {streaming && (
                  <span className="ml-1 inline-block animate-blink text-accent" aria-hidden="true">
                    ▍
                  </span>
                )}
              </p>

              {message.error && (
                <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-[11px] leading-5 text-danger">
                  {message.error}
                </div>
              )}

              <StepRail steps={message.steps} />
              {message.result !== undefined && <ResultTable data={message.result} />}

              <div className="mt-3 font-mono text-[10px] text-dim/45">
                {formatTime(message.createdAt)}
              </div>
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-iris/30 bg-iris/10 text-iris">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </div>
      )}
    </article>
  );
}
