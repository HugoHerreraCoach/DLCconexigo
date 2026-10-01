"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X, Calendar, Headset } from "lucide-react";
import { marcaRastro } from "@/config/rastros";
import { enlaceWhatsApp, MENSAJES, mensajeConNombre } from "@/shared/lib/whatsapp";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

const OPCIONES_CHAT = [
  {
    icono: Calendar,
    titulo: "Agendar visita este fin de semana",
    mensaje: MENSAJES.visita,
  },
  {
    icono: Headset,
    titulo: "Quiero que me contacte un asesor ahora mismo",
    mensaje: MENSAJES.asesor,
  },
] as const;

export function WhatsAppFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [textoMensaje, setTextoMensaje] = useState("");
  const [burbujaVisible, setBurbujaVisible] = useState(false);

  // Muestra un globo sugerente después de 3 segundos si aún no se abrió el chat
  useEffect(() => {
    const timer = setTimeout(() => {
      setBurbujaVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  const abrirChat = () => {
    setAbierto((prev) => !prev);
    setBurbujaVisible(false);
  };

  const enlaceMensajePersonalizado = enlaceWhatsApp(
    textoMensaje.trim()
      ? mensajeConNombre(`Hola Grupo DLC, ${textoMensaje.trim()}`)
      : mensajeConNombre(MENSAJES.general)
  );

  return (
    <div className="fixed right-3 bottom-3 z-50 flex flex-col items-end sm:right-6 sm:bottom-6">
      {/* Ventana de Webchat interactiva */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="mb-3 w-[calc(100vw-24px)] max-w-[360px] overflow-hidden rounded-[1.75rem] border border-white/15 bg-neutral-950/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:max-w-[380px]"
          >
            {/* Cabecera del chat con línea dorada DLC */}
            <div className="relative border-b border-white/10 bg-gradient-to-b from-neutral-900 via-neutral-900/90 to-neutral-950 px-4 py-3.5">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-dlc/80 via-dlc-claro to-dlc/80"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-dlc/60 shadow-md">
                    <Image
                      src="/brand/asesora.jpg"
                      alt="Asesora Grupo DLC"
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#25D366] ring-2 ring-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-white">
                      Asesora Grupo DLC
                    </h3>
                    <p className="flex items-center gap-1.5 text-xs text-neutral-300">
                      <span className="size-2 rounded-full bg-[#25D366] animate-pulse" />
                      En línea · Finca Algarrobo
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="inline-flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Cerrar chat"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Mensajes del Asesor */}
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3 sm:max-h-[55vh]">
              <div className="flex items-end gap-2">
                <div className="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
                  <Image
                    src="/brand/asesora.jpg"
                    alt="Asesora"
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-neutral-900 border border-white/10 p-3 text-xs leading-relaxed text-neutral-200 shadow-sm">
                  <p>
                    ¡Hola! 👋 Soy tu asesora en <strong>Grupo DLC</strong>.
                  </p>
                  <p className="mt-1 text-neutral-300">
                    Estamos en preventa de terrenos campestres desde{" "}
                    <strong className="text-dlc">S/ 58,000</strong> a 15 min del
                    Real Plaza de Chiclayo, Capote, a 3 min de la zona urbana.
                    ¿Cómo te podemos ayudar hoy?
                  </p>
                </div>
              </div>

              {/* Opciones interactivas rápidas */}
              <div className="pt-1 space-y-2">
                <p className="text-[11px] font-medium text-neutral-400 px-1">
                  Opciones rápidas para hablar por WhatsApp:
                </p>
                {OPCIONES_CHAT.map((opcion) => {
                  const Icono = opcion.icono;
                  return (
                    <a
                      key={opcion.titulo}
                      href={enlaceWhatsApp(mensajeConNombre(opcion.mensaje))}
                      {...marcaRastro("whatsapp-flotante")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-neutral-200 transition-all hover:border-dlc/50 hover:bg-dlc/[0.08] hover:text-white"
                    >
                      <span className="flex items-center gap-2.5 font-medium">
                        <Icono className="size-4 shrink-0 text-dlc group-hover:scale-110 transition-transform" />
                        {opcion.titulo}
                      </span>
                      <IconoWhatsApp className="size-3.5 shrink-0 text-[#25D366] opacity-80 group-hover:opacity-100" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Input personalizado y botón enviar por WhatsApp */}
            <div className="border-t border-white/10 bg-neutral-900/60 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.open(enlaceMensajePersonalizado, "_blank");
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Escribe tu mensaje aquí..."
                  value={textoMensaje}
                  onChange={(e) => setTextoMensaje(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 text-xs text-white placeholder:text-neutral-500 focus:border-dlc focus:outline-none transition-colors"
                />
                <a
                  href={enlaceMensajePersonalizado}
                  {...marcaRastro("whatsapp-flotante")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm transition-all hover:bg-[#20bd5a] hover:scale-105 active:scale-95"
                  aria-label="Enviar por WhatsApp"
                >
                  <Send className="size-4" />
                </a>
              </form>
              <p className="mt-2 text-center text-[10px] text-neutral-400">
                ⚡ Te atenderemos directamente por WhatsApp sin compromiso
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Globo informativo emergente inicial cuando el chat está cerrado */}
      <AnimatePresence>
        {!abierto && burbujaVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="mb-2 relative flex items-center gap-2 rounded-2xl border border-white/15 bg-neutral-900/95 px-3.5 py-2 text-xs text-neutral-200 shadow-xl backdrop-blur-md"
          >
            <span>
              👋 ¡Hola! ¿Deseas información de los lotes?
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBurbujaVisible(false);
              }}
              className="text-neutral-400 hover:text-white"
              aria-label="Cerrar sugerencia"
            >
              <X className="size-3.5" />
            </button>
            {/* Pequeño pico hacia el botón */}
            <span className="absolute -bottom-1.5 right-8 size-3 rotate-45 border-r border-b border-white/15 bg-neutral-900/95" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón flotante tipo Widget: Pill con Avatar, ASESOR EN LÍNEA y ¡Hablemos! 👋 */}
      <button
        type="button"
        onClick={abrirChat}
        aria-expanded={abierto}
        aria-label="Abrir chat con asesor en línea"
        className="group relative flex items-center gap-3 rounded-full border border-neutral-200/90 bg-white/95 py-1.5 pr-4 pl-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_18px_44px_rgba(0,0,0,0.6)] active:scale-95 text-left cursor-pointer"
      >
        {/* Avatar con anillo y punto verde indicador activo */}
        <div className="relative size-12 sm:size-13 shrink-0 overflow-hidden rounded-full ring-2 ring-[#fdb90c] shadow-sm">
          <Image
            src="/brand/asesora.jpg"
            alt="Asesora en línea"
            fill
            sizes="52px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Indicador verde de en línea con animación de pulso */}
          <span className="absolute bottom-0 right-0 flex size-3.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10b981] opacity-75" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-white bg-[#10b981]" />
          </span>
        </div>

        {/* Textos del widget: EN LÍNEA y ¡Hablemos! 👋 */}
        <div className="flex flex-col leading-tight pl-0.5">
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-[#059669] uppercase sm:text-[11px]">
            <span className="size-1.5 rounded-full bg-[#10b981] animate-pulse" />
            ASESOR EN LÍNEA
          </span>
          <span className="font-display text-sm sm:text-[15px] font-extrabold text-neutral-900 flex items-center gap-1">
            ¡Hablemos!
            <motion.span
              animate={{ rotate: [0, 16, -10, 16, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 2.5 }}
              className="inline-block origin-bottom-right"
            >
              👋
            </motion.span>
          </span>
        </div>

        {/* Icono de WhatsApp en la pastilla */}
        <span className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_2px_8px_rgba(37,211,102,0.4)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 sm:size-8.5">
          <IconoWhatsApp className="size-4.5" />
        </span>
      </button>
    </div>
  );
}

