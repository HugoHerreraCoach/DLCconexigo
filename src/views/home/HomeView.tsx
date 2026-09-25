"use client";

import { MotionConfig } from "framer-motion";
import { Galeria } from "./components/Galeria";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Proyecto } from "./components/Proyecto";
import { PorQueDLC } from "./components/PorQueDLC";
import { Testimonios } from "./components/Testimonios";
import { Contacto } from "./components/Contacto";
import { Footer } from "./components/Footer";
import { WhatsAppFlotante } from "./components/WhatsAppFlotante";

/* Embudo: gancho + formulario (hero) → el proyecto → galería y video → por
   qué DLC (ubicación, financiamiento, papeles) → prueba social → otras vías
   de contacto → WhatsApp. */
export function HomeView() {
  return (
    // reducedMotion="user": con "reducir movimiento" activo, Framer Motion
    // omite desplazamientos y escalas y deja solo cambios de opacidad.
    <MotionConfig reducedMotion="user">
      <Header />
      <main>
        <Hero />
        <Proyecto />
        <Galeria />
        <PorQueDLC />
        <Testimonios />
        <Contacto />
      </main>
      <Footer />
      <WhatsAppFlotante />
    </MotionConfig>
  );
}
