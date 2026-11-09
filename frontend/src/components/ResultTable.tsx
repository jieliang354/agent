/**
 * 查询结果表格组件
 * 将后端返回的结构化数据归一化为可滚动数据网格，支持复制 CSV
 */
import { Check, Copy, Database } from "lucide-react";
import { useState } from "react";
import { cn, formatNumber } from "../lib/format";

function normalizeRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) {
    return data.map((item, index) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : { 序号: index + 1, 值: item },
    );
  }

  if (data && typeof data === "object") {
    return [data as Record<string, unknown>];
  }

  return [{ 值: data ?? "" }];
}

function rawCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ResultTable({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);

  const rows = normalizeRows(data);
  const columns = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );

  if (columns.length === 0) {
    return null;
  }

  const numericColumns = new Set(
    columns.filter(
      (column) =>
        rows.some((row) => typeof row[column] === "number") &&
        rows.every(
          (row) =>
            row[column] === null ||
            row[column] === undefined ||
            typeof row[column] === "number",
        ),
    ),
  );

  const copyCsv = async () => {
    const escape = (value: unknown) => {
      const text = rawCell(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const csv = [
      columns.map(escape).join(","),
      ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用时静默降级
    }
  };

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-line/70 bg-space/40">
      <div className="flex items-center justify-between gap-3 border-b border-line/60 bg-white/[0.015] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.2em] text-dim">RESULT SET</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-line/60 bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-dim/70">
            {rows.length} ROWS
          </span>
          <button
            type="button"
            onClick={copyCsv}
            className="grid h-6 w-6 place-items-center rounded-md border border-transparent text-dim/50 transition hover:border-line/70 hover:bg-white/[0.03] hover:text-fg"
            title={copied ? "已复制 CSV" : "复制 CSV"}
            aria-label={copied ? "已复制 CSV" : "复制 CSV"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-neon" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="max-h-[380px] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    "border-b border-line/60 px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-dim/70",
                    numericColumns.has(column) && "text-right",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-accent/[0.04]"
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className={cn(
                      "border-b border-line/40 px-4 py-2.5 text-fg/80",
                      numericColumns.has(column) &&
                        "text-right font-mono tabular-nums text-fg",
                    )}
                  >
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
