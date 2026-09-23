import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { SITIO } from "@/config/sitio";
import { Pixeles } from "@/shared/ui/Pixeles";

import "./globals.css";

// Inter para el cuerpo (igual que Conexigo); Outfit para titulares, porque su
// geometría redonda acompaña las letras del logo DLC.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

const titulo = "Finca Algarrobo — Terrenos campestres a 15 min de Chiclayo | Grupo DLC";
const descripcion =
  "Lotes desde 500 m² en condominio cercado, a 15 minutos del Real Plaza de Chiclayo. Preventa desde S/ 58,000, 0% de interés y financiamiento hasta 24 meses.";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO.url),
  title: titulo,
  description: descripcion,
  openGraph: {
    title: titulo,
    description: descripcion,
    locale: "es_PE",
    type: "website",
    siteName: SITIO.marca,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans">
        {children}
        <Pixeles />
      </body>
    </html>
  );
}
