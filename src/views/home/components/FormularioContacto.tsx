"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Gift, Loader2, User } from "lucide-react";
import { INICIALES, MOTIVOS, type Consulta } from "@/config/contenido";
import { EASE } from "@/shared/lib/motion";
import { rastrearLead } from "@/shared/lib/pixeles";
import { abrirWhatsApp, enlaceWhatsApp, guardarNombreLead } from "@/shared/lib/whatsapp";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

type Estado = "reposo" | "enviando" | "enviado";
type Campos = Pick<Consulta, "motivo" | "inicial"> & { nombre: string; celular: string };
type Errores = Partial<Record<"nombre" | "celular", string>>;

function validar(c: Campos): Errores {
  const e: Errores = {};
  if (c.nombre.trim().length < 2) e.nombre = "Escribe tu nombre y apellido.";
  if (c.celular.replace(/\D/g, "").length < 9) e.celular = "Escribe un número de celular de 9 dígitos.";
  return e;
}

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  return (
    <AnimatePresence>
      {texto && (
        <motion.p
          id={id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-1.5 text-xs font-medium text-red-600"
        >
          {texto}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function FormularioContacto() {
  const [campos, setCampos] = useState<Campos>({
    motivo: MOTIVOS[0],
    inicial: INICIALES[0],
    nombre: "",
    celular: "",
  });
  const [errores, setErrores] = useState<Errores>({});
  const [intentado, setIntentado] = useState(false);
  const [estado, setEstado] = useState<Estado>("reposo");
  const idNombre = useId();
  const idCelular = useId();

  const actualizar = <K extends keyof Campos>(k: K, v: Campos[K]) => {
    const nuevos = { ...campos, [k]: v };
    setCampos(nuevos);
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

    const nombre = campos.nombre.trim();
    guardarNombreLead(nombre);

    const mensaje = `Hola, quiero más información del proyecto Finca Algarrobo. Mi nombre es: ${nombre}`;

    const datos = {
      motivo: campos.motivo,
      inicial: campos.inicial,
      ubicacion: "Bono cerco vivo",
      paso: "Reclamar regalo en WhatsApp",
    };

    abrirWhatsApp(enlaceWhatsApp(mensaje), (texto) => rastrearLead("formulario-hero", datos, texto));
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
      className="scroll-mt-6 rounded-[2rem] border border-neutral-200/90 bg-white p-5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.55)] sm:p-7 text-neutral-900 transition-all"
    >
      {/* Título de acción claro */}
      <p id="formulario-titulo" className="text-center text-sm font-medium text-neutral-600 sm:text-base leading-snug">
        Toca el botón de abajo para{" "}
        <strong className="font-extrabold text-neutral-950 block sm:inline">
          reclamarlo por WhatsApp.
        </strong>
      </p>

      {/* Tarjeta destacada de Bono Exclusivo */}
      <div className="mt-3.5 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#fdb90c]/80 bg-[#fffbeb] px-3.5 py-2.5 text-center sm:py-3 shadow-xs">
        <Gift className="size-4.5 text-[#b45309] shrink-0" />
        <span className="text-xs font-extrabold text-[#92400e] sm:text-sm">
          ¡Bono Exclusivo: Cerco vivo en cada lote!
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {/* Campo Nombre y apellidos con ícono */}
        <div>
          <div
            className={`flex items-center h-12 w-full rounded-2xl border bg-neutral-50 px-3.5 transition-all focus-within:bg-white focus-within:ring-2 ${
              errores.nombre
                ? "border-red-500 focus-within:ring-red-200 focus-within:border-red-500"
                : "border-neutral-200 focus-within:border-[#25D366] focus-within:ring-[#25D366]/20"
            }`}
          >
            <User className="size-4.5 text-neutral-400 shrink-0 mr-2.5" />
            <input
              id={idNombre}
              autoComplete="name"
              placeholder="Nombre y apellidos*"
              value={campos.nombre}
              onChange={(e) => {
                actualizar("nombre", e.target.value);
                guardarNombreLead(e.target.value);
              }}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? `${idNombre}-e` : undefined}
              className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none border-none ring-0 shadow-none"
            />
          </div>
          <MensajeError id={`${idNombre}-e`} texto={errores.nombre} />
        </div>

        {/* Campo Celular con bandera y código de Perú +51 */}
        <div>
          <div
            className={`flex items-center h-12 w-full rounded-2xl border bg-neutral-50 px-3.5 transition-all focus-within:bg-white focus-within:ring-2 ${
              errores.celular
                ? "border-red-500 focus-within:ring-red-200 focus-within:border-red-500"
                : "border-neutral-200 focus-within:border-[#25D366] focus-within:ring-[#25D366]/20"
            }`}
          >
            <div className="flex items-center gap-1.5 pr-2.5 mr-2.5 border-r border-neutral-200 shrink-0 select-none">
              <span className="text-base" role="img" aria-label="Bandera de Perú">
                🇵🇪
              </span>
              <span className="text-xs font-bold text-neutral-800 sm:text-sm">+51</span>
            </div>
            <input
              id={idCelular}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Tu número de celular*"
              value={campos.celular}
              onChange={(e) => actualizar("celular", e.target.value)}
              aria-invalid={Boolean(errores.celular)}
              aria-describedby={errores.celular ? `${idCelular}-e` : undefined}
              className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none border-none ring-0 shadow-none"
            />
          </div>
          <MensajeError id={`${idCelular}-e`} texto={errores.celular} />
        </div>

        {/* Selector interactivo: Lo quiero para (Chips clicables) */}
        <div>
          <label className="mb-2 block text-xs font-bold text-neutral-700 uppercase tracking-wide">
            Lo quiero para:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {MOTIVOS.map((m) => {
              const seleccionado = campos.motivo === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => actualizar("motivo", m)}
                  className={`group relative flex h-11 items-center justify-between rounded-xl border px-3 sm:px-3.5 text-center text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                    seleccionado
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/25 shadow-xs"
                      : "border-neutral-200 bg-neutral-50/70 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/80 hover:text-neutral-900"
                  }`}
                >
                  <span className="truncate">{m}</span>
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full transition-all ${
                      seleccionado
                        ? "bg-emerald-600 text-white scale-100"
                        : "border border-neutral-300 bg-white group-hover:border-neutral-400 scale-90"
                    }`}
                  >
                    {seleccionado && <Check className="size-2.5 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector interactivo: Inicial (Chips clicables en cuadrícula) */}
        <div>
          <label className="mb-2 block text-xs font-bold text-neutral-700 uppercase tracking-wide">
            Inicial estimada:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INICIALES.map((ini) => {
              const seleccionado = campos.inicial === ini;
              return (
                <button
                  key={ini}
                  type="button"
                  onClick={() => actualizar("inicial", ini)}
                  className={`group relative flex h-11 items-center justify-between rounded-xl border px-2.5 sm:px-3 text-center transition-all cursor-pointer active:scale-[0.98] ${
                    seleccionado
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/25 shadow-xs"
                      : "border-neutral-200 bg-neutral-50/70 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-100/80 hover:text-neutral-900"
                  }`}
                >
                  <span className="text-[11px] sm:text-xs leading-tight font-semibold text-left truncate mr-1">
                    {ini}
                  </span>
                  <span
                    className={`flex size-3.5 sm:size-4 shrink-0 items-center justify-center rounded-full transition-all ${
                      seleccionado
                        ? "bg-emerald-600 text-white scale-100"
                        : "border border-neutral-300 bg-white group-hover:border-neutral-400 scale-90"
                    }`}
                  >
                    {seleccionado && <Check className="size-2 sm:size-2.5 stroke-[3]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botón CTA Verde WhatsApp interactivo con micro-animaciones */}
      <motion.button
        type="submit"
        layout
        disabled={estado !== "reposo"}
        aria-live="polite"
        whileHover={estado === "reposo" ? { y: -2, scale: 1.01 } : undefined}
        whileTap={estado === "reposo" ? { scale: 0.98 } : undefined}
        transition={{ layout: { duration: 0.35, ease: EASE } }}
        className={`group mt-6 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-6 font-bold text-white shadow-[0_12px_28px_-6px_rgba(37,211,102,0.5)] transition-all disabled:cursor-default ${
          estado === "enviado"
            ? "bg-[#1da851]"
            : "bg-[#25D366] hover:bg-[#20bd5a] hover:shadow-[0_16px_32px_-6px_rgba(37,211,102,0.6)]"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {estado === "reposo" && (
            <motion.span
              key="reposo"
              className="flex items-center justify-center gap-2.5 text-sm sm:text-base tracking-wide uppercase"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <IconoWhatsApp className="size-5 shrink-0" />
              <span>Reclamar regalo en WhatsApp</span>
              <ArrowRight className="size-4.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </motion.span>
          )}
          {estado === "enviando" && (
            <motion.span
              key="enviando"
              className="flex items-center gap-2.5 text-sm sm:text-base"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Conectando con WhatsApp…
            </motion.span>
          )}
          {estado === "enviado" && (
            <motion.span
              key="enviado"
              className="flex items-center gap-2.5 text-sm sm:text-base"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Check className="size-5" strokeWidth={3} aria-hidden="true" />
              ¡Listo! Abriendo WhatsApp…
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Insignia de seguridad y confianza inferior */}
      <div className="mt-3 flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-1.5 text-[11px] font-medium text-neutral-600">
          <span role="img" aria-label="Escudo" className="text-xs">
            🛡️
          </span>
          Canal oficial de comunicación
        </span>
      </div>
    </form>
  );
}

