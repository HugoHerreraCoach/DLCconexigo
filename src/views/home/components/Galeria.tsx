"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { idRastro, marcaRastro } from "@/config/rastros";
import { alEntrar, EASE, escalonar, subir } from "@/shared/lib/motion";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { Encabezado } from "@/shared/ui/Encabezado";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

const FOTOS = [
  {
    src: "/galeria/letrero-bienvenida.jpg",
    alt: "Render del letrero de bienvenida a Finca Algarrobo",
    etiqueta: "Bienvenida",
  },
  {
    src: "/galeria/plaza-aerea.jpg",
    alt: "Vista aérea del render de la plaza central con fuente y casas de Finca Algarrobo",
    etiqueta: "Vista aérea",
  },
  {
    src: "/galeria/gimnasio-aire-libre.png",
    alt: "Render del gimnasio al aire libre de Finca Algarrobo",
    etiqueta: "Gimnasio al aire libre",
  },
  {
    src: "/galeria/cancha-basquet-aerea.png",
    alt: "Vista aérea del render de las canchas de básquet de Finca Algarrobo",
    etiqueta: "Cancha de básquet",
  },
  {
    src: "/galeria/cancha-futbol-aerea.png",
    alt: "Vista aérea del render de la cancha de fútbol de Finca Algarrobo",
    etiqueta: "Cancha de fútbol",
  },
] as const;

/* Recorrido en video: preload="none" para no gastar datos de quien no le da
   play (el navegador solo pide el archivo al hacer clic). */
export function Galeria() {
  return (
    <section id="galeria" aria-labelledby="titulo-galeria" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Encabezado
          id="titulo-galeria"
          etiqueta="Galería y video"
          titulo={
            <>
              Así se ve <span className="font-semibold text-dlc">Finca Algarrobo</span>
            </>
          }
          bajada="Renders del proyecto y un recorrido en video para que conozcas cada espacio antes de tu visita."
        />

        {/* Recorrido en video */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mt-14 overflow-hidden rounded-[2rem] border border-borde bg-superficie"
        >
          <div className="relative aspect-video bg-neutral-950">
            <video
              controls
              preload="none"
              playsInline
              poster="/galeria/porton-ingreso.jpg"
              aria-label="Recorrido en video de Finca Algarrobo"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/galeria/video-recorrido.mp4" type="video/mp4" />
              Tu navegador no puede reproducir este video. <a href="/galeria/video-recorrido.mp4">Descárgalo aquí</a>.
            </video>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="font-medium">Recorrido en video</p>
              <p className="text-sm text-tinta-2">Un paseo de 38 segundos por Finca Algarrobo.</p>
            </div>
            <a
              href={enlaceWhatsApp(MENSAJES.video)}
              {...marcaRastro(idRastro("galeria-video-whatsapp"))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-dlc transition-colors hover:text-dlc-claro"
            >
              <IconoWhatsApp className="size-4" />
              Enviármelo por WhatsApp
            </a>
          </div>
        </motion.div>

        {/* Renders del proyecto */}
        <motion.ul {...alEntrar} variants={escalonar(0.08, 0.1)} className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {FOTOS.map((f, i) => (
            <motion.li key={f.src} variants={subir} className={i === 0 ? "col-span-2" : ""}>
              <figure className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-borde">
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  sizes={i === 0 ? "(min-width: 640px) 66vw, 100vw" : "(min-width: 640px) 33vw, 50vw"}
                  className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent" />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-neutral-950/60 px-2.5 py-1 text-[0.7rem] text-white/80 backdrop-blur-md">
                  {f.etiqueta}
                </figcaption>
              </figure>
            </motion.li>
          ))}
        </motion.ul>

        <p className="mt-6 text-sm text-tinta-3">Renders del proyecto, sujetos a variaciones en obra.</p>
      </div>
    </section>
  );
}
