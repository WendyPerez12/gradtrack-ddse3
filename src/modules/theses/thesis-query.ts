import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/permissions/rules";
import { thesisScopeWhere } from "@/lib/permissions/guards";
import { getMonitoringRows, summarize, type ThesisMonitoringRow } from "@/modules/monitoring/thesis-monitoring";
import type { MonitoringStatus } from "@/modules/monitoring/types";
import { sortRows, type SortKey } from "@/components/thesis/thesis-table";

export const PAGE_SIZE = 20;

export interface ThesisListParams {
  q?: string;
  programa?: string;
  cohorte?: string;
  semestre?: string;
  director?: string;
  estado?: string;
  page?: string;
  sort?: string;
  dir?: string;
}

const SORT_KEYS: SortKey[] = [
  "student",
  "director",
  "advisories",
  "lastAdvisory",
  "nextAdvisory",
  "daysSince",
  "status",
];

export function parseSort(params: ThesisListParams): { sort: SortKey; dir: "asc" | "desc" } {
  const sort = SORT_KEYS.includes(params.sort as SortKey) ? (params.sort as SortKey) : "status";
  const dir = params.dir === "desc" ? "desc" : "asc";
  return { sort, dir };
}

/** Construye el `where` de Prisma a partir del alcance del actor y los filtros. */
export function buildThesisWhere(actor: Actor, params: ThesisListParams): Prisma.ThesisWhereInput {
  const where: Prisma.ThesisWhereInput = { ...thesisScopeWhere(actor) };
  const and: Prisma.ThesisWhereInput[] = [];

  if (params.programa) and.push({ programId: params.programa });
  if (params.cohorte) and.push({ student: { cohortId: params.cohorte } });
  if (params.semestre) {
    const semester = Number.parseInt(params.semestre, 10);
    if (Number.isFinite(semester)) and.push({ student: { currentSemester: semester } });
  }
  if (params.director) {
    and.push({ supervisions: { some: { userId: params.director, active: true } } });
  }
  if (params.q?.trim()) {
    const q = params.q.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { student: { user: { name: { contains: q, mode: "insensitive" } } } },
        { student: { studentCode: { contains: q, mode: "insensitive" } } },
        { supervisions: { some: { user: { name: { contains: q, mode: "insensitive" } } } } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export interface ThesisListResult {
  rows: ThesisMonitoringRow[];
  allRows: ThesisMonitoringRow[];
  total: number;
  page: number;
  pages: number;
  sort: SortKey;
  dir: "asc" | "desc";
  summary: ReturnType<typeof summarize>;
}

/**
 * Listado de trabajos con estado de monitoreo, filtrado, ordenado y paginado.
 * El filtro por estado y el ordenamiento se aplican sobre el estado derivado,
 * que por definición no vive en la base (§89).
 */
export async function queryThesisList(
  actor: Actor,
  params: ThesisListParams,
): Promise<ThesisListResult> {
  const where = buildThesisWhere(actor, params);
  const { sort, dir } = parseSort(params);

  const [allRows, scheduledCount] = await Promise.all([
    getMonitoringRows(where),
    prisma.advisory.count({
      where: { status: "SCHEDULED", thesis: where },
    }),
  ]);

  const statusFilter = params.estado as MonitoringStatus | undefined;
  const filtered = statusFilter
    ? allRows.filter((row) => row.monitoring.status === statusFilter)
    : allRows;

  const sorted = sortRows(filtered, sort, dir);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return {
    rows,
    allRows,
    total: sorted.length,
    page: safePage,
    pages,
    sort,
    dir,
    summary: summarize(allRows, scheduledCount),
  };
}

/** Opciones para los selectores de filtro, limitadas al alcance del actor. */
export async function getFilterOptions(actor: Actor) {
  const programWhere =
    actor.role === "ADMIN" ? { active: true } : { active: true, id: { in: actor.programIds } };

  const [programs, cohorts, directors] = await Promise.all([
    prisma.program.findMany({ where: programWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.cohort.findMany({
      where: { program: programWhere },
      select: { id: true, name: true, program: { select: { code: true } } },
      orderBy: { name: "desc" },
    }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["DIRECTOR", "COORDINADOR", "ADMIN"] },
        memberships: { some: { program: programWhere } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    programs: programs.map((p) => ({ value: p.id, label: p.name })),
    cohorts: cohorts.map((c) => ({ value: c.id, label: `${c.name} (${c.program.code})` })),
    directors: directors.map((d) => ({ value: d.id, label: d.name })),
    semesters: [1, 2, 3, 4].map((s) => ({ value: String(s), label: `Semestre ${s}` })),
  };
}

/** Construye URLs conservando los filtros actuales. */
export function makeHrefBuilder(basePath: string, params: ThesisListParams) {
  const base = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") base.set(key, String(value));
  }

  return {
    forSort(key: SortKey, current: { sort: SortKey; dir: "asc" | "desc" }) {
      const next = new URLSearchParams(base.toString());
      next.set("sort", key);
      next.set("dir", current.sort === key && current.dir === "asc" ? "desc" : "asc");
      return `${basePath}?${next.toString()}`;
    },
    forPage(page: number) {
      const next = new URLSearchParams(base.toString());
      next.set("page", String(page));
      return `${basePath}?${next.toString()}`;
    },
  };
}
