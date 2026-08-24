import { z } from "zod";

const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (formato aaaa-mm-dd)");

const optionalDay = z.union([dayString, z.literal("")]).optional();

export const scheduleAdvisorySchema = z.object({
  thesisId: z.string().min(1),
  scheduledDate: dayString,
  scheduledTime: z
    .union([z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"), z.literal("")])
    .optional(),
  mode: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]),
  topic: z.string().trim().min(5, "Describe el tema o propósito (mínimo 5 caracteres)").max(300),
  observations: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ScheduleAdvisoryInput = z.infer<typeof scheduleAdvisorySchema>;

export const completeAdvisorySchema = z.object({
  advisoryId: z.string().min(1),
  actualDate: dayString,
  mode: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]),
  topic: z.string().trim().min(5, "Registra el tema tratado").max(300),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
  observations: z.string().trim().max(1000).optional().or(z.literal("")),
  studentAttended: z.boolean().default(true),
  directorAttended: z.boolean().default(true),
  codirectorAttended: z.boolean().optional(),
  commitments: z
    .array(
      z.object({
        description: z.string().trim().min(3, "Describe el compromiso").max(500),
        dueDate: optionalDay,
      }),
    )
    .max(10)
    .default([]),
  nextAdvisoryDate: optionalDay,
  createNextAdvisory: z.boolean().default(false),
  nextAdvisoryTopic: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CompleteAdvisoryInput = z.infer<typeof completeAdvisorySchema>;

export const notCompletedSchema = z.object({
  advisoryId: z.string().min(1),
  reason: z.enum([
    "STUDENT_ABSENT",
    "DIRECTOR_ABSENT",
    "CANCELLED_BY_AGREEMENT",
    "TECHNICAL_ISSUE",
    "OTHER",
  ]),
  observations: z.string().trim().max(1000).optional().or(z.literal("")),
  rescheduleDate: optionalDay,
});
export type NotCompletedInput = z.infer<typeof notCompletedSchema>;

export const rescheduleSchema = z.object({
  advisoryId: z.string().min(1),
  newDate: dayString,
  newTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).optional(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const commitmentSchema = z.object({
  advisoryId: z.string().min(1),
  description: z.string().trim().min(3, "Describe el compromiso").max(500),
  dueDate: optionalDay,
  responsibleUserId: z.string().optional().or(z.literal("")),
});

export const commitmentStatusSchema = z.object({
  commitmentId: z.string().min(1),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]),
});

export const ADVISORY_MODE_LABEL: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrida",
};

export const ADVISORY_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Programada",
  COMPLETED: "Realizada",
  NOT_COMPLETED: "No realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Reprogramada",
};

export const NOT_COMPLETED_REASON_LABEL: Record<string, string> = {
  STUDENT_ABSENT: "El estudiante no asistió",
  DIRECTOR_ABSENT: "El director no asistió",
  CANCELLED_BY_AGREEMENT: "Cancelada de común acuerdo",
  TECHNICAL_ISSUE: "Dificultad técnica",
  OTHER: "Otro motivo",
};

export const COMMITMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Cumplido",
  CANCELLED: "Cancelado",
};
