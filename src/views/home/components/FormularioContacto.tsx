"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import {
  CONSULTA_INICIAL,
  INICIALES,
  MOTIVOS,
  SIGUIENTE_PASO,
  UBICACIONES_LOTE,
  type Consulta,
} from "@/config/contenido";
import { EASE } from "@/shared/lib/motion";
import { rastrearLead } from "@/shared/lib/pixeles";
import { abrirWhatsApp, enlaceWhatsApp } from "@/shared/lib/whatsapp";

/* El formulario NO guarda nada: arma el mensaje y abre WhatsApp con él.
   Así el lead llega directo a la conversación del asesor (el canal donde DLC
   ya cierra) y no hace falta backend. Si luego se conecta al CRM de Conexigo,
   este es el único punto a cambiar. */

type Estado = "reposo" | "enviando" | "enviado";
type Campos = Consulta & { nombre: string; celular: string; paso: (typeof SIGUIENTE_PASO)[number] };
type Errores = Partial<Record<"nombre" | "celular", string>>;

function validar(c: Campos): Errores {
  const e: Errores = {};
  if (c.nombre.trim().length < 2) e.nombre = "Escribe tu nombre.";
  if (c.celular.replace(/\D/g, "").length < 9) e.celular = "Escribe un celular válido de 9 dígitos.";
  return e;
}

