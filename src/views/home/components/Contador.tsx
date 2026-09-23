"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

type Props = {
  hasta: number;
  prefijo?: string;
  sufijo?: string;
  duracion?: number;
};

const formato = new Intl.NumberFormat("en-US");

/** Cuenta de 0 al valor cuando entra en pantalla. Con "reducir movimiento"
 *  muestra el valor final directo. El número final va siempre en el DOM
 *  (sr-only) para lectores de pantalla, sin anunciar cada cuadro. */
export function Contador({ hasta, prefijo = "", sufijo = "", duracion = 2 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true, margin: "-40px" });
  const reducir = useReducedMotion();
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!visible || reducir) return;
    const control = animate(0, hasta, {
      duration: duracion,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValor(Math.round(v)),
    });
    return () => control.stop();
  }, [visible, reducir, hasta, duracion]);

  const mostrado = reducir ? hasta : valor;

  return (
    <span ref={ref}>
      {/* Unidades (S/, m², min…) a menor escala que la cifra: jerarquía y
          ancho contenido en tarjetas estrechas. */}
      <span aria-hidden="true" className="tabular-nums">
        {prefijo && <span className="mr-1 text-[0.5em]">{prefijo.trim()}</span>}
        {formato.format(mostrado)}
        {sufijo && <span className="ml-1 text-[0.5em]">{sufijo.trim()}</span>}
      </span>
      <span className="sr-only">
        {prefijo}
        {formato.format(hasta)}
        {sufijo}
      </span>
    </span>
  );
}
