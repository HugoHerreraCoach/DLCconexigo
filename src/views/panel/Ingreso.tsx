import Image from "next/image";
import { LockKeyhole } from "lucide-react";
import { ingresar } from "@/app/panel/acciones";

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="trama-lotes flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-8">
        <Image src="/brand/dlc-blanco.png" alt="Grupo DLC" width={96} height={40} className="mb-6 h-8 w-auto" />
        {children}
      </div>
    </main>
  );
}

export function Ingreso({ error }: { error: boolean }) {
  return (
    <Marco>
      <h1 className="font-display text-xl font-semibold">Panel de medición</h1>
      <p className="mt-1 text-sm text-tinta-2">Finca Algarrobo · acceso restringido</p>
      <form action={ingresar} className="mt-6">
        <label htmlFor="contrasena" className="mb-2 block text-sm text-neutral-300">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={error}
          aria-describedby={error ? "contrasena-e" : undefined}
          className={`h-12 w-full rounded-xl border bg-white/[0.04] px-4 text-base text-white focus:outline-none ${
            error ? "border-red-400/70" : "border-white/10 focus:border-dlc"
          }`}
        />
        {error && (
          <p id="contrasena-e" className="mt-2 text-sm text-red-300">
            Contraseña incorrecta.
          </p>
        )}
        <button
          type="submit"
          className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-dlc font-semibold text-neutral-950 transition-colors hover:bg-dlc-claro"
        >
          <LockKeyhole className="size-4" aria-hidden="true" />
          Entrar
        </button>
      </form>
    </Marco>
  );
}

export function PanelSinConfigurar() {
  return (
    <Marco>
      <h1 className="font-display text-xl font-semibold">Panel sin activar</h1>
      <p className="mt-3 text-sm leading-relaxed text-tinta-2">
        Falta definir la contraseña del panel. En Vercel → proyecto → <em>Settings → Environment Variables</em>, crea{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-dlc">PANEL_PASSWORD</code> y vuelve a desplegar.
      </p>
    </Marco>
  );
}
