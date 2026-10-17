/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";

const state = vi.hoisted(() => {
  const consultas: { query: string; values: any[] }[] = [];
  let previas: any[] = [];
  const sqlFn: any = Object.assign(
    async (strings: TemplateStringsArray, ...values: any[]) => {
      const query = strings.join("?");
      consultas.push({ query, values });
      return query.includes("SELECT") ? previas : [];
    },
    { json: (v: unknown) => v },
  );
  return {
    sqlFn,
    consultas,
    setPrevias: (filas: any[]) => {
      previas = filas;
    },
    reset: () => {
      consultas.length = 0;
      previas = [];
    },
  };
});

vi.mock("@/server/db", () => ({ sql: state.sqlFn, asegurarEsquema: vi.fn() }));

import { POST } from "../src/app/api/formulario/route";
import { agregarFila, COLUMNAS, filaLead } from "../src/server/hoja-calculo";
import { celularPeru, enviarFormulario } from "../src/shared/lib/formulario";
import { clientePotencial, rastrearContacto } from "../src/shared/lib/pixeles";
import { plantillaDe } from "../src/shared/lib/plantillas";
import { mensajeChat } from "../src/shared/lib/whatsapp";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const FILA_OK = { updates: { updatedRange: "'Hoja 1'!A20:N20", updatedRows: 1 } };

/** fetch falso: responde el token de Google y el append de Sheets según la URL. */
function mockGoogle(append: unknown = FILA_OK, status = 200) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.startsWith("https://oauth2.googleapis.com/token")) return Response.json({ access_token: "tok-123", expires_in: 3600 });
    if (u.startsWith("https://sheets.googleapis.com/")) return Response.json(append, { status });
    throw new Error(`url inesperada: ${u}`);
  });
  globalThis.fetch = fetchMock as any;
  return fetchMock;
}

const llamadasA = (fetchMock: any, prefijo: string) => fetchMock.mock.calls.filter(([u]: [string]) => String(u).startsWith(prefijo));

let cuenta = 0;
/** Variables de la hoja con un correo distinto en cada prueba (el token se cachea por correo). */
function configurarHoja() {
  process.env.GOOGLE_SHEETS_ID = "hoja-de-prueba";
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL = `sa-${++cuenta}@proyecto.iam.gserviceaccount.com`;
  // Como queda en Vercel: los saltos de línea escritos como \n.
  process.env.GOOGLE_SHEETS_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
  delete process.env.GOOGLE_SHEETS_HOJA;
}

const VALIDO = {
  id: "11111111-2222-4333-8444-555555555555",
  nombre: "Ana   Pérez",
  celular: "987 654 321",
  inicial: "S/ 5,000 a S/ 10,000",
  compra: "De 1 a 3 meses",
  visitante: "visitante-1",
  fuente: "meta",
  campana: "C_04_CONEXIPEMA_FINCAALGARROBO_LANDING",
  movil: true,
};

const pedir = (cuerpo: unknown, ua = "Mozilla/5.0 (iPhone)") =>
  new Request("http://localhost/api/formulario", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": ua },
    body: JSON.stringify(cuerpo),
  });

