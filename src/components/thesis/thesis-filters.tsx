"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Filtros del listado de trabajos (§36). Escriben en la URL para que el
 * servidor haga el filtrado y el estado sea enlazable y compartible.
 */
export function ThesisFilters({
  basePath,
  programs,
  cohorts,
  directors,
  semesters,
  showProgram,
}: {
  basePath: string;
  programs: FilterOption[];
  cohorts: FilterOption[];
  directors: FilterOption[];
  semesters: FilterOption[];
  showProgram: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => router.replace(`${basePath}?${next.toString()}`, { scroll: false }));
  }

  const selectClass =
    "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-ink";

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2" data-pending={pending ? "" : undefined}>
      <div className="relative min-w-56 flex-1">
        <label htmlFor="filtro-busqueda" className="sr-only">
          Buscar por estudiante, director o título
        </label>
        <Search
          className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-faint"
          aria-hidden="true"
        />
        <input
          id="filtro-busqueda"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Buscar estudiante, director o título…"
          onChange={(event) => update("q", event.target.value)}
          className="h-9 w-full rounded-md border border-border-strong bg-surface pr-3 pl-8 text-sm"
        />
      </div>

      {showProgram && programs.length > 1 ? (
        <div>
          <label htmlFor="filtro-programa" className="sr-only">
            Programa
          </label>
          <select
            id="filtro-programa"
            className={selectClass}
            defaultValue={params.get("programa") ?? ""}
            onChange={(event) => update("programa", event.target.value)}
          >
            <option value="">Todos los programas</option>
            {programs.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="filtro-cohorte" className="sr-only">
          Cohorte
        </label>
        <select
          id="filtro-cohorte"
          className={selectClass}
          defaultValue={params.get("cohorte") ?? ""}
          onChange={(event) => update("cohorte", event.target.value)}
        >
          <option value="">Todas las cohortes</option>
          {cohorts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filtro-semestre" className="sr-only">
          Semestre
        </label>
        <select
          id="filtro-semestre"
          className={selectClass}
          defaultValue={params.get("semestre") ?? ""}
          onChange={(event) => update("semestre", event.target.value)}
        >
          <option value="">Todos los semestres</option>
          {semesters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {directors.length > 0 ? (
        <div>
          <label htmlFor="filtro-director" className="sr-only">
            Director
          </label>
          <select
            id="filtro-director"
            className={selectClass}
            defaultValue={params.get("director") ?? ""}
            onChange={(event) => update("director", event.target.value)}
          >
            <option value="">Todos los directores</option>
            {directors.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="filtro-estado" className="sr-only">
          Estado
        </label>
        <select
          id="filtro-estado"
          className={selectClass}
          defaultValue={params.get("estado") ?? ""}
          onChange={(event) => update("estado", event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="ON_TRACK">Al día</option>
          <option value="FOLLOW_UP">Seguimiento</option>
          <option value="ALERT">Alerta</option>
        </select>
      </div>
    </div>
  );
}
