"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { recalculateAlertsAction } from "@/app/(app)/alertas/actions";

export function RecalculateAlertsButton() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await recalculateAlertsAction();
          toast.show(result.ok ? (result.message ?? "Alertas recalculadas.") : result.error, result.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
      {pending ? "Recalculando…" : "Recalcular alertas"}
    </Button>
  );
}
