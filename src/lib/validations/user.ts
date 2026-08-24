import { z } from "zod";

/**
 * Política de contraseñas. Deliberadamente sobria: exigir símbolos y mayúsculas
 * empuja a la gente a escribirlas en un papel. Longitud y una mezcla mínima.
 */
export const passwordSchema = z
  .string()
  .min(8, "Debe tener al menos 8 caracteres")
  .max(72, "Demasiado larga (máximo 72 caracteres)")
  .refine((value) => /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(value), "Debe incluir al menos una letra")
  .refine((value) => /\d/.test(value), "Debe incluir al menos un número");

export const ASSIGNABLE_ROLES = ["ADMIN", "COORDINADOR", "DIRECTOR", "ESTUDIANTE"] as const;

const baseUser = {
  name: z.string().trim().min(3, "Escribe el nombre completo").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido"),
  role: z.enum(ASSIGNABLE_ROLES),
  programIds: z.array(z.string()).default([]),
};

/** Datos académicos que solo aplican cuando la cuenta es de un estudiante. */
const studentFields = {
  studentCode: z.string().trim().max(30).optional().or(z.literal("")),
  cohortId: z.string().optional().or(z.literal("")),
  currentSemester: z.coerce.number().int().min(1).max(12).optional(),
};

export const createUserSchema = z
  .object({
    ...baseUser,
    ...studentFields,
    password: passwordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.role === "ESTUDIANTE") {
      if (data.programIds.length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["programIds"],
          message: "Un estudiante pertenece exactamente a un programa.",
        });
      }
      if (!data.studentCode?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["studentCode"],
          message: "El código del estudiante es obligatorio.",
        });
      }
    }
    if (data.role !== "ESTUDIANTE" && data.role !== "ADMIN" && data.programIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["programIds"],
        message: "Vincula la cuenta a por lo menos un programa.",
      });
    }
  });
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  ...baseUser,
  ...studentFields,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: passwordSchema,
});

export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Repite la contraseña nueva"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las dos contraseñas no coinciden.",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "La contraseña nueva debe ser distinta de la actual.",
  });
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>;

export const ROLE_OPTIONS: Array<{ value: (typeof ASSIGNABLE_ROLES)[number]; label: string }> = [
  { value: "ESTUDIANTE", label: "Estudiante" },
  { value: "DIRECTOR", label: "Docente (director o codirector)" },
  { value: "COORDINADOR", label: "Coordinador" },
  { value: "ADMIN", label: "Administrador" },
];

/** Sugerencia de contraseña temporal legible y suficientemente aleatoria. */
export function suggestTemporaryPassword(): string {
  const palabras = ["Aula", "Tesis", "Campus", "Rectoria", "Cohorte", "Semestre", "Grado"];
  const palabra = palabras[Math.floor(Math.random() * palabras.length)]!;
  const numero = String(Math.floor(Math.random() * 9000) + 1000);
  return `${palabra}${numero}`;
}
