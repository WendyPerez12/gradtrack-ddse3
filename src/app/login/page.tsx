import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/navigation";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const actor = await getCurrentActor();
  if (actor) redirect("/panel");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-brand-strong px-10 py-12 lg:flex">
        <div>
          <p className="text-2xl font-semibold text-white">{APP_NAME}</p>
          <p className="mt-1 text-sm text-[rgba(255,255,255,0.65)]">{APP_TAGLINE}</p>
        </div>
        <div className="max-w-md">
          <p className="text-xl leading-snug font-medium text-white">
            Seguimiento de las asesorías entre estudiantes y directores, con alertas tempranas para
            la coordinación del programa.
          </p>
          <p className="mt-4 text-sm text-[rgba(255,255,255,0.65)]">
            Asignación → seguimiento → asesorías → compromisos → alertas.
          </p>
        </div>
        <p className="text-xs text-[rgba(255,255,255,0.5)]">
          El acceso lo crea la administración del programa. No hay registro público.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <p className="text-xl font-semibold text-ink">{APP_NAME}</p>
            <p className="mt-0.5 mb-6 text-sm text-ink-soft">{APP_TAGLINE}</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Iniciar sesión</h1>
          <p className="mt-1 mb-6 text-sm text-ink-soft">
            Usa el correo institucional que registró la coordinación.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
