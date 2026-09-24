import Image from "next/image";
import { ArrowUp, MapPin } from "lucide-react";
import { marcaRastro } from "@/config/rastros";
import { NAVEGACION, OFERTA, SITIO } from "@/config/sitio";
import { enlaceWhatsApp, MENSAJES } from "@/shared/lib/whatsapp";
import { IconoWhatsApp } from "@/shared/ui/IconoWhatsApp";

const PROYECTO = [
  { texto: "Planes de financiamiento", href: enlaceWhatsApp(MENSAJES.cuotas), rastro: "footer-financiamiento" },
  { texto: "Pide la ficha del proyecto", href: enlaceWhatsApp(MENSAJES.ficha), rastro: "footer-ficha" },
  { texto: "Video recorrido", href: enlaceWhatsApp(MENSAJES.video), rastro: "footer-video" },
  { texto: "Documentación", href: enlaceWhatsApp(MENSAJES.documentos), rastro: "footer-documentacion" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-borde bg-fondo">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-20 pb-12 sm:px-6 lg:grid-cols-[1.3fr_0.8fr_1fr_1.2fr]">
        <div>
          <Image src="/brand/dlc-blanco.png" alt="Grupo DLC" width={684} height={338} className="h-12 w-auto" />
          <p className="mt-6 max-w-xs leading-relaxed text-tinta-2">
            Terrenos campestres cerca de Chiclayo, con financiamiento directo y papeles claros.
          </p>
          <p className="mt-6 inline-flex rounded-full border border-dlc/30 px-3 py-1 text-xs text-dlc">
            Preventa desde {OFERTA.precioDesde}
          </p>
        </div>

        <nav aria-label="Explora">
          <p className="text-xs font-medium tracking-[0.25em] text-dlc uppercase">Explora</p>
          <ul className="mt-6 space-y-1">
            {NAVEGACION.map((e) => (
              <li key={e.href}>
                <a href={e.href} className="inline-flex min-h-10 items-center text-neutral-300 transition-colors hover:text-white">
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Finca Algarrobo">
          <p className="text-xs font-medium tracking-[0.25em] text-dlc uppercase">Finca Algarrobo</p>
          <ul className="mt-6 space-y-1">
            {PROYECTO.map((e) => (
              <li key={e.texto}>
                <a
                  href={e.href}
                  {...marcaRastro(e.rastro)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center text-neutral-300 transition-colors hover:text-white"
                >
                  {e.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-medium tracking-[0.25em] text-dlc uppercase">Contacto</p>
          <ul className="mt-6 space-y-4 text-neutral-300">
            <li>
              <a
                href={enlaceWhatsApp(MENSAJES.general)}
                {...marcaRastro("footer-whatsapp")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 hover:text-white"
              >
                <IconoWhatsApp className="size-5 text-dlc" />
                Escríbenos por WhatsApp
              </a>
            </li>
            <li>
              <a href={SITIO.mapa} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-white">
                <MapPin className="mt-0.5 size-5 shrink-0 text-dlc" aria-hidden="true" />
                {SITIO.direccion}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-borde">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-tinta-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {SITIO.marca}. Todos los derechos reservados. Imágenes referenciales.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* ⚠️ PENDIENTE: enlazar políticas y el Libro de Reclamaciones virtual de DLC. */}
            <a href="#" className="hover:text-neutral-300">
              Privacidad
            </a>
            <a href="#" className="hover:text-neutral-300">
              Libro de Reclamaciones
            </a>
            <a
              href="#inicio"
              aria-label="Volver arriba"
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 text-neutral-300 transition-colors hover:border-dlc hover:text-dlc"
            >
              <ArrowUp className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
