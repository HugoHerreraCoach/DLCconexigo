"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { marcaRastro } from "@/config/rastros";
import { NAVEGACION } from "@/config/sitio";
import { EASE } from "@/shared/lib/motion";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
      // `absolute`, no `fixed`: el menú se queda arriba, sobre la portada, y
      // desaparece al bajar (pedido del cliente).
      className="absolute inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4"
    >
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-neutral-950/60 shadow-lg backdrop-blur-xl">
        <nav className="flex h-13 items-center justify-between pr-3 pl-3 sm:h-[4.25rem] sm:pr-4 sm:pl-5" aria-label="Principal">
          <a href="#inicio" aria-label="Grupo DLC, ir al inicio" className="flex items-center rounded-lg">
            <Image src="/brand/dlc-blanco.png" alt="Grupo DLC" width={684} height={338} priority className="h-7 w-auto sm:h-9" />
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {NAVEGACION.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="group relative inline-flex h-10 items-center px-3.5 text-sm text-neutral-300 transition-colors hover:text-white"
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3.5 bottom-1.5 h-px origin-left scale-x-0 bg-dlc transition-transform duration-300 group-hover:scale-x-100"
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center">
            <a
              href={enlaceWhatsApp(MENSAJES.general)}
              {...marcaRastro("header-agendar-visita")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(37,211,102,0.3)] transition-all hover:bg-[#20bd5a] hover:shadow-[0_4px_14px_rgba(37,211,102,0.4)] active:scale-95 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <IconoWhatsApp className="size-3.5 shrink-0 sm:size-4.5" />
              <span>Ir a WhatsApp</span>
            </a>
          </div>
        </nav>
      </div>
    </motion.header>
  );
}

