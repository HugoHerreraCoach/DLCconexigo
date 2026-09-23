"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, Quote } from "lucide-react";
import { TESTIMONIOS } from "@/config/contenido";
import { EASE } from "@/shared/lib/motion";
import { Encabezado } from "@/shared/ui/Encabezado";

const INTERVALO = 7000;
const UMBRAL_ARRASTRE = 80;

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export function Testimonios() {
  const [[indice, direccion], setEstado] = useState<[number, number]>([0, 0]);
  const [pausado, setPausado] = useState(false); // pausa explícita del usuario
  const [enFoco, setEnFoco] = useState(false); // hover o foco dentro del carrusel
  const reducir = useReducedMotion();
  const autoplay = !pausado && !enFoco && !reducir;

  const ir = useCallback((paso: number) => {
    setEstado(([i]) => [(i + paso + TESTIMONIOS.length) % TESTIMONIOS.length, paso]);
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => ir(1), INTERVALO);
    return () => clearInterval(t);
  }, [autoplay, ir, indice]);

  const t = TESTIMONIOS[indice];

  return (
    <section id="testimonios" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Encabezado
          centrado
          etiqueta="Testimonios"
          titulo={
            <>
              Ellos ya dieron <span className="font-semibold text-dlc">el primer paso</span>
            </>
          }
        />

        <div
          role="region"
          aria-roledescription="carrusel"
          aria-label="Testimonios de clientes"
          onMouseEnter={() => setEnFoco(true)}
          onMouseLeave={() => setEnFoco(false)}
          onFocus={() => setEnFoco(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setEnFoco(false)}
          className="relative mx-auto mt-14 max-w-4xl"
        >
          <div
            className="relative overflow-hidden rounded-[2rem] border border-borde bg-superficie px-6 py-12 sm:px-16 sm:py-16"
            aria-live={autoplay ? "off" : "polite"}
          >
            <Quote aria-hidden="true" className="absolute top-8 left-8 size-16 text-dlc/10 sm:size-24" />

            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={indice}
                initial={{ opacity: 0, x: direccion >= 0 ? 48 : -48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direccion >= 0 ? -48 : 48 }}
                transition={{ duration: 0.45, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -UMBRAL_ARRASTRE) ir(1);
                  else if (info.offset.x > UMBRAL_ARRASTRE) ir(-1);
                }}
                role="group"
                aria-roledescription="testimonio"
                aria-label={`${indice + 1} de ${TESTIMONIOS.length}`}
                className="relative cursor-grab text-center active:cursor-grabbing"
              >
                <blockquote className="font-display text-2xl leading-snug font-light text-balance sm:text-3xl">
                  “{t.cita}”
                </blockquote>
                <figcaption className="mt-10 flex items-center justify-center gap-4">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-14 items-center justify-center rounded-full bg-dlc font-display text-lg font-semibold text-neutral-950"
                  >
                    {iniciales(t.nombre)}
                  </span>
                  <span className="text-left">
                    <span className="block font-medium">{t.nombre}</span>
                    <span className="block text-sm text-tinta-2">{t.rol}</span>
                  </span>
                </figcaption>
                {t.ilustrativo && (
                  <p className="mt-6 text-xs tracking-wide text-tinta-3">Testimonio ilustrativo</p>
                )}
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Controles */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => ir(-1)}
              aria-label="Testimonio anterior"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 transition-colors hover:border-dlc hover:text-dlc"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2 px-2">
              {TESTIMONIOS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEstado([i, i > indice ? 1 : -1])}
                  aria-label={`Ir al testimonio ${i + 1}`}
                  aria-current={i === indice}
                  className="group flex h-11 cursor-pointer items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      i === indice ? "w-8 bg-dlc" : "w-1.5 bg-white/25 group-hover:bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => ir(1)}
              aria-label="Testimonio siguiente"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 transition-colors hover:border-dlc hover:text-dlc"
            >
              <ChevronRight className="size-5" />
            </button>

            {!reducir && (
              <button
                type="button"
                onClick={() => setPausado((v) => !v)}
                aria-label={pausado ? "Reanudar rotación automática" : "Pausar rotación automática"}
                className="ml-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-dlc"
              >
                {pausado ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
