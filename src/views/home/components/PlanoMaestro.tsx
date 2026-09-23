"use client";

import { motion } from "framer-motion";

/* Plano ESQUEMÁTICO del condominio. No es el plano de lotización real: sirve
   para que el visitante "vea" el concepto (cerco, pórtico, calles, lotes y
   áreas comunes) mientras no haya fotos ni plano oficial.
   ⚠️ Cuando DLC entregue el plano real, reemplazar por imagen. */

type Lote = { x: number; y: number; w: number; h: number };

function cuadrante(x0: number, y0: number, cols: number, filas: number, w: number, h: number): Lote[] {
  const lotes: Lote[] = [];
  const gap = 6;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      lotes.push({ x: x0 + c * (w + gap), y: y0 + f * (h + gap), w, h });
    }
  }
  return lotes;
}

const LOTES: Lote[] = [
  ...cuadrante(44, 44, 2, 3, 93, 46),
  ...cuadrante(289, 44, 2, 3, 93, 46),
  ...cuadrante(44, 248, 2, 3, 93, 46),
];

// Lote destacado: el primero del cuadrante superior derecho.
const DESTACADO = 6;
const ARBOLES = [
  [308, 352], [334, 372], [360, 348], [392, 376], [420, 350], [452, 372], [466, 344],
];

export function PlanoMaestro() {
  return (
    <figure className="relative overflow-hidden rounded-3xl border border-borde bg-neutral-950 p-4 sm:p-6">
      <svg viewBox="0 0 520 440" role="img" aria-labelledby="plano-titulo" className="h-auto w-full">
        <title id="plano-titulo">
          Esquema del condominio Finca Algarrobo: cerco perimétrico, pórtico de ingreso, calles, lotes desde 500 m²,
          canchas y áreas verdes.
        </title>

        {/* Cerco perimétrico con abertura para el pórtico */}
        <motion.path
          d="M232 420 H38 Q20 420 20 402 V38 Q20 20 38 20 H482 Q500 20 500 38 V402 Q500 420 482 420 H288"
          fill="none"
          stroke="#FDB90C"
          strokeWidth="3"
          strokeDasharray="10 7"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        />

        {/* Calles afirmadas */}
        <rect x="240" y="30" width="40" height="392" fill="#1f1f1f" />
        <rect x="30" y="206" width="460" height="32" fill="#1f1f1f" />
        <line x1="260" y1="40" x2="260" y2="415" stroke="#3a3a3a" strokeWidth="2" strokeDasharray="8 8" />
        <line x1="40" y1="222" x2="480" y2="222" stroke="#3a3a3a" strokeWidth="2" strokeDasharray="8 8" />

        {/* Pórtico de ingreso */}
        <rect x="226" y="410" width="10" height="22" rx="2" fill="#FDB90C" />
        <rect x="284" y="410" width="10" height="22" rx="2" fill="#FDB90C" />
        <rect x="222" y="404" width="76" height="8" rx="2" fill="#FDB90C" />

        {/* Lotes (el borde verde representa el cerco vivo) */}
        {LOTES.map((l, i) => (
          <motion.rect
            key={`${l.x}-${l.y}`}
            x={l.x}
            y={l.y}
            width={l.w}
            height={l.h}
            rx="4"
            fill={i === DESTACADO ? "#FDB90C" : "rgba(253,185,12,0.08)"}
            stroke={i === DESTACADO ? "#FDB90C" : "#5d9a55"}
            strokeWidth="1.5"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.04, duration: 0.4 }}
            style={{ transformOrigin: `${l.x + l.w / 2}px ${l.y + l.h / 2}px` }}
          />
        ))}
        <text x="335" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0a0a0a" fontFamily="inherit">
          500 m²
        </text>

        {/* Cancha con grass sintético */}
        <rect x="289" y="248" width="120" height="74" rx="4" fill="#2f5d2b" stroke="#ffffff" strokeOpacity="0.5" />
        <line x1="349" y1="248" x2="349" y2="322" stroke="#ffffff" strokeOpacity="0.5" />
        <circle cx="349" cy="285" r="12" fill="none" stroke="#ffffff" strokeOpacity="0.5" />

        {/* Mini cancha de básquet */}
        <rect x="417" y="248" width="66" height="74" rx="4" fill="#8a4b2a" stroke="#ffffff" strokeOpacity="0.5" />
        <circle cx="450" cy="285" r="9" fill="none" stroke="#ffffff" strokeOpacity="0.5" />

        {/* Parque, áreas verdes y hamacas */}
        <rect x="289" y="330" width="194" height="66" rx="8" fill="#1d3a1b" />
        {ARBOLES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="10" fill="#5d9a55" />
        ))}
        <path d="M372 356 Q384 366 396 356" fill="none" stroke="#FDB90C" strokeWidth="2" />
      </svg>

      <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-dlc" aria-hidden="true" /> Cerco perimétrico
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm border-2 border-[#5d9a55]" aria-hidden="true" /> Cerco vivo por lote
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-[#2f5d2b]" aria-hidden="true" /> Canchas y parque
        </span>
        <span className="ml-auto text-white/50">Esquema referencial</span>
      </figcaption>
    </figure>
  );
}
