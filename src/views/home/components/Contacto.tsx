"use client";

import { motion } from "framer-motion";
import { ArrowUp, MapPin, Video } from "lucide-react";
import { SITIO } from "@/config/sitio";
import { alEntrar, escalonar, subir } from "@/shared/lib/motion";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { Encabezado } from "@/shared/ui/Encabezado";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

/* El formulario vive en el hero (#formulario). Esta sección cierra la página
   con las otras vías de contacto y un atajo de vuelta al formulario. */
const VIAS = [
  { icono: IconoWhatsApp, titulo: "Escríbenos por WhatsApp", texto: "Respuesta rápida", href: enlaceWhatsApp(MENSAJES.general) },
  { icono: Video, titulo: "¿Estás lejos?", texto: "Pide el video recorrido", href: enlaceWhatsApp(MENSAJES.video) },
  { icono: MapPin, titulo: "Ubicación", texto: SITIO.direccion, href: SITIO.mapa },
];

export function Contacto() {
  return (
    <section id="contacto" className="relative border-t border-borde py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Encabezado
          centrado
          etiqueta="Contacto"
          titulo={
            <>
              Da el <span className="font-semibold text-dlc">primer paso</span> hoy
            </>
          }
          bajada="Un asesor de Grupo DLC te envía la ficha, tu plan de cuotas y los horarios de visita. Sin compromiso."
        />

        <motion.ul {...alEntrar} variants={escalonar(0.08, 0.1)} className="mt-12 grid gap-4 sm:grid-cols-3">
          {VIAS.map((d) => (
            <motion.li key={d.titulo} variants={subir}>
              <a
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-center gap-4 rounded-2xl border border-borde bg-superficie p-5 transition-colors hover:border-dlc/40"
              >
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 text-dlc">
                  <d.icono className="size-5" />
                </span>
                <span>
                  <span className="block font-medium transition-colors group-hover:text-dlc">{d.titulo}</span>
                  <span className="block text-sm text-tinta-2">{d.texto}</span>
                </span>
              </a>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-10 flex justify-center">
          <a
            href="#formulario"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-dlc px-6 font-semibold text-neutral-950 transition-colors hover:bg-dlc-claro"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Ir al formulario
          </a>
        </div>
      </div>
    </section>
  );
}
