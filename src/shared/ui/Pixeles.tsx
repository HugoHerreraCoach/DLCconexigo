"use client";

import { useEffect } from "react";
import Script from "next/script";
import { esRastro } from "@/config/rastros";
import { SITIO } from "@/config/sitio";
import { rastrearContacto } from "@/shared/lib/pixeles";
import { registrar } from "@/shared/lib/registro";

/* Carga el píxel de Meta y el de TikTok (cada uno solo si tiene ID) y registra
   PageView. Los clics a WhatsApp se escuchan aquí con un único listener en el
   documento; cada enlace se identifica con marcaRastro() (src/config/rastros.ts). */

const { meta, tiktok } = SITIO.pixeles;

const CODIGO_META = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;
n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${meta}');fbq('track','PageView');`;

const CODIGO_TIKTOK = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;
e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`;

export function Pixeles() {
  useEffect(() => {
    registrar("visita");
    const alClic = (e: MouseEvent) => {
      const enlace = (e.target as Element).closest?.("a[href*='wa.me/']");
      // El id sale del atributo data-rastro (marcaRastro en src/config/rastros.ts).
      if (enlace instanceof HTMLAnchorElement) {
        const id = enlace.dataset.rastro;
        rastrearContacto(esRastro(id) ? id : "sin-identificar");
      }
    };
    document.addEventListener("click", alClic, { capture: true });
    return () => document.removeEventListener("click", alClic, { capture: true });
  }, []);

  return (
    <>
      {meta && (
        <>
          <Script id="pixel-meta" strategy="afterInteractive">
            {CODIGO_META}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img height="1" width="1" alt="" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${meta}&ev=PageView&noscript=1`} />
          </noscript>
        </>
      )}
      {tiktok && (
        <Script id="pixel-tiktok" strategy="afterInteractive">
          {CODIGO_TIKTOK}
        </Script>
      )}
    </>
  );
}
