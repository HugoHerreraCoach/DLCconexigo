import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

export function WhatsAppFlotante() {
  return (
    <a
      href={enlaceWhatsApp(MENSAJES.general)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed right-4 bottom-4 z-50 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,0.6)] transition-transform hover:scale-105 sm:right-6 sm:bottom-6 sm:size-16"
    >
      <IconoWhatsApp className="size-7 sm:size-8" />
    </a>
  );
}
