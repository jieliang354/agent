/**
 * 聊天输入区组件
 * 处理问题输入、自动高度、发送和停止当前流式请求
 */
import { ArrowUp, Square, WandSparkles } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";
import { cn } from "../lib/format";

type ComposerProps = {
    value: string;
    disabled: boolean;
    isStreaming: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onStop: () => void;
};

export function Composer({
    value,
    disabled,
    isStreaming,
    onChange,
    onSubmit,
    onStop,
}: ComposerProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const element = textareaRef.current;
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight, 144)}px`;
    }, [value]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!disabled) onSubmit();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!disabled) onSubmit();
        }
    };

    return (
        <form
            onSubmit={submit}
            className="relative z-10 shrink-0 border-t border-line/50 bg-space/60 px-4 pb-4 pt-2.5 backdrop-blur-xl"
        >
            <div className="mx-auto max-w-5xl">
                <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] tracking-[0.16em]">
                    <span className="inline-flex items-center gap-2 text-dim/70">
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isStreaming
                                    ? "animate-pulse bg-warn"
                                    : "bg-neon shadow-[0_0_8px_#34f5a8]",
                            )}
                        />
                        {isStreaming ? "STREAMING" : "READY"}
                    </span>
                    <span className="hidden text-dim/50 sm:inline">
                        ENTER 发送 · SHIFT+ENTER 换行
                    </span>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-accent/50 via-line/80 to-iris/40 p-px transition-shadow focus-within:shadow-[0_0_45px_-12px_rgba(34,211,238,0.55)]">
                    <div className="flex items-end gap-2 rounded-[15px] bg-deep/95 px-2 py-1.5">
                        <div className="mb-1 hidden h-10 w-10 shrink-0 place-items-center rounded-lg border border-line/60 bg-white/[0.02] text-accent sm:grid">
                            <WandSparkles className="h-4 w-4" aria-hidden="true" />
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            onKeyDown={onKeyDown}
                            rows={1}
                            placeholder="输入你的数据问题，例如：统计 Q1 各大区 GMV…"
                            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-[15px] leading-6 text-fg outline-none placeholder:text-dim/40"
                        />

                        <button
                            type={isStreaming ? "button" : "submit"}
                            onClick={isStreaming ? onStop : undefined}
                            disabled={!isStreaming && disabled}
                            className={cn(
                                "mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                                isStreaming
                                    ? "border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25"
                                    : "bg-gradient-to-br from-accent to-[#0ea5e9] text-space shadow-[0_0_24px_-6px_rgba(34,211,238,0.7)] hover:brightness-110 disabled:from-line disabled:to-line disabled:text-dim/50 disabled:shadow-none",
                            )}
                            title={isStreaming ? "停止" : "发送"}
                            aria-label={isStreaming ? "停止" : "发送"}
                        >
                            {isStreaming ? (
                                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                            ) : (
                                <ArrowUp className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
