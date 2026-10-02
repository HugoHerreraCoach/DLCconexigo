"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";

/* Cambio instantáneo entre Meta y TikTok en el panel. Los datos de las dos
   plataformas ya llegan en la misma carga: elegir pestaña solo cambia qué se
   ve, sin volver a pedir la página al servidor (antes cada clic tardaba ~2 s).
   La dirección se actualiza (?p=meta|tiktok) para poder recargar o compartir,
   y los enlaces de período y el filtro de fechas conservan la pestaña elegida. */

type Plataforma = "meta" | "tiktok";

const Contexto = createContext<{ actual: Plataforma; elegir: (p: Plataforma) => void } | null>(null);

function usePlataforma() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("Falta <PlataformaProvider> alrededor del panel");
  return ctx;
}

export function PlataformaProvider({ inicial, children }: { inicial: Plataforma; children: ReactNode }) {
  const [actual, setActual] = useState<Plataforma>(inicial);
  const elegir = (p: Plataforma) => {
    setActual(p);
    const url = new URL(window.location.href);
    url.searchParams.set("p", p);
    window.history.replaceState(window.history.state, "", url);
  };
  return <Contexto.Provider value={{ actual, elegir }}>{children}</Contexto.Provider>;
}

/** Botón de pestaña: `claseActiva` / `claseInactiva` se suman a `className`. */
export function BotonPlataforma({
  valor,
  className,
  claseActiva,
  claseInactiva,
  children,
}: {
  valor: Plataforma;
  className: string;
  claseActiva: string;
  claseInactiva: string;
  children: ReactNode;
}) {
  const { actual, elegir } = usePlataforma();
  const activa = actual === valor;
  return (
    <button
      type="button"
      onClick={() => elegir(valor)}
      aria-pressed={activa}
      className={`cursor-pointer ${className} ${activa ? claseActiva : claseInactiva}`}
    >
      {children}
    </button>
  );
}

/** Muestra su contenido solo cuando su plataforma está elegida. */
export function VistaPlataforma({ cual, children }: { cual: Plataforma; children: ReactNode }) {
  return usePlataforma().actual === cual ? <>{children}</> : null;
}

/** Enlace de período que conserva la pestaña elegida (`href` sin `p`).
 *  Sin precarga: cada precarga ejecuta en el servidor todas las consultas del
 *  panel (base de datos + Meta), y al cambiar de pestaña se repetirían 4. */
export function EnlacePeriodo({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const { actual } = usePlataforma();
  const destino = `${href}${href.includes("?") ? "&" : "?"}p=${actual}`;
  return (
    <Link href={destino} prefetch={false} className={className}>
      {children}
    </Link>
  );
}

/** Campo oculto del filtro de fechas con la pestaña elegida. */
export function InputPlataforma() {
  return <input type="hidden" name="p" value={usePlataforma().actual} />;
}
