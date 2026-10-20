/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { rastrearLead, rastrearContacto } from "../src/shared/lib/pixeles";
import { registrar, type Extra } from "../src/shared/lib/registro";
import { normalizarTelefono, huellaTelefono, huellaNombre } from "../src/server/nombre-huella";
import { POST } from "../src/app/api/eventos/route";

describe("Fase 1: Retirar conversiones prematuras y registrar intenciones", () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;
    vi.stubGlobal("navigator", { sendBeacon: null });
    (globalThis as any).window = {
      localStorage: { getItem: vi.fn(), setItem: vi.fn() },
      sessionStorage: { getItem: vi.fn(), setItem: vi.fn() },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };
  });

  it("F1.1: Visitar landing genera PageView sin Lead", () => {
    // Simular objetos globales de ventana para Meta y TikTok
    const fbqMock = vi.fn();
    const ttqMock = { track: vi.fn(), page: vi.fn() };
    (globalThis as any).window = {
      fbq: fbqMock,
      ttq: ttqMock,
      localStorage: { getItem: vi.fn(), setItem: vi.fn() },
      sessionStorage: { getItem: vi.fn(), setItem: vi.fn() },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };

    // Al interactuar con botones o formularios, NO se debe disparar ningún evento de conversión
    // (ni CompleteRegistration, ni los antiguos Lead / SubmitForm)
    rastrearContacto("whatsapp-flotante", "Hola, quiero más información del proyecto Finca Algarrobo.");
    rastrearLead("formulario-hero", {
      motivo: "Inversión",
      inicial: "S/ 5,000",
      ubicacion: "Bono cerco vivo",
      paso: "Reclamar regalo",
      celular: "987654321",
      nombre: "Carlos Ramos",
    });


    // Cero llamadas a los píxeles de Meta y TikTok
    expect(fbqMock).not.toHaveBeenCalled();
    expect(ttqMock.track).not.toHaveBeenCalled();
  });

  it("F1.2: Formulario válido genera intención formulario_preparado con huella telefónica", () => {
    const intencionId = "test-uuid-f1-2";
    const resultadoId = rastrearLead(
      "formulario-hero",
      {
        motivo: "Vivienda",
        inicial: "S/ 10,000",
        ubicacion: "Bono cerco vivo",
        paso: "Reclamar regalo",
        celular: "987654321",
        nombre: "Ana Maria",
      },
      "Hola, quiero más información del proyecto Finca Algarrobo. Mi nombre es: Ana Maria",
      intencionId
    );


    expect(resultadoId).toBe(intencionId);
    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.tipo).toBe("formulario_preparado");
    expect(body.intencion_id).toBe(intencionId);
    expect(body.telefono).toBe("987654321");
    expect(body.nombre).toBe("Ana Maria");
    expect(body.origen).toBe("formulario-hero");
    expect(body.plantilla).toBe("general");
  });

  it("F1.3: Clic en WhatsApp y abandono sin mensaje registra solo intención de contacto", () => {
    const intencionId = "test-uuid-f1-3";
    rastrearContacto("whatsapp-flotante", "Hola Grupo DLC, consulta", intencionId);

    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.tipo).toBe("contacto");
    expect(body.intencion_id).toBe(intencionId);
    expect(body.origen).toBe("whatsapp-flotante");
    // No existe confirmación ni conversión CRM
    expect(body.confirmado).toBeUndefined();
  });

  it("F1.4: Doble manejador / doble clic deduplica la intención", () => {
    const intencionId = "test-uuid-f1-4-dedup";
    const id1 = registrar("formulario_preparado", { intencion_id: intencionId, origen: "formulario-hero" });
    const id2 = registrar("formulario_preparado", { intencion_id: intencionId, origen: "formulario-hero" });

    expect(id1).toBe(intencionId);
    expect(id2).toBe(intencionId);
    // El cliente debe haber bloqueado el segundo envío fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });



  it("F1.5: Normalización y huella telefónica protegen el número", () => {
    process.env.CONEXIGO_WEBHOOK_SECRET = "secreto-de-prueba-fase-1";

    // Normalización de números locales peruanos de 9 dígitos a E.164 sin +
    expect(normalizarTelefono("987 654 321")).toBe("51987654321");
    expect(normalizarTelefono("+51 987-654-321")).toBe("51987654321");
    expect(normalizarTelefono("51987654321")).toBe("51987654321");
    expect(normalizarTelefono("123")).toBeNull(); // inválido

    // Generación de huella HMAC consistente
    const h1 = huellaTelefono("987654321");
    const h2 = huellaTelefono("+51 987-654-321");
    expect(h1).not.toBeNull();
    expect(h1).toBe(h2);
    expect(h1?.length).toBe(32);

    // Huella del nombre consistente
    const hn1 = huellaNombre("Juan Pérez");
    const hn2 = huellaNombre("juan perez");
    expect(hn1).toBe(hn2);
  });

  it("F1.6: Base de datos no conectada permite continuar sin lanzar excepción", async () => {
    // Si sql no está disponible en el servidor, /api/eventos responde 204 limpiamente
    const req = new Request("http://localhost/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "contacto",
        visitante: "visitante-123",
        fuente: "directo",
      }),
    });

    const res = await POST(req);
    expect([204, 200]).toContain(res.status);
  });

  it("F1.7: Payload público que intente inyectar confirmado=true es rechazado con 400", async () => {
    const payloadMalicioso = {
      tipo: "lead",
      visitante: "hacker-123",
      fuente: "meta",
      confirmado: true,
      recibido_en: new Date().toISOString(),
      mensaje_id: "wamid.falso.123",
    };

    const req = new Request("http://localhost/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadMalicioso),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("campo no permitido");
  });
});
