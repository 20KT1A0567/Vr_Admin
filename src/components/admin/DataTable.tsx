import type { ReactNode } from "react";
import { cn } from "utils/cn";

export interface DataTableColumn<T> {
  cellClassName?: string;
  header: ReactNode;
  headerClassName?: string;
  hiddenOnMobile?: boolean;
  key: string;
  mobileLabel?: ReactNode;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  cardDescription?: (item: T) => ReactNode;
  cardTitle?: (item: T) => ReactNode;
  className?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  emptyState?: ReactNode;
  mobileCardClassName?: string;
  rowClassName?: string;
  rowKey: (item: T, index: number) => string | number;
  stickyHeader?: boolean;
}

function resolveMobileLabel(label: ReactNode) {
  if (typeof label === "string" || typeof label === "number") {
    return label;
  }

  return null;
}

export function DataTable<T>({
  cardDescription,
  cardTitle,
  className,
  columns,
  data,
  emptyState,
  mobileCardClassName,
  rowClassName,
  rowKey,
  stickyHeader = true
}: DataTableProps<T>) {
  const mobileColumns = columns.filter((column) => !column.hiddenOnMobile);
  const titleColumn = mobileColumns[0];

  return (
    <div className={cn("admin-card overflow-hidden", className)}>
      <div className="sm:hidden">
        {data.length ? (
          <div className="space-y-3 p-3">
            {data.map((item, index) => {
              const cardFields = cardTitle ? mobileColumns : mobileColumns.slice(1);

              return (
                <article
                  key={rowKey(item, index)}
                  className={cn("rounded-[24px] border border-slate-200/85 bg-white/92 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]", mobileCardClassName)}
                >
                  <div className="min-w-0">
                    {cardTitle ? cardTitle(item) : titleColumn ? titleColumn.render(item) : null}
                    {cardDescription ? <div className="mt-2 text-sm text-slate-500">{cardDescription(item)}</div> : null}
                  </div>

                  {cardFields.length ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      {cardFields.map((column) => {
                        const label = column.mobileLabel ?? resolveMobileLabel(column.header);

                        return (
                          <div key={column.key} className="flex items-start justify-between gap-4">
                            {label ? (
                              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {label}
                              </span>
                            ) : null}
                            <div className="min-w-0 flex-1 text-right text-sm text-slate-600">{column.render(item)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : emptyState ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">{emptyState}</div>
        ) : null}
      </div>

      <div className="admin-scrollbar hidden overflow-x-auto sm:block">
        <table className="min-w-full text-left text-sm">
          <thead
            className={cn(
              "admin-table-head",
              stickyHeader ? "sticky top-0 z-[1] backdrop-blur supports-[backdrop-filter]:bg-slate-50/95" : undefined
            )}
          >
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", column.headerClassName)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={rowKey(item, index)} className={cn("admin-table-row", rowClassName)}>
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-4 first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6", column.cellClassName)}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
            {!data.length && emptyState ? (
              <tr>
                <td className="px-6 py-12 text-center text-sm text-slate-400" colSpan={columns.length}>
                  {emptyState}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
