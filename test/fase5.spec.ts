import { describe, it, expect, vi } from "vitest";
import { esCampanaObjetivo, campanasMeta } from "../src/server/plataformas";
import { RASTROS } from "../src/config/rastros";

describe("Fase 5 — Paneles, contratos y calidad de métricas (Landing)", () => {
  describe("F5.5: Presupuestos ausentes y totales honestos (sin 70/140 inventados)", () => {
    it("esCampanaObjetivo filtra estrictamente las 2 campañas oficiales de Finca Algarrobo", () => {
      expect(esCampanaObjetivo("C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP")).toBe(true);
      expect(esCampanaObjetivo("C_04_CONEXIPEMA_FINCAALGARROBO_LANDING")).toBe(true);
      expect(esCampanaObjetivo("CAMPANA_OTRO_PROYECTO_LIMA")).toBe(false);
      expect(esCampanaObjetivo("")).toBe(false);
    });

    it("si Meta no provee daily_budget, presupuestoDiario es null (nunca 70 ni 140)", async () => {
      const tokenOriginal = process.env.META_ACCESS_TOKEN;
      process.env.META_ACCESS_TOKEN = "token_test_f5";

      // Mock global fetch para simular respuesta de Meta Graph API
      const fetchOriginal = global.fetch;
      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("fields=currency")) {
          return new Response(JSON.stringify({ currency: "PEN" }), { status: 200 });
        }
        if (urlStr.includes("/campaigns?")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "111",
                  name: "C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP",
                  effective_status: "ACTIVE",
                  // sin daily_budget ni lifetime_budget
                },
                {
                  id: "222",
                  name: "C_04_CONEXIPEMA_FINCAALGARROBO_LANDING",
                  effective_status: "ACTIVE",
                  daily_budget: "10000", // 100 PEN
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes("/insights?level=campaign")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  campaign_id: "111",
                  campaign_name: "C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP",
                  spend: "50.00",
                  impressions: "1000",
                  reach: "800",
                  actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "5" }],
                },
                {
                  campaign_id: "222",
                  campaign_name: "C_04_CONEXIPEMA_FINCAALGARROBO_LANDING",
                  spend: "75.00",
                  impressions: "1500",
                  reach: "1200",
                  actions: [{ action_type: "offsite_conversion.fb_pixel_lead", value: "10" }],
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes("/insights?level=ad")) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 });
      }) as unknown as typeof fetch;

      try {
        const resultado = await campanasMeta(7);
        expect(resultado.estado).toBe("ok");
        if (resultado.estado === "ok") {
          const campanaSinPresupuesto = resultado.filas.find((f) => f.id === "111");
          expect(campanaSinPresupuesto?.presupuestoDiario).toBeNull();

          const campanaConPresupuesto = resultado.filas.find((f) => f.id === "222");
          expect(campanaConPresupuesto?.presupuestoDiario).toBe(100);

          // Presupuesto total consolidado suma solo los válidos (100) y no añade valores ficticios
          expect(resultado.totales.presupuestoDiarioTotal).toBe(100);
        }
      } finally {
        global.fetch = fetchOriginal;
        process.env.META_ACCESS_TOKEN = tokenOriginal;
      }
    });

    it("si ninguna campaña tiene presupuesto configurado, presupuestoDiarioTotal es null", async () => {
      const tokenOriginal = process.env.META_ACCESS_TOKEN;
      process.env.META_ACCESS_TOKEN = "token_test_f5";

      const fetchOriginal = global.fetch;
      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("fields=currency")) {
          return new Response(JSON.stringify({ currency: "USD" }), { status: 200 });
        }
        if (urlStr.includes("/campaigns?")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "111",
                  name: "C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP",
                  effective_status: "ACTIVE",
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes("/insights?level=campaign")) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        if (urlStr.includes("/insights?level=ad")) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 });
      }) as unknown as typeof fetch;

      try {
        const resultado = await campanasMeta(7);
        expect(resultado.estado).toBe("ok");
        if (resultado.estado === "ok") {
          expect(resultado.filas[0].presupuestoDiario).toBeNull();
          expect(resultado.totales.presupuestoDiarioTotal).toBeNull();
        }
      } finally {
        global.fetch = fetchOriginal;
        process.env.META_ACCESS_TOKEN = tokenOriginal;
      }
    });
  });

  describe("F5.4: Error parcial de Meta no se enmascara como cero válido", () => {
    it("si insights de campañas falla por rate limit / error de red, captura errorParcial y no enmascara como gasto cero sin aviso", async () => {
      const tokenOriginal = process.env.META_ACCESS_TOKEN;
      process.env.META_ACCESS_TOKEN = "token_test_f5";

      const fetchOriginal = global.fetch;
      global.fetch = vi.fn(async (url: string | URL | Request) => {
        const urlStr = String(url);
        if (urlStr.includes("fields=currency")) {
          return new Response(JSON.stringify({ currency: "PEN" }), { status: 200 });
        }
        if (urlStr.includes("/campaigns?")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "111",
                  name: "C_N1_CONEXIPEMA_FINCAALGARROBO_WHATSAPP",
                  effective_status: "ACTIVE",
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (urlStr.includes("/insights?level=campaign")) {
          // Meta API error
          return new Response(JSON.stringify({ error: { message: "(#17) User request limit reached" } }), {
            status: 400,
          });
        }
        if (urlStr.includes("/insights?level=ad")) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 });
      }) as unknown as typeof fetch;

      try {
        const resultado = await campanasMeta(7);
        expect(resultado.estado).toBe("ok");
        if (resultado.estado === "ok") {
          expect(resultado.errorParcial).toBeDefined();
          expect(resultado.errorParcial).toContain("User request limit reached");
        }
      } finally {
        global.fetch = fetchOriginal;
        process.env.META_ACCESS_TOKEN = tokenOriginal;
      }
    });
  });

  describe("F5.6: Zona horaria America/Lima y agrupación coherente", () => {
    it("formatea correctamente las fechas límite en hora de Lima sin desfase UTC", () => {
      const fechaUtc = new Date("2026-10-10T02:00:00Z"); // 21:00 del 9 de octubre en Lima (UTC-5)
      const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });
      const fechaLima = formatter.format(fechaUtc);
      expect(fechaLima).toBe("2026-10-09");

      const fechaUtcSiguiente = new Date("2026-10-10T05:01:00Z"); // 00:01 del 10 de octubre en Lima (UTC-5)
      const fechaLimaSiguiente = formatter.format(fechaUtcSiguiente);
      expect(fechaLimaSiguiente).toBe("2026-10-10");
    });
  });

  describe("F5.7: Semántica de rastros e intenciones", () => {
    it("el catálogo de rastros distingue botón de contacto y formulario sin asumir Lead confirmado", () => {
      const hero = RASTROS["formulario-hero"];
      expect(hero).toBeDefined();
      expect(hero.tipo).toBe("lead"); // tipo de intención formulario
      expect(hero.seccion).toBe("Inicio (hero)");

      const botonWp = RASTROS["whatsapp-flotante"];
      expect(botonWp).toBeDefined();
      expect(botonWp.tipo).toBe("contacto"); // tipo de intención botón
    });
  });
});
