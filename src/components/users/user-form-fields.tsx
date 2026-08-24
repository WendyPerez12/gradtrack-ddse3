"use client";

import { useState } from "react";
import { CheckboxInput, SelectInput, TextInput } from "@/components/ui/form";
import { ROLE_OPTIONS } from "@/lib/validations/user";

export interface ProgramOption {
  id: string;
  name: string;
  code: string;
}
export interface CohortOption {
  id: string;
  name: string;
  programId: string;
}

/**
 * Campos compartidos por el alta y la edición de cuentas. Los datos académicos
 * solo aparecen cuando el rol elegido es el de estudiante.
 */
export function UserFormFields({
  programs,
  cohorts,
  fieldErrors,
  defaults,
  lockRole = false,
}: {
  programs: ProgramOption[];
  cohorts: CohortOption[];
  fieldErrors: Record<string, string[]>;
  defaults?: {
    name?: string;
    email?: string;
    role?: string;
    programIds?: string[];
    studentCode?: string;
    cohortId?: string | null;
    currentSemester?: number;
  };
  lockRole?: boolean;
}) {
  const [role, setRole] = useState(defaults?.role ?? "ESTUDIANTE");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(defaults?.programIds ?? []);
  const esEstudiante = role === "ESTUDIANTE";

  const cohortesDisponibles = esEstudiante
    ? cohorts.filter((c) => selectedPrograms.includes(c.programId))
    : cohorts;

  function toggleProgram(programId: string, checked: boolean) {
    setSelectedPrograms((current) => {
      if (esEstudiante) return checked ? [programId] : [];
      return checked ? [...current, programId] : current.filter((id) => id !== programId);
    });
  }

  return (
    <>
      <TextInput
        label="Nombre completo"
        name="name"
        required
        defaultValue={defaults?.name}
        error={fieldErrors.name?.[0]}
      />
      <TextInput
        label="Correo electrónico"
        name="email"
        type="email"
        required
        placeholder="nombre@institucion.edu.co"
        defaultValue={defaults?.email}
        error={fieldErrors.email?.[0]}
      />

      <SelectInput
        label="Rol"
        name="role"
        required
        value={role}
        onChange={(event) => {
          setRole(event.target.value);
          if (event.target.value === "ESTUDIANTE") {
            setSelectedPrograms((current) => current.slice(0, 1));
          }
        }}
        disabled={lockRole}
        hint={
          lockRole
            ? "Una cuenta con perfil de estudiante no puede cambiar de rol."
            : "El rol define qué puede hacer la persona en el sistema."
        }
        error={fieldErrors.role?.[0]}
      >
        {ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectInput>
      {lockRole ? <input type="hidden" name="role" value={role} /> : null}

      <fieldset className="rounded-md border border-border px-3 py-2.5">
        <legend className="px-1 text-xs font-medium tracking-wide text-ink-faint uppercase">
          {esEstudiante ? "Programa" : "Programas"}
        </legend>
        <div className="flex flex-col gap-2 pt-1">
          {programs.map((program) => (
            <CheckboxInput
              key={program.id}
              label={`${program.name} (${program.code})`}
              name="programIds"
              value={program.id}
              checked={selectedPrograms.includes(program.id)}
              onChange={(event) => toggleProgram(program.id, event.target.checked)}
            />
          ))}
        </div>
        {fieldErrors.programIds?.[0] ? (
          <p className="pt-2 text-xs font-medium text-risk" role="alert">
            {fieldErrors.programIds[0]}
          </p>
        ) : null}
      </fieldset>

      {esEstudiante ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Código del estudiante"
            name="studentCode"
            required
            placeholder="MED-2026-001"
            defaultValue={defaults?.studentCode}
            error={fieldErrors.studentCode?.[0]}
          />
          <TextInput
            label="Semestre actual"
            name="currentSemester"
            type="number"
            min={1}
            max={12}
            defaultValue={defaults?.currentSemester ?? 1}
            error={fieldErrors.currentSemester?.[0]}
          />
          <SelectInput
            label="Cohorte"
            name="cohortId"
            defaultValue={defaults?.cohortId ?? ""}
            hint="Se lista según el programa seleccionado."
            error={fieldErrors.cohortId?.[0]}
          >
            <option value="">Sin cohorte</option>
            {cohortesDisponibles.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </SelectInput>
        </div>
      ) : null}
    </>
  );
}

/** Lee del formulario los campos comunes a alta y edición. */
export function readUserForm(form: FormData) {
  return {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    role: String(form.get("role") ?? "ESTUDIANTE"),
    programIds: form.getAll("programIds").map(String),
    studentCode: String(form.get("studentCode") ?? ""),
    cohortId: String(form.get("cohortId") ?? ""),
    currentSemester: form.get("currentSemester") ? Number(form.get("currentSemester")) : undefined,
  };
}
