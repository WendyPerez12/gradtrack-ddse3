import { z } from "zod";

export const createThesisSchema = z.object({
  studentProfileId: z.string().min(1, "Selecciona el estudiante"),
  title: z
    .string()
    .trim()
    .min(10, "El título debe tener al menos 10 caracteres")
    .max(300, "El título es demasiado largo"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  directorUserId: z.string().optional().or(z.literal("")),
  codirectorUserId: z.string().optional().or(z.literal("")),
});
export type CreateThesisInput = z.infer<typeof createThesisSchema>;

export const updateThesisSchema = z.object({
  thesisId: z.string().min(1),
  title: z.string().trim().min(10, "El título debe tener al menos 10 caracteres").max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "COMPLETED", "CANCELLED"]),
});
export type UpdateThesisInput = z.infer<typeof updateThesisSchema>;

export const assignSupervisorSchema = z.object({
  thesisId: z.string().min(1),
  userId: z.string().min(1, "Selecciona un docente"),
  type: z.enum(["DIRECTOR", "CODIRECTOR"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type AssignSupervisorInput = z.infer<typeof assignSupervisorSchema>;

export const removeSupervisorSchema = z.object({
  thesisId: z.string().min(1),
  supervisionId: z.string().min(1),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
