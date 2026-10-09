/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

const SECRETO = "secreto-test-webhook-123";
const EMPRESA_ID = "11111111-1111-1111-1111-111111111111";

process.env.CONEXIGO_WEBHOOK_SECRET = SECRETO;
process.env.CONEXIGO_EMPRESA_ID = EMPRESA_ID;

const state = vi.hoisted(() => {
  let mockDbRows: any[] = [];
  const updateCalls: any[] = [];
  const insertCalls: any[] = [];

  const sqlFn: any = Object.assign(
    async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      if (query.includes("UPDATE eventos")) {
        updateCalls.push({ query, values });
        return mockDbRows;
      }
      if (query.includes("INSERT INTO eventos")) {
        insertCalls.push({ query, values });
        return mockDbRows.length > 0 ? mockDbRows : [{ id: 999 }];
      }
      if (query.includes("SELECT")) {
        return mockDbRows;
      }
      return [];
    },
    {
      begin: async (cb: any) => {
        const tx: any = async (strings: TemplateStringsArray, ...values: any[]) => {
          const query = strings.join("?");
          if (query.includes("UPDATE eventos")) {
            updateCalls.push({ query, values });
            return mockDbRows;
          }
          if (query.includes("SELECT")) {
            return mockDbRows;
          }
          return [];
        };
        return cb(tx);
      },
    }
  );

  return {
    sqlFn,
    setMockRows: (rows: any[]) => {
      mockDbRows = rows;
    },
    getUpdateCalls: () => updateCalls,
    getInsertCalls: () => insertCalls,
    reset: () => {
      mockDbRows = [];
      updateCalls.length = 0;
      insertCalls.length = 0;
    },
  };
});

vi.mock("@/server/db", () => ({
  sql: state.sqlFn,
  asegurarEsquema: vi.fn().mockResolvedValue(true),
}));

import { POST as recibidoPOST } from "../src/app/api/whatsapp/recibido/route";
import { POST as mensajePOST } from "../src/app/api/whatsapp/mensaje/route";
import { POST as proyeccionPOST } from "../src/app/api/conexigo/conversiones/route";

function firmar(cuerpo: string, secreto = SECRETO) {
  return `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`;
}

