"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import { ROLE_OPTIONS } from "@/lib/validations/user";

export function UserFilters({
  programs,
  showProgram,
}: {
  programs: Array<{ id: string; name: string }>;
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
    startTransition(() => router.replace(`/usuarios?${next.toString()}`, { scroll: false }));
  }

  const selectClass = "h-9 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-ink";

  return (
    <div className="mb-4 flex flex-col gap-2" data-pending={pending ? "" : undefined}>
      <div className="relative max-w-md">
        <label htmlFor="buscar-usuario" className="sr-only">
          Buscar por nombre, correo o código
        </label>
        <Search
          className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-ink-faint"
          aria-hidden="true"
        />
        <input
          id="buscar-usuario"
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Buscar por nombre, correo o código…"
          onChange={(event) => update("q", event.target.value)}
          className="h-9 w-full rounded-md border border-border-strong bg-surface pr-3 pl-8 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="filtro-rol" className="sr-only">
            Rol
          </label>
          <select
            id="filtro-rol"
            className={selectClass}
            defaultValue={params.get("rol") ?? ""}
            onChange={(event) => update("rol", event.target.value)}
          >
            <option value="">Todos los roles</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showProgram ? (
          <div>
            <label htmlFor="filtro-programa-usuario" className="sr-only">
              Programa
            </label>
            <select
              id="filtro-programa-usuario"
              className={selectClass}
              defaultValue={params.get("programa") ?? ""}
              onChange={(event) => update("programa", event.target.value)}
            >
              <option value="">Todos los programas</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="filtro-estado-usuario" className="sr-only">
            Estado de la cuenta
          </label>
          <select
            id="filtro-estado-usuario"
            className={selectClass}
            defaultValue={params.get("estado") ?? ""}
            onChange={(event) => update("estado", event.target.value)}
          >
            <option value="">Cuentas activas</option>
            <option value="INACTIVOS">Desactivadas</option>
            <option value="TODOS">Todas</option>
          </select>
        </div>
      </div>
    </div>
  );
}
