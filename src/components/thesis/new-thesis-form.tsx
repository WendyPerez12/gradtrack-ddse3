"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormError, SelectInput, TextInput, TextareaInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { createThesisSchema, type CreateThesisInput } from "@/lib/validations/thesis";
import { createThesisAction } from "@/app/(app)/trabajos/actions";

export function NewThesisForm({
  students,
  teachers,
}: {
  students: Array<{ id: string; label: string }>;
  teachers: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateThesisInput>({
    resolver: zodResolver(createThesisSchema),
    defaultValues: { studentProfileId: "", title: "", description: "", directorUserId: "", codirectorUserId: "" },
  });

  function onSubmit(values: CreateThesisInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createThesisAction(values);
      if (!result.ok) {
        setFormError(result.error);
        toast.show(result.error, "error");
        return;
      }
      toast.show(result.message ?? "Trabajo creado.");
      router.push(`/trabajos/${result.data.thesisId}`);
      router.refresh();
    });
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Todos los estudiantes activos del programa ya tienen un trabajo de grado registrado.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <FormError message={formError} />

      <SelectInput label="Estudiante" required error={errors.studentProfileId?.message} {...register("studentProfileId")}>
        <option value="">Selecciona un estudiante…</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.label}
          </option>
        ))}
      </SelectInput>

      <TextInput
        label="Título del trabajo"
        required
        placeholder="Título aprobado por el comité curricular"
        error={errors.title?.message}
        {...register("title")}
      />

      <TextareaInput
        label="Descripción"
        hint="Opcional. Resumen breve del alcance del trabajo."
        error={errors.description?.message}
        {...register("description")}
      />

      <SelectInput
        label="Director"
        hint="Puedes dejarlo sin asignar si el comité aún no decide."
        error={errors.directorUserId?.message}
        {...register("directorUserId")}
      >
        <option value="">Sin asignar por ahora</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.label}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        label="Codirector"
        hint="Opcional, según el caso."
        error={errors.codirectorUserId?.message}
        {...register("codirectorUserId")}
      >
        <option value="">No aplica</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.label}
          </option>
        ))}
      </SelectInput>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Crear trabajo"}
        </Button>
      </div>
    </form>
  );
}