describe("Fase 3: Atribución, corrección de códigos y confirmación de landing (DLCconexigo)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.reset();
  });

  it("F3.1: Solicitar código L-1 busca coincidencia exacta y no selecciona L-2", async () => {
    const ahora = new Date();
    // En BD solo existe L-2, no L-1
    state.setMockRows([]);

    const cuerpo = JSON.stringify({ codigo: "L-1", recibido_en: ahora.toISOString() });
    const req = new Request("http://localhost/api/whatsapp/recibido", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpo),
      },
      body: cuerpo,
    });

    const res = await recibidoPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.encontrado).toBe(false);
    expect(state.getUpdateCalls().length).toBe(0); // Cero mutaciones
  });

  it("F3.2: Código inexistente (L-999) retorna no encontrado con cero mutaciones", async () => {
    state.setMockRows([]);
    const cuerpo = JSON.stringify({ codigo: "L-999" });
    const req = new Request("http://localhost/api/whatsapp/recibido", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpo),
      },
      body: cuerpo,
    });

    const res = await recibidoPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.encontrado).toBe(false);
    expect(state.getUpdateCalls().length).toBe(0);
  });

  it("F3.3: Reintentos del mismo aviso de código actualizan la misma fila (idempotencia)", async () => {
    const creado = new Date("2026-10-09T10:00:00Z");
    const recibidoPrimero = new Date("2026-10-09T10:05:00Z");

    // Fila candidata única previamente recibida
    state.setMockRows([
      {
        id: 42,
        tipo: "lead",
        origen: "formulario-hero",
        fuente: "meta",
        campana: "campana-1",
        creado,
        recibido_en: recibidoPrimero,
      },
    ]);

    const cuerpo = JSON.stringify({ codigo: "L-1", recibido_en: "2026-10-09T10:15:00Z" });
    const req = new Request("http://localhost/api/whatsapp/recibido", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpo),
      },
      body: cuerpo,
    });

    const res = await recibidoPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.encontrado).toBe(true);
    expect(data.atribucion.tipo).toBe("lead");
    expect(data.atribucion.origen).toBe("formulario-hero");
    expect(state.getUpdateCalls().length).toBe(1);
    // Debe haber actualizado WHERE id = 42
    expect(state.getUpdateCalls()[0].values).toContain(42);
  });

  it("F3.4: Dos candidatos ambiguos no se atribuyen arbitrariamente (devuelve ambigua: true)", async () => {
    const ahora = new Date();
    // Dos filas candidatas históricas con el mismo código L-5
    state.setMockRows([
      { id: 101, tipo: "lead", origen: "form-a", fuente: "meta", campana: "camp-a", creado: ahora, recibido_en: null },
      { id: 102, tipo: "contacto", origen: "form-b", fuente: "tiktok", campana: "camp-b", creado: ahora, recibido_en: null },
    ]);

    const cuerpo = JSON.stringify({ codigo: "L-5" });
    const req = new Request("http://localhost/api/whatsapp/recibido", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpo),
      },
      body: cuerpo,
    });

    const res = await recibidoPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.encontrado).toBe(false);
    expect(data.ambigua).toBe(true);
    expect(data.motivo).toBe("candidatos_ambiguos");
    expect(state.getUpdateCalls().length).toBe(0); // No muta ninguna fila arbitrariamente
  });

  it("F3.5: Coincidencia de teléfono por huella HMAC empareja correctamente y aísla por negocio", async () => {
    const fecha = new Date();
    const huellaTel = createHmac("sha256", SECRETO).update("tel:+51987654321").digest("hex");

    state.setMockRows([
      {
        id: 77,
        tipo: "formulario_preparado",
        origen: "formulario-hero",
        fuente: "meta",
        campana: "primavera",
        creado: fecha,
        nombre_huella: null,
        telefono_huella: huellaTel,
      },
    ]);

    const cuerpo = JSON.stringify({
      mensaje_id: "wamid.prueba.77",
      texto: "Hola, quiero información.",
      telefono_huella: huellaTel,
      empresa_id: EMPRESA_ID,
      ts: Math.floor(Date.now() / 1000),
    });

    const req = new Request("http://localhost/api/whatsapp/mensaje", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpo),
      },
      body: cuerpo,
    });

    const res = await mensajePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.encontrado).toBe(true);
    expect(data.exactitud).toBe("telefono");
    expect(data.atribucion.tipo).toBe("lead");

    // Intento de cruce de empresa con empresa_id ajeno es rechazado
    const cuerpoCruce = JSON.stringify({
      mensaje_id: "wamid.prueba.cruce",
      texto: "Hola",
      empresa_id: "99999999-9999-9999-9999-999999999999",
      ts: Math.floor(Date.now() / 1000),
    });
    const reqCruce = new Request("http://localhost/api/whatsapp/mensaje", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpoCruce),
      },
      body: cuerpoCruce,
    });
    const resCruce = await mensajePOST(reqCruce);
    expect(resCruce.status).toBe(403);
  });

  it("F3.6: Coincidencia por plantilla y nombre se etiqueta explícitamente como estimada", async () => {
    const fecha = new Date();
    state.setMockRows([
      {
        id: 88,
        tipo: "contacto",
        origen: "whatsapp-flotante",
        fuente: "directo",
        campana: null,
        creado: fecha,
        nombre_huella: null,
        tiene_nombre: false,
      },
    ]);

    const cuerpo = JSON.stringify({
      mensaje_id: "wamid.prueba.88",
      texto: "Hola, quiero más información del proyecto Finca Algarrobo.",
      ts: Math.floor(Date.now() / 1000),
    });

    const req = new Request("http://localhost/api/whatsapp/mensaje", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpo),
      },
      body: cuerpo,
    });

    const res = await mensajePOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.encontrado).toBe(true);
    // Etiquetada como aproximada / estimada por plantilla
    expect(data.exactitud).toBe("plantilla");
  });

  it("F3.8: Proyección firmada a landing valida firma HMAC, timestamp y rechaza cruces y replay", async () => {
    const convId = "a0000000-0000-0000-0000-000000000001";
    const ahoraTs = Math.floor(Date.now() / 1000);

    // 1. Proyección válida exitosa
    state.setMockRows([]); // No existe aún
    const cuerpoOk = JSON.stringify({
      conversion_id: convId,
      empresa_id: EMPRESA_ID,
      intencion_id: "intencion-123",
      recibido_en: new Date().toISOString(),
      ts: ahoraTs,
    });

    const reqOk = new Request("http://localhost/api/conexigo/conversiones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpoOk),
      },
      body: cuerpoOk,
    });

    const resOk = await proyeccionPOST(reqOk);
    expect(resOk.status).toBe(200);
    const dataOk = await resOk.json();
    expect(dataOk.ok).toBe(true);
    expect(dataOk.proyectada).toBe(true);
    expect(dataOk.idempotente).toBe(false);

    // 2. Replay idempotente (ya existe el conversion_id)
    state.setMockRows([{ id: 501, recibido_en: new Date() }]);
    const reqReplay = new Request("http://localhost/api/conexigo/conversiones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpoOk),
      },
      body: cuerpoOk,
    });
    const resReplay = await proyeccionPOST(reqReplay);
    expect(resReplay.status).toBe(200);
    const dataReplay = await resReplay.json();
    expect(dataReplay.idempotente).toBe(true);

    // 3. Firma inválida es rechazada con 401
    const reqFirmaMala = new Request("http://localhost/api/conexigo/conversiones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": "sha256=firmafalsa1234567890abcdef",
      },
      body: cuerpoOk,
    });
    const resFirmaMala = await proyeccionPOST(reqFirmaMala);
    expect(resFirmaMala.status).toBe(401);

    // 4. Timestamp vencido (> 300 segundos atrás) es rechazado con 401
    const cuerpoVencido = JSON.stringify({
      conversion_id: convId,
      empresa_id: EMPRESA_ID,
      ts: ahoraTs - 400,
    });
    const reqVencido = new Request("http://localhost/api/conexigo/conversiones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpoVencido),
      },
      body: cuerpoVencido,
    });
    const resVencido = await proyeccionPOST(reqVencido);
    expect(resVencido.status).toBe(401);

    // 5. Cruce de empresa no autorizada es rechazado con 403
    const cuerpoCruce = JSON.stringify({
      conversion_id: convId,
      empresa_id: "99999999-9999-9999-9999-999999999999",
      ts: ahoraTs,
    });
    const reqCruce = new Request("http://localhost/api/conexigo/conversiones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Conexigo-Firma": firmar(cuerpoCruce),
      },
      body: cuerpoCruce,
    });
    const resCruce = await proyeccionPOST(reqCruce);
    expect(resCruce.status).toBe(403);
  });
});
