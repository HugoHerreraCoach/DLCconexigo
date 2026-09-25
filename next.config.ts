import type { NextConfig } from "next";

/* Cabeceras de seguridad básicas, mismo criterio que la web de Conexigo:
   solo directivas que no dependen de qué scripts carga la página. */
const CABECERAS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS }];
  },
};

export default nextConfig;
