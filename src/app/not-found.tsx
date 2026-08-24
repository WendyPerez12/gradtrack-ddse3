import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-1 text-xl font-semibold text-ink">No encontramos esta página</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Puede que el recurso no exista o que no tengas acceso a él con tu rol actual.
        </p>
        <Link href="/panel" className={`${buttonVariants({ variant: "primary" })} mt-5`}>
          Volver al panel
        </Link>
      </div>
    </main>
  );
}
