import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** Enlace de ordenamiento; se resuelve en el servidor. */
  sortHref?: string;
  sorted?: "asc" | "desc" | null;
  className?: string;
  cell: (row: T) => ReactNode;
}

/**
 * Tabla de datos responsive. En pantallas pequeñas conserva sus columnas y
 * desplaza horizontalmente dentro de su propio contenedor: la página nunca
 * se desplaza de lado (§87).
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  empty: ReactNode;
  caption?: string;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-left text-xs font-medium tracking-wide text-ink-faint uppercase whitespace-nowrap",
                  column.className,
                )}
                aria-sort={
                  column.sorted === "asc"
                    ? "ascending"
                    : column.sorted === "desc"
                      ? "descending"
                      : undefined
                }
              >
                {column.sortHref ? (
                  <Link
                    href={column.sortHref}
                    className="inline-flex items-center gap-1 hover:text-brand"
                    scroll={false}
                  >
                    {column.header}
                    {column.sorted === "asc" ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : column.sorted === "desc" ? (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowUpDown className="size-3 opacity-50" aria-hidden="true" />
                    )}
                  </Link>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getKey(row)} className="border-b border-border last:border-0 hover:bg-surface-muted/70">
              {columns.map((column) => (
                <td key={column.key} className={cn("px-4 py-3 align-middle", column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  hrefFor,
  total,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  total: number;
}) {
  if (pages <= 1) return null;
  return (
    <nav
      className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm"
      aria-label="Paginación"
    >
      <p className="text-ink-soft">
        Página {page} de {pages} · {total} registros
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={cn(
            "rounded-md border border-border-strong px-3 py-1.5",
            page === 1 ? "pointer-events-none opacity-50" : "hover:bg-surface-muted",
          )}
        >
          Anterior
        </Link>
        <Link
          href={hrefFor(Math.min(pages, page + 1))}
          aria-disabled={page === pages}
          className={cn(
            "rounded-md border border-border-strong px-3 py-1.5",
            page === pages ? "pointer-events-none opacity-50" : "hover:bg-surface-muted",
          )}
        >
          Siguiente
        </Link>
      </div>
    </nav>
  );
}