const claseCampo = (error?: string) =>
  `h-12 w-full rounded-xl border bg-white/[0.04] px-4 text-base text-white placeholder:text-neutral-500 transition-colors focus:bg-white/[0.06] focus:outline-none ${
    error ? "border-red-400/70 focus:border-red-400" : "border-white/10 hover:border-white/20 focus:border-dlc"
  }`;

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  return (
    <AnimatePresence>
      {texto && (
        <motion.p id={id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-sm text-red-300">
          {texto}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Selector<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: T;
  opciones: readonly T[];
  onCambio: (v: T) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm text-neutral-300">
        {etiqueta}
      </label>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value as T)} className={`${claseCampo()} cursor-pointer`}>
        {opciones.map((o) => (
          <option key={o} className="bg-neutral-900">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FormularioContacto() {
  const [campos, setCampos] = useState<Campos>({ ...CONSULTA_INICIAL, nombre: "", celular: "", paso: SIGUIENTE_PASO[0] });
  const [errores, setErrores] = useState<Errores>({});
  const [intentado, setIntentado] = useState(false);
  const [estado, setEstado] = useState<Estado>("reposo");
  const idNombre = useId();
  const idCelular = useId();

  const actualizar = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    const nuevos = { ...campos, [k]: v };
    setCampos(nuevos);
    // Tras el primer intento, se revalida en vivo para que el error desaparezca al corregir.
    if (intentado) setErrores(validar(nuevos));
  };

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (estado !== "reposo") return;
    setIntentado(true);
    const errs = validar(campos);
    setErrores(errs);
    if (errs.nombre) return document.getElementById(idNombre)?.focus();
    if (errs.celular) return document.getElementById(idCelular)?.focus();

    const mensaje = [
      `Hola Grupo DLC, soy ${campos.nombre.trim()}.`,
      `Me interesa Finca Algarrobo para: ${campos.motivo.toLowerCase()}.`,
      `Inicial: ${campos.inicial} · Ubicación del lote: ${campos.ubicacion.toLowerCase()}.`,
      `Quisiera: ${campos.paso.toLowerCase()}.`,
      `Mi celular: ${campos.celular.replace(/\D/g, "")}.`,
    ].join("\n");

    // abrirWhatsApp abre la pestaña DENTRO del gesto del usuario (si no, el
    // navegador la bloquea) y le pone el número de referencia en la primera
    // línea cuando el servidor lo asigna; la animación del botón corre en paralelo.
    const datos = { motivo: campos.motivo, inicial: campos.inicial, ubicacion: campos.ubicacion, paso: campos.paso };
    void abrirWhatsApp(enlaceWhatsApp(mensaje), () => rastrearLead("formulario-hero", datos));
    setEstado("enviando");
    setTimeout(() => setEstado("enviado"), 700);
    setTimeout(() => setEstado("reposo"), 4000);
  };

  return (
    <form
      id="formulario"
      onSubmit={enviar}
      noValidate
      aria-labelledby="formulario-titulo"
      className="scroll-mt-6 rounded-[2rem] border border-white/15 bg-neutral-950/65 p-6 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8"
    >
      <p id="formulario-titulo" className="font-display text-2xl font-medium">
        Recibe la ficha y tu <span className="text-dlc">plan de cuotas</span>
      </p>
      <p className="mt-1 text-sm text-tinta-2">Un asesor te escribe por WhatsApp. Sin compromiso.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={idNombre} className="mb-2 block text-sm text-neutral-300">
            Nombre
          </label>
          <input
            id={idNombre}
            autoComplete="name"
            placeholder="Tu nombre"
            value={campos.nombre}
            onChange={(e) => actualizar("nombre", e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={errores.nombre ? `${idNombre}-e` : undefined}
            className={claseCampo(errores.nombre)}
          />
          <MensajeError id={`${idNombre}-e`} texto={errores.nombre} />
        </div>
        <div>
          <label htmlFor={idCelular} className="mb-2 block text-sm text-neutral-300">
            Celular
          </label>
          <input
            id={idCelular}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="9XX XXX XXX"
            value={campos.celular}
            onChange={(e) => actualizar("celular", e.target.value)}
            aria-invalid={Boolean(errores.celular)}
            aria-describedby={errores.celular ? `${idCelular}-e` : undefined}
            className={claseCampo(errores.celular)}
          />
          <MensajeError id={`${idCelular}-e`} texto={errores.celular} />
        </div>
        <Selector etiqueta="Lo quiero para" valor={campos.motivo} opciones={MOTIVOS} onCambio={(v) => actualizar("motivo", v)} />
        <Selector etiqueta="Inicial" valor={campos.inicial} opciones={INICIALES} onCambio={(v) => actualizar("inicial", v)} />
        <Selector
          etiqueta="Ubicación del lote"
          valor={campos.ubicacion}
          opciones={UBICACIONES_LOTE}
          onCambio={(v) => actualizar("ubicacion", v)}
        />
        <Selector etiqueta="Me gustaría" valor={campos.paso} opciones={SIGUIENTE_PASO} onCambio={(v) => actualizar("paso", v)} />
      </div>

      {/* Micro-interacción: el botón cambia de forma y contenido según el estado */}
      <motion.button
        type="submit"
        layout
        disabled={estado !== "reposo"}
        aria-live="polite"
        whileHover={estado === "reposo" ? { y: -2 } : undefined}
        whileTap={estado === "reposo" ? { scale: 0.97 } : undefined}
        transition={{ layout: { duration: 0.35, ease: EASE } }}
        style={{ borderRadius: 12 }}
        className={`group mt-6 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-3 overflow-hidden px-7 font-semibold whitespace-nowrap transition-colors disabled:cursor-default ${
          estado === "enviado" ? "bg-emerald-500 text-neutral-950" : "bg-dlc text-neutral-950 hover:bg-dlc-claro"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {estado === "reposo" && (
            <motion.span key="reposo" className="flex items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              Enviar por WhatsApp
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </motion.span>
          )}
          {estado === "enviando" && (
            <motion.span key="enviando" className="flex items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Preparando…
            </motion.span>
          )}
          {estado === "enviado" && (
            <motion.span key="enviado" className="flex items-center gap-3" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
              <Check className="size-5" strokeWidth={3} aria-hidden="true" />
              ¡Listo! Te esperamos
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <p className="mt-3 text-center text-xs text-tinta-3">Se abrirá WhatsApp con tu mensaje listo. No guardamos tus datos.</p>
    </form>
  );
}