describe("Formulario del hero → hoja de cálculo → «Cliente potencial»", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.reset();
    configurarHoja();
  });

  it("celularPeru acepta 9 dígitos que empiezan en 9, con o sin +51", () => {
    expect(celularPeru("987 654 321")).toBe("987654321");
    expect(celularPeru("+51 987-654-321")).toBe("987654321");
    expect(celularPeru("51987654321")).toBe("987654321");
    expect(celularPeru("87654321")).toBeNull();
    expect(celularPeru("887654321")).toBeNull();
    expect(celularPeru("9876543210")).toBeNull();
    expect(celularPeru(undefined)).toBeNull();
  });

  it("filaLead sigue las columnas de la hoja (A–J como TikTok, K–N de la landing)", () => {
    const fecha = new Date("2026-10-17T15:00:00Z");
    const fila = filaLead({
      id: "reg-1",
      fecha,
      nombre: "Ana Pérez",
      celular: "987654321",
      inicial: "Más de S/ 10,000",
      compra: "Este mes",
      fuente: "meta",
      campana: null,
      origen: "Landing · Formulario",
    });
    const col = (c: (typeof COLUMNAS)[number]) => fila[COLUMNAS.indexOf(c)];
    const unix = Math.floor(fecha.getTime() / 1000);

    expect(fila).toHaveLength(COLUMNAS.length);
    expect(COLUMNAS.slice(0, 10)).toEqual([
      "ID CAMPAÑA", "FECHA", "NOMBRE", "NUMERO", "INICIAL", "TIEMPO DE COMPRA",
      "TikTok Lead ID", "TikTok Lead Status", "Lead creation time", "Lead update time",
    ]);
    expect(col("ID CAMPAÑA")).toBe("");
    expect(col("FECHA")).toBe(unix);
    expect(col("NUMERO")).toBe("+51 987 654 321");
    expect(col("Lead creation time")).toBe(unix);
    expect(col("TikTok Lead ID")).toBe("");
    expect(col("INICIAL")).toBe("Más de S/ 10,000");
    expect(col("TIEMPO DE COMPRA")).toBe("Este mes");
    expect(COLUMNAS.slice(10)).toEqual(["ORIGEN", "FUENTE", "ID REGISTRO"]);
    expect(col("ID REGISTRO")).toBe("reg-1");
  });

  it("agregarFila firma el JWT de la cuenta de servicio y escribe en RAW al final de la pestaña", async () => {
    const fetchMock = mockGoogle();
    const correo = "sa-directa@proyecto.iam.gserviceaccount.com";
    const rango = await agregarFila({ id: "hoja-x", hoja: "Hoja 1", correo, clave: privateKey }, ["a", 1]);
    expect(rango).toBe("'Hoja 1'!A20:N20");

    const [[, initToken]] = llamadasA(fetchMock, "https://oauth2.googleapis.com/token");
    const params = new URLSearchParams(String(initToken.body));
    expect(params.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const [cabecera, reclamos, firma] = String(params.get("assertion")).split(".");
    expect(createVerify("RSA-SHA256").update(`${cabecera}.${reclamos}`).verify(publicKey, firma, "base64url")).toBe(true);
    const payload = JSON.parse(Buffer.from(reclamos, "base64url").toString());
    expect(payload).toMatchObject({ iss: correo, aud: "https://oauth2.googleapis.com/token", scope: "https://www.googleapis.com/auth/spreadsheets" });

    const [[url, initAppend]] = llamadasA(fetchMock, "https://sheets.googleapis.com/");
    expect(url).toBe(
      "https://sheets.googleapis.com/v4/spreadsheets/hoja-x/values/'Hoja%201'!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS",
    );
    expect(initAppend.headers.Authorization).toBe("Bearer tok-123");
    expect(JSON.parse(initAppend.body)).toEqual({ values: [["a", 1]] });
  });

  it("agregarFila falla si Google no confirma exactamente una fila", async () => {
    mockGoogle({ updates: { updatedRows: 0 } });
    await expect(
      agregarFila({ id: "hoja-x", hoja: "Hoja 1", correo: "sa-sin-fila@proyecto.iam.gserviceaccount.com", clave: privateKey }, ["a"]),
    ).rejects.toThrow(/no confirmó/);
  });

  it("rechaza datos inválidos sin tocar la hoja", async () => {
    const fetchMock = mockGoogle();
    const res = await POST(pedir({ ...VALIDO, celular: "12345" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    const res2 = await POST(pedir({ ...VALIDO, compra: "Otra cosa" }));
    expect(res2.status).toBe(400);

    // Las opciones antiguas del formulario ya no valen.
    const res3 = await POST(pedir({ ...VALIDO, inicial: "Desde S/ 5,000" }));
    expect(res3.status).toBe(400);

    const sinCompra: Record<string, unknown> = { ...VALIDO };
    delete sinCompra.compra;
    const res4 = await POST(pedir(sinCompra));
    expect(res4.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin las variables de la hoja responde 503 (no finge un registro)", async () => {
    delete process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    const fetchMock = mockGoogle();
    const res = await POST(pedir(VALIDO));
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("agrega la fila y recién después registra el lead del panel, sin datos personales en claro", async () => {
    const fetchMock = mockGoogle();
    const res = await POST(pedir(VALIDO));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: VALIDO.id });

    const [[, initAppend]] = llamadasA(fetchMock, "https://sheets.googleapis.com/");
    const [fila] = JSON.parse(initAppend.body).values;
    expect(fila[COLUMNAS.indexOf("NOMBRE")]).toBe("Ana Pérez");
    expect(fila[COLUMNAS.indexOf("NUMERO")]).toBe("+51 987 654 321");
    expect(fila[COLUMNAS.indexOf("INICIAL")]).toBe("S/ 5,000 a S/ 10,000");
    expect(fila[COLUMNAS.indexOf("TIEMPO DE COMPRA")]).toBe("De 1 a 3 meses");
    expect(fila[COLUMNAS.indexOf("ID CAMPAÑA")]).toBe(VALIDO.campana);
    expect(fila[COLUMNAS.indexOf("FUENTE")]).toBe("meta");
    expect(fila[COLUMNAS.indexOf("ID REGISTRO")]).toBe(VALIDO.id);

    const insercion = state.consultas.find((c) => c.query.includes("INSERT INTO eventos"));
    expect(insercion?.query).toContain("'lead'");
    expect(insercion?.values).toContain(VALIDO.id);
    expect(insercion?.values).toContain("formulario-hero");
    expect(insercion?.values).toContainEqual({ inicial: "S/ 5,000 a S/ 10,000", compra: "De 1 a 3 meses" });
    expect(JSON.stringify(insercion?.values)).not.toMatch(/987654321|Ana Pérez/);
  });

  it("si Google rechaza la fila responde 502 y no registra el lead", async () => {
    mockGoogle({ error: { message: "The caller does not have permission" } }, 403);
    const res = await POST(pedir(VALIDO));
    expect(res.status).toBe(502);
    expect((await res.json()).ok).toBe(false);
    expect(state.consultas.some((c) => c.query.includes("INSERT INTO eventos"))).toBe(false);
  });

  it("un reintento con el mismo id no vuelve a escribir en la hoja", async () => {
    state.setPrevias([{ "?column?": 1 }]);
    const fetchMock = mockGoogle();
    const res = await POST(pedir(VALIDO));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: VALIDO.id });
    expect(llamadasA(fetchMock, "https://sheets.googleapis.com/")).toHaveLength(0);
  });

  it("enviarFormulario solo resuelve cuando el servidor confirma la fila", async () => {
    (globalThis as any).window = {
      localStorage: { getItem: vi.fn(), setItem: vi.fn() },
      sessionStorage: { getItem: vi.fn(), setItem: vi.fn() },
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    };
    const datos = { nombre: "Ana Pérez", celular: "987654321", inicial: "Pago al contado", compra: "Más adelante" };

    globalThis.fetch = vi.fn().mockResolvedValue(Response.json({ ok: false }, { status: 502 })) as any;
    await expect(enviarFormulario("reg-1", datos)).rejects.toThrow();

    const fetchOk = vi.fn().mockResolvedValue(Response.json({ ok: true, id: "reg-1" }));
    globalThis.fetch = fetchOk as any;
    await expect(enviarFormulario("reg-1", datos)).resolves.toBe("reg-1");
    const cuerpo = JSON.parse(fetchOk.mock.calls[0][1].body);
    expect(cuerpo).toMatchObject({ id: "reg-1", ...datos, movil: true });
    expect(typeof cuerpo.visitante).toBe("string");
  });

  it("clientePotencial envía Lead (Meta) y SubmitForm (TikTok) con el id del registro y sin datos personales", () => {
    const fbq = vi.fn();
    const ttq = { track: vi.fn() };
    (globalThis as any).window = { fbq, ttq };

    clientePotencial("formulario-hero", "reg-1", { inicial: "S/ 5,000 a S/ 10,000", compra: "Este mes" });

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Lead",
      expect.objectContaining({ origen: "formulario-hero", compra: "Este mes", content_name: "Finca Algarrobo" }),
      { eventID: "reg-1" },
    );
    expect(ttq.track).toHaveBeenCalledWith("SubmitForm", expect.objectContaining({ content_name: "Finca Algarrobo" }), { event_id: "reg-1" });
    expect(JSON.stringify(fbq.mock.calls)).not.toMatch(/987654321|Ana/);
  });
});

