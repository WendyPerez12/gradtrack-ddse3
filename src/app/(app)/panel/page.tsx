import type { Metadata } from "next";
import { requireActor } from "@/lib/auth/session";
import { CoordinatorPanel } from "@/components/dashboard/coordinator-panel";
import { DirectorPanel } from "@/components/dashboard/director-panel";
import { StudentPanel } from "@/components/dashboard/student-panel";
import type { ThesisListParams } from "@/modules/theses/thesis-query";

export const metadata: Metadata = { title: "Panel" };

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<ThesisListParams>;
}) {
  const actor = await requireActor();
  const params = await searchParams;

  if (actor.role === "ESTUDIANTE") return <StudentPanel actor={actor} />;
  if (actor.role === "DIRECTOR" || actor.role === "CODIRECTOR") {
    return <DirectorPanel actor={actor} params={params} />;
  }
  return <CoordinatorPanel actor={actor} params={params} />;
}
