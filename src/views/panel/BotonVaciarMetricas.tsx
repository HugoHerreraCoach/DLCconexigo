"use client";

import { Trash2 } from "lucide-react";

/** Botón «Vaciar datos de prueba»: pide confirmación antes de enviar el
 *  formulario que borra todas las métricas (la acción además exige sesión). */
export function BotonVaciarMetricas({ className }: { className: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        const ok = window.confirm(
          "Esto borra TODAS las métricas del panel (visitas, clics y formularios) y no se puede deshacer. ¿Continuar?",
        );
        if (!ok) e.preventDefault();
      }}
    >
      <Trash2 className="size-3.5" />
      <span>Vaciar datos de prueba</span>
    </button>
  );
}
