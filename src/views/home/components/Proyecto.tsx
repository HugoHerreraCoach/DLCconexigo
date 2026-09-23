"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { ESPACIOS } from "@/config/contenido";
import { OFERTA, SITIO } from "@/config/sitio";
import { alEntrar, EASE, escalonar, subir } from "@/shared/lib/motion";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { Encabezado } from "@/shared/ui/Encabezado";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";
import { PlanoMaestro } from "./PlanoMaestro";

const FICHA = [
  { dato: OFERTA.metraje, texto: "lotes desde" },
  { dato: OFERTA.precioDesde, texto: "precio de preventa" },
  { dato: OFERTA.separaDesde, texto: "para separar" },
  { dato: OFERTA.inicialDesde, texto: "inicial desde" },
];

const INCLUYE = [
  "Pórtico de ingreso",
  "Cerco perimétrico",
  "Cerco vivo en cada lote",
  "Calles afirmadas",
  "Agua para riego (pozo tubular)",
  "Alumbrado con paneles solares",
];

export function Proyecto() {
  return (
    <section id="proyecto" aria-labelledby="titulo-proyecto" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Encabezado
          id="titulo-proyecto"
          etiqueta="Proyecto destacado"
          titulo={
            <>
              Finca Algarrobo, <span className="font-semibold text-dlc">tu lugar en el campo</span>
            </>
          }
          bajada="Un condominio campestre cercado, a 15 minutos del Real Plaza de Chiclayo, pensado para disfrutarlo desde el primer fin de semana."
        />

        {/* Tarjeta destacada del proyecto */}
        <motion.article
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mt-14 grid overflow-hidden rounded-[2rem] border border-borde bg-superficie lg:grid-cols-[1.05fr_1fr]"
        >
          <div className="p-4 sm:p-6">
            <PlanoMaestro />
          </div>

          <div className="flex flex-col p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-dlc px-3 py-1 text-xs font-semibold text-neutral-950">Preventa</span>
              <span className="flex items-center gap-1.5 text-sm text-tinta-2">
                <MapPin className="size-4 text-dlc" aria-hidden="true" />
                Capote, carretera a Ferreñafe
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
              {FICHA.map((f) => (
                <div key={f.texto} className="flex flex-col-reverse">
                  <dt className="text-sm text-tinta-2">{f.texto}</dt>
                  <dd className="font-display text-3xl font-medium">{f.dato}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 rounded-xl border border-dlc/25 bg-dlc/[0.06] px-4 py-3 text-sm text-neutral-200">
              <strong className="text-dlc">{OFERTA.interes} de interés</strong> y financiamiento directo hasta en{" "}
              {OFERTA.meses} meses. El precio varía según metraje y ubicación del lote.
            </p>

            <ul className="mt-8 grid gap-3 border-t border-borde pt-6 sm:grid-cols-2">
              {INCLUYE.map((i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-neutral-300">
                  <Check className="size-4 shrink-0 text-dlc" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3 pt-10 sm:flex-row">
              <a
                href={enlaceWhatsApp(MENSAJES.visita)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-dlc px-6 font-semibold whitespace-nowrap text-neutral-950 transition-colors hover:bg-dlc-claro"
              >
                <IconoWhatsApp className="size-5" />
                Agenda tu visita
              </a>
              <a
                href={enlaceWhatsApp(MENSAJES.ficha)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-6 font-medium whitespace-nowrap transition-colors hover:border-dlc hover:text-dlc"
              >
                Pide la ficha
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </motion.article>

        {/* Espacios del condominio */}
        <motion.h3
          {...alEntrar}
          variants={subir}
          className="mt-24 font-display text-2xl font-light sm:text-3xl"
        >
          Lo que vas a <span className="font-semibold text-dlc">disfrutar</span>
        </motion.h3>

        <motion.ul {...alEntrar} variants={escalonar(0.1)} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ESPACIOS.map((e) => (
            <motion.li key={e.titulo} variants={subir}>
              <article className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-borde sm:aspect-[4/4.4]">
                <Image
                  src={e.imagen}
                  alt={e.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-neutral-950/95 via-neutral-950/30 to-transparent" />
                <span className="absolute top-4 right-4 rounded-full bg-neutral-950/60 px-2.5 py-1 text-[0.65rem] text-white/70 backdrop-blur-md">
                  Imagen referencial
                </span>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="mb-3 block h-0.5 w-8 bg-dlc transition-all duration-500 group-hover:w-14" aria-hidden="true" />
                  <h4 className="font-display text-2xl font-medium">{e.titulo}</h4>
                  <p className="mt-1 text-neutral-300">{e.texto}</p>
                </div>
              </article>
            </motion.li>
          ))}
        </motion.ul>

        <p className="mt-6 text-sm text-tinta-3">
          Servicios acordes al concepto campestre. Ubicación: {SITIO.direccion}.
        </p>
      </div>
    </section>
  );
}
