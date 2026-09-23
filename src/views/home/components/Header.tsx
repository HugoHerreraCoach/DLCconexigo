"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAVEGACION } from "@/config/sitio";
import { EASE } from "@/shared/lib/motion";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";

export function Header() {
  const [abierto, setAbierto] = useState(false);

  // Escape cierra el menú móvil.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
      // `absolute`, no `fixed`: el menú se queda arriba, sobre la portada, y
      // desaparece al bajar (pedido del cliente).
      className="absolute inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6"
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-neutral-950/40 backdrop-blur-xl">
        <nav className="flex h-16 items-center justify-between pr-2 pl-4 sm:h-[4.5rem] sm:pl-5" aria-label="Principal">
          <a href="#inicio" aria-label="Grupo DLC, ir al inicio" className="rounded-lg">
            <Image src="/brand/dlc-blanco.png" alt="Grupo DLC" width={684} height={338} priority className="h-9 w-auto sm:h-10" />
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {NAVEGACION.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="group relative inline-flex h-11 items-center px-4 text-sm text-neutral-300 transition-colors hover:text-white"
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 bottom-2 h-px origin-left scale-x-0 bg-dlc transition-transform duration-300 group-hover:scale-x-100"
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href={enlaceWhatsApp(MENSAJES.visita)}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-11 items-center rounded-xl bg-dlc px-5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-dlc-claro sm:inline-flex"
            >
              Agenda tu visita
            </a>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 md:hidden"
              aria-expanded={abierto}
              aria-controls="menu-movil"
              aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            >
              {abierto ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence initial={false}>
          {abierto && (
            <motion.div
              id="menu-movil"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden md:hidden"
            >
              <ul className="border-t border-white/10 px-2 py-3">
                {NAVEGACION.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setAbierto(false)}
                      className="flex h-12 items-center rounded-xl px-3 text-base text-neutral-200 hover:bg-white/5"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li className="px-1 pt-2">
                  <a
                    href={enlaceWhatsApp(MENSAJES.visita)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setAbierto(false)}
                    className="flex h-12 items-center justify-center rounded-xl bg-dlc text-sm font-semibold text-neutral-950"
                  >
                    Agenda tu visita
                  </a>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
