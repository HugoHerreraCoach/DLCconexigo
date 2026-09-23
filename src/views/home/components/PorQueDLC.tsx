"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Landmark, MapPin, Wallet } from "lucide-react";
import { OFERTA, SITIO } from "@/config/sitio";
import { alEntrar, EASE, escalonar, subir } from "@/shared/lib/motion";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { Encabezado } from "@/shared/ui/Encabezado";
import { Contador } from "./Contador";

/* Los tres argumentos que responden las objeciones del estudio de público:
   "¿está lejos?", "es muy caro / miedo a la cuota" y "¿los papeles?". */
const PILARES = [
  {
    id: "ubicacion",
    icono: MapPin,
    titulo: "Ubicación estratégica",
    texto: `A solo ${OFERTA.minutosRealPlaza} minutos del Real Plaza de Chiclayo y a ${OFERTA.minutosZonaUrbana} minutos de la zona urbana. Lo suficientemente cerca para ir cualquier día; lo suficientemente lejos para desconectar.`,
    puntos: ["Carretera a Ferreñafe, en Capote", `${OFERTA.minutosRealPlaza} min del Real Plaza Chiclayo`, "Gran potencial de valorización"],
    enlace: { texto: "Ver en Google Maps", href: SITIO.mapa },
  },
  {
    id: "financiamiento",
    icono: Wallet,
    titulo: "Financiamiento directo",
    texto: `No necesitas tenerlo todo hoy para ser dueño. Separas tu lote con ${OFERTA.separaDesde}, das una inicial desde ${OFERTA.inicialDesde} y pagas el saldo en cuotas, sin bancos y sin intereses.`,
    puntos: [`Separa desde ${OFERTA.separaDesde}`, `Inicial desde ${OFERTA.inicialDesde}`, `Hasta ${OFERTA.meses} meses con ${OFERTA.interes} de interés`],
    enlace: { texto: "Consultar mi plan de cuotas", href: enlaceWhatsApp(MENSAJES.cuotas) },
  },
  {
    id: "legal",
    icono: Landmark,
    titulo: "Papeles claros",
    texto:
      "Sabemos que un terreno es una decisión grande. Por eso te explicamos toda la documentación antes de que firmes nada.",
    puntos: [
      "Terreno matriz inscrito en SUNARP",
      "Minuta y escritura pública elevada a SUNARP",
      "Transferencia mediante acciones y derechos",
    ],
    enlace: { texto: "Consultar la documentación", href: enlaceWhatsApp(MENSAJES.documentos) },
  },
];

const CIFRAS = [
  { hasta: 500, sufijo: " m²", texto: "lotes desde" },
  { hasta: OFERTA.minutosRealPlaza, sufijo: " min", texto: "del Real Plaza Chiclayo" },
  { hasta: OFERTA.meses, sufijo: " meses", texto: `para pagar con ${OFERTA.interes} de interés` },
  { hasta: 500, prefijo: "S/ ", texto: "para separar tu lote" },
];

export function PorQueDLC() {
  const [activo, setActivo] = useState(PILARES[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const pilar = PILARES.find((p) => p.id === activo) ?? PILARES[0];

  // Flechas izquierda/derecha para moverse entre pestañas (patrón ARIA tabs).
  const alTeclear = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const siguiente = (i + (e.key === "ArrowRight" ? 1 : -1) + PILARES.length) % PILARES.length;
    setActivo(PILARES[siguiente].id);
    tabs.current[siguiente]?.focus();
  };

  return (
    <section id="por-que" className="trama-lotes relative overflow-hidden border-y border-borde bg-superficie py-24 sm:py-32">
      <div aria-hidden="true" className="absolute -top-40 -right-40 size-[36rem] rounded-full bg-dlc/10 blur-[120px]" />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <Encabezado
            etiqueta="Por qué Grupo DLC"
            titulo={
              <>
                Todo lo que necesitas para <span className="font-semibold text-dlc">decidir tranquilo</span>
              </>
            }
          />

          <div role="tablist" aria-label="Razones para elegir Finca Algarrobo" className="mt-10 flex flex-col gap-2 sm:flex-row">
            {PILARES.map((p, i) => {
              const sel = p.id === activo;
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  role="tab"
                  id={`tab-${p.id}`}
                  aria-selected={sel}
                  aria-controls="panel-pilar"
                  tabIndex={sel ? 0 : -1}
                  onClick={() => setActivo(p.id)}
                  onKeyDown={(e) => alTeclear(e, i)}
                  className={`relative flex min-h-12 flex-1 cursor-pointer items-center gap-2 rounded-xl px-4 text-left text-sm font-medium transition-colors ${
                    sel ? "text-white" : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {sel && (
                    <motion.span
                      layoutId="pilar-activo"
                      className="absolute inset-0 rounded-xl border border-dlc/40 bg-white/[0.05]"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  <p.icono className={`relative size-4 shrink-0 ${sel ? "text-dlc" : ""}`} aria-hidden="true" />
                  <span className="relative">{p.titulo}</span>
                </button>
              );
            })}
          </div>

          <div id="panel-pilar" role="tabpanel" aria-labelledby={`tab-${pilar.id}`} className="mt-8 min-h-72">
            <AnimatePresence mode="wait">
              <motion.div
                key={pilar.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <p className="text-lg leading-relaxed text-neutral-300">{pilar.texto}</p>
                <ul className="mt-6 space-y-3">
                  {pilar.puntos.map((punto) => (
                    <li key={punto} className="flex items-center gap-3 text-neutral-200">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dlc/50">
                        <Check className="size-3.5 text-dlc" aria-hidden="true" />
                      </span>
                      {punto}
                    </li>
                  ))}
                </ul>
                <a
                  href={pilar.enlace.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-8 inline-flex min-h-11 items-center gap-2 font-medium text-dlc underline-offset-4 hover:underline"
                >
                  {pilar.enlace.texto}
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <motion.dl {...alEntrar} variants={escalonar(0.12)} className="grid grid-cols-2 gap-4">
          {CIFRAS.map((c, i) => (
            <motion.div
              key={c.texto}
              variants={subir}
              className={`flex flex-col-reverse rounded-3xl border border-white/10 bg-neutral-950/60 p-6 backdrop-blur-sm sm:p-8 ${
                i % 2 === 1 ? "sm:translate-y-8" : ""
              }`}
            >
              <dt className="mt-3 text-sm text-neutral-300">{c.texto}</dt>
              <dd className="font-display text-4xl font-medium whitespace-nowrap text-dlc sm:text-5xl">
                <Contador hasta={c.hasta} prefijo={c.prefijo} sufijo={c.sufijo} />
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
