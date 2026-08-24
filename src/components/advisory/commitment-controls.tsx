"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { updateCommitmentStatusAction } from "@/app/(app)/asesorias/actions";

export function CommitmentControls({
  commitmentId,
  status,
}: {
  commitmentId: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function setStatus(next: "PENDING" | "COMPLETED" | "CANCELLED") {
    startTransition(async () => {
      const result = await updateCommitmentStatusAction({ commitmentId, status: next });
      if (!result.ok) {
        toast.show(result.error, "error");
        return;
      }
      toast.show(result.message ?? "Compromiso actualizado.");
      router.refresh();
    });
  }

  if (status === "CANCELLED") {
    return <span className="text-xs text-ink-faint">Cancelado</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setStatus(status === "COMPLETED" ? "PENDING" : "COMPLETED")}
      className="rounded-md border border-border-strong px-2 py-0.5 text-xs font-medium text-ink-soft hover:bg-surface-muted disabled:opacity-60"
    >
      {status === "COMPLETED" ? "Reabrir" : "Marcar cumplido"}
    </button>
  );
}
