"use client";

import { useState } from "react";
import type { Dia } from "@/server/metricas";

/* Columnas por día (apiladas si hay más de una serie), en SVG a mano para no
   sumar una librería de gráficos. Hover/foco muestra el detalle del día y
   "Ver datos" abre la misma información como tabla. */

export type Serie = { clave: "visitas" | "contactos" | "leads"; etiqueta: string; color: string };

const W = 640;
const H = 210;
const M = { izq: 36, der: 8, arr: 10, aba: 26 };
const HUECO = 2;

function techo(n: number) {
  if (n <= 4) return 4;
  const base = 10 ** Math.floor(Math.log10(n));
  return ([1, 2, 5, 10].map((f) => f * base).find((v) => v >= n) ?? 10 * base) as number;
}

/** Barra con solo las esquinas superiores redondeadas; la base queda recta sobre el eje. */
function barra(x: number, y: number, w: number, h: number, redondear: boolean) {
  if (h <= 0) return "";
  const r = redondear ? Math.min(4, h, w / 2) : 0;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function GraficoColumnas({ titulo, dias, series }: { titulo: string; dias: Dia[]; series: Serie[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const n = Math.max(dias.length, 1);
  const anchoPlot = W - M.izq - M.der;
  const altoPlot = H - M.arr - M.aba;
  const banda = anchoPlot / n;
  const anchoBarra = Math.min(28, banda * 0.62);
  const maximo = techo(Math.max(0, ...dias.map((d) => series.reduce((s, x) => s + d[x.clave], 0))));
  const y = (v: number) => M.arr + altoPlot - (v / maximo) * altoPlot;
  const cadaCuanto = Math.ceil(n / 8);
  const dia = activo !== null ? dias[activo] : null;

  return (
    <figure className="min-w-0 rounded-2xl border border-borde bg-superficie p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display font-semibold">{titulo}</span>
        {series.length > 1 && (
          <span className="flex flex-wrap gap-4 text-xs text-tinta-2">
            {series.map((s) => (
              <span key={s.clave} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                {s.etiqueta}
              </span>
            ))}
          </span>
        )}
      </figcaption>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${titulo}, por día`}>
          {[0, maximo / 2, maximo].map((t) => (
            <g key={t}>
              <line x1={M.izq} x2={W - M.der} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#383835" : "#2c2c2a"} strokeWidth={1} />
              <text x={M.izq - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#898781" style={{ fontVariantNumeric: "tabular-nums" }}>
                {t}
              </text>
            </g>
          ))}

          {dias.map((d, i) => {
            const x = M.izq + i * banda + (banda - anchoBarra) / 2;
            const visibles = series.filter((s) => d[s.clave] > 0);
            let acumulado = 0;
            return (
              <g key={d.dia} opacity={activo === null || activo === i ? 1 : 0.45}>
                {visibles.map((s, j) => {
                  const base = y(acumulado);
                  acumulado += d[s.clave];
                  const tope = y(acumulado);
                  const hueco = j > 0 ? HUECO : 0;
                  return <path key={s.clave} d={barra(x, tope, anchoBarra, base - tope - hueco, j === visibles.length - 1)} fill={s.color} />;
                })}
                {i % cadaCuanto === 0 && (
                  <text x={x + anchoBarra / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#898781">
                    {fechaCorta(d.dia)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Zonas de hover más grandes que la barra, una por día. */}
          {dias.map((d, i) => (
            <rect
              key={d.dia}
              x={M.izq + i * banda}
              y={M.arr}
              width={banda}
              height={altoPlot}
              fill="transparent"
              tabIndex={0}
              aria-label={`${fechaCorta(d.dia)}: ${series.map((s) => `${s.etiqueta} ${d[s.clave]}`).join(", ")}`}
              onMouseEnter={() => setActivo(i)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              className="outline-none"
            />
          ))}
        </svg>

        {dia && activo !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900/95 px-3 py-2 text-xs shadow-xl"
            style={{ left: `${((M.izq + (activo + 0.5) * banda) / W) * 100}%` }}
          >
            <p className="mb-1 font-semibold text-tinta">{fechaCorta(dia.dia)}</p>
            {series.map((s) => (
              <p key={s.clave} className="flex items-center justify-between gap-4 text-tinta-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                  {s.etiqueta}
                </span>
                <span className="font-semibold text-tinta tabular-nums">{dia[s.clave]}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-tinta-3 hover:text-tinta-2">Ver datos</summary>
        <table className="mt-2 w-full text-left text-tinta-2">
          <thead>
            <tr className="text-xs text-tinta-3">
              <th className="py-1 font-normal">Día</th>
              {series.map((s) => (
                <th key={s.clave} className="py-1 text-right font-normal">
                  {s.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {dias.map((d) => (
              <tr key={d.dia} className="border-t border-borde">
                <td className="py-1">{fechaCorta(d.dia)}</td>
                {series.map((s) => (
                  <td key={s.clave} className="py-1 text-right">
                    {d[s.clave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