describe("Chat flotante: mismo «Cliente potencial» al abrir WhatsApp (provisional)", () => {
  let fbq: any;
  let ttq: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 })) as any;
    vi.stubGlobal("navigator", { sendBeacon: null });
    fbq = vi.fn();
    ttq = { track: vi.fn() };
    (globalThis as any).window = {
      fbq,
      ttq,
      localStorage: { getItem: vi.fn(), setItem: vi.fn() },
      sessionStorage: { getItem: vi.fn(), setItem: vi.fn() },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };
  });

  it("el chat nuevo manda sus respuestas en el mensaje (reconocible por el CRM) y a los píxeles", () => {
    const texto = mensajeChat("Más de S/ 10,000", "Este mes");
    expect(texto).toBe("Hola, quiero información para comprar un lote en Finca Algarrobo. Inicial: Más de S/ 10,000. Quiero comprar: Este mes.");
    expect(plantillaDe(`${texto} Mi nombre es: Ana`)).toBe("chat");

    const intencion = rastrearContacto("chat-flotante-preguntas", texto, undefined, { inicial: "Más de S/ 10,000", compra: "Este mes" });
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Lead",
      expect.objectContaining({ origen: "chat-flotante-preguntas", inicial: "Más de S/ 10,000", compra: "Este mes" }),
      { eventID: intencion },
    );
    const cuerpo = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(cuerpo).toMatchObject({ tipo: "contacto", origen: "chat-flotante-preguntas", plantilla: "chat", intencion_id: intencion });
  });

  it.each(["chat-flotante-preguntas", "chat-flotante-visita", "chat-flotante-asesor", "chat-flotante-mensaje"] as const)(
    "%s registra la intención y envía Lead / SubmitForm con el id de esa intención",
    (id) => {
      const intencion = rastrearContacto(id, "Hola, quiero agendar una visita a Finca Algarrobo este fin de semana.");

      expect(fbq).toHaveBeenCalledTimes(1);
      expect(fbq).toHaveBeenCalledWith("track", "Lead", expect.objectContaining({ origen: id }), { eventID: intencion });
      expect(ttq.track).toHaveBeenCalledWith("SubmitForm", expect.any(Object), { event_id: intencion });
      const cuerpo = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(cuerpo).toMatchObject({ tipo: "contacto", origen: id, intencion_id: intencion });
    },
  );

  it("un enlace de WhatsApp que no es del chat sigue sin conversión", () => {
    rastrearContacto("sin-identificar", "Hola, quiero más información del proyecto Finca Algarrobo.");
    expect(fbq).not.toHaveBeenCalled();
    expect(ttq.track).not.toHaveBeenCalled();
  });
});
