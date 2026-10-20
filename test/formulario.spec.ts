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

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const FILA_OK = { updates: { updatedRange: "'Hoja 1'!A20:L20", updatedRows: 1 } };

/** fetch falso: responde el token de Google y el append de Sheets según la URL
 *  (y la API de Meta, si se le pasa `graph`). */
function mockGoogle(append: unknown = FILA_OK, status = 200, graph?: (url: string) => Response) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.startsWith("https://oauth2.googleapis.com/token")) return Response.json({ access_token: "tok-123", expires_in: 3600 });
    if (u.startsWith("https://sheets.googleapis.com/")) return Response.json(append, { status });
    if (graph && u.startsWith("https://graph.facebook.com/")) return graph(u);
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
  delete process.env.META_ACCESS_TOKEN;
}

const VALIDO = {
  id: "11111111-2222-4333-8444-555555555555",
  nombre: "Ana   Pérez",
  celular: "987 654 321",
  inicial: "S/ 5,000 a S/ 10,000",
  compra: "De 1 a 3 meses",
  visitante: "visitante-1",
  fuente: "meta",
  // Como llegan hoy los anuncios de Meta: utm_campaign = id de la campaña.
  campana: "120253059641580494",
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

  it("filaLead sigue las columnas de la hoja (A–J como TikTok, K–L de la landing)", () => {
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
      "NOMBRE DE CAMPAÑA", "FECHA", "NOMBRE", "NUMERO", "INICIAL", "TIEMPO DE COMPRA",
      "TikTok Lead ID", "TikTok Lead Status", "Lead creation time", "Lead update time",
    ]);
    expect(col("NOMBRE DE CAMPAÑA")).toBe("");
    expect(col("FECHA")).toBe(unix);
    expect(col("NUMERO")).toBe("+51 987 654 321");
    expect(col("Lead creation time")).toBe(unix);
    // El id del registro de la landing va en «TikTok Lead ID».
    expect(col("TikTok Lead ID")).toBe("reg-1");
    expect(col("TikTok Lead Status")).toBe("");
    expect(col("INICIAL")).toBe("Más de S/ 10,000");
    expect(col("TIEMPO DE COMPRA")).toBe("Este mes");
    expect(COLUMNAS.slice(10)).toEqual(["ORIGEN", "FUENTE"]);
  });

  it("agregarFila firma el JWT de la cuenta de servicio y escribe en RAW al final de la pestaña", async () => {
    const fetchMock = mockGoogle();
    const correo = "sa-directa@proyecto.iam.gserviceaccount.com";
    const rango = await agregarFila({ id: "hoja-x", hoja: "Hoja 1", correo, clave: privateKey }, ["a", 1]);
    expect(rango).toBe("'Hoja 1'!A20:L20");

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

    // Solo los formularios de FORMULARIOS pueden escribir en la hoja.
    const res5 = await POST(pedir({ ...VALIDO, origen: "header-agendar-visita" }));
    expect(res5.status).toBe(400);
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
    // Sin META_ACCESS_TOKEN no se busca el nombre: la fila igual se escribe, con el id de la campaña.
    expect(fila[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe(VALIDO.campana);
    expect(fila[COLUMNAS.indexOf("FUENTE")]).toBe("meta");
    expect(fila[COLUMNAS.indexOf("TikTok Lead ID")]).toBe(VALIDO.id);
    // Sin `origen` en el cuerpo es el formulario del hero.
    expect(fila[COLUMNAS.indexOf("ORIGEN")]).toBe("Landing · Formulario de solicitud de información de terreno");

    const insercion = state.consultas.find((c) => c.query.includes("INSERT INTO eventos"));
    expect(insercion?.query).toContain("'lead'");
    expect(insercion?.values).toContain(VALIDO.id);
    expect(insercion?.values).toContain("formulario-hero");
    // El panel cruza `campana` con el id de las campañas de Meta: se guarda tal cual llegó.
    expect(insercion?.values).toContain(VALIDO.campana);
    expect(insercion?.values).toContainEqual({ inicial: "S/ 5,000 a S/ 10,000", compra: "De 1 a 3 meses" });
    expect(JSON.stringify(insercion?.values)).not.toMatch(/987654321|Ana Pérez/);
  });

  it("el formulario del chat flotante va a la misma hoja con su propio ORIGEN", async () => {
    const fetchMock = mockGoogle();
    const res = await POST(pedir({ ...VALIDO, origen: "chat-flotante-registro" }));
    expect(res.status).toBe(200);

    const [[, initAppend]] = llamadasA(fetchMock, "https://sheets.googleapis.com/");
    const [fila] = JSON.parse(initAppend.body).values;
    expect(fila[COLUMNAS.indexOf("ORIGEN")]).toBe("Landing · Chat flotante · formulario de registro");
    expect(fila[COLUMNAS.indexOf("NOMBRE")]).toBe("Ana Pérez");

    const insercion = state.consultas.find((c) => c.query.includes("INSERT INTO eventos"));
    expect(insercion?.values).toContain("chat-flotante-registro");
    expect(insercion?.values).not.toContain("formulario-hero");
  });

  const filaEscrita = (fetchMock: any) => JSON.parse(llamadasA(fetchMock, "https://sheets.googleapis.com/")[0][1].body).values[0];

  it("Meta: con el id de utm_campaign la fila lleva el NOMBRE de la campaña (pedido una sola vez)", async () => {
    process.env.META_ACCESS_TOKEN = "token-meta";
    const graph = vi.fn((url: string) => {
      expect(url).toContain("/120253059641580001?fields=name,account_id");
      return Response.json({ id: "120253059641580001", name: "C_04_CONEXIPEMA_FINCAALGARROBO_LANDING", account_id: "1107857613612617" });
    });
    const fetchMock = mockGoogle(FILA_OK, 200, graph);

    expect((await POST(pedir({ ...VALIDO, campana: "120253059641580001" }))).status).toBe(200);
    expect(filaEscrita(fetchMock)[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe("C_04_CONEXIPEMA_FINCAALGARROBO_LANDING");

    // El siguiente registro de la misma campaña no vuelve a llamar a Meta.
    await POST(pedir({ ...VALIDO, id: "11111111-2222-4333-8444-666666666666", campana: "120253059641580001" }));
    expect(graph).toHaveBeenCalledTimes(1);
  });

  it("Meta: si su API falla o la campaña es de otra cuenta, la fila igual se escribe, con el id de la campaña", async () => {
    process.env.META_ACCESS_TOKEN = "token-meta";
    const caida = mockGoogle(FILA_OK, 200, () => Response.json({ error: { message: "Session has expired" } }, { status: 400 }));
    expect((await POST(pedir({ ...VALIDO, campana: "120253059641580002" }))).status).toBe(200);
    expect(filaEscrita(caida)[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe("120253059641580002");

    const ajena = mockGoogle(FILA_OK, 200, () => Response.json({ id: "120253059641580003", name: "OTRA CUENTA", account_id: "999" }));
    expect((await POST(pedir({ ...VALIDO, campana: "120253059641580003" }))).status).toBe(200);
    expect(filaEscrita(ajena)[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe("120253059641580003");
  });

  it("TikTok: el nombre llega en utm_campaign (y el id en utm_id), sin llamar a ninguna API", async () => {
    process.env.META_ACCESS_TOKEN = "token-meta";
    const fetchMock = mockGoogle();
    const res = await POST(
      pedir({ ...VALIDO, fuente: "tiktok", campana: "C_01_CONEXIPEMA_FINCAALGARROBO_LANDING", campana_id: "1877891583735969" }),
    );
    expect(res.status).toBe(200);
    const fila = filaEscrita(fetchMock);
    expect(fila[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe("C_01_CONEXIPEMA_FINCAALGARROBO_LANDING");
    expect(fila[COLUMNAS.indexOf("FUENTE")]).toBe("tiktok");
    expect(llamadasA(fetchMock, "https://sheets.googleapis.com/")[0][0]).toContain("'LEADS%20TIKTOK'!A1:append");
    expect(llamadasA(fetchMock, "https://graph.facebook.com/")).toHaveLength(0);

    // Solo el id (sin nombre en el enlace): queda el id. Un utm_id que no es numérico se descarta.
    const soloId = mockGoogle();
    await POST(pedir({ ...VALIDO, id: "11111111-2222-4333-8444-777777777777", fuente: "tiktok", campana: undefined, campana_id: "1877891583735969" }));
    expect(filaEscrita(soloId)[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe("1877891583735969");

    const idRaro = mockGoogle();
    await POST(pedir({ ...VALIDO, id: "11111111-2222-4333-8444-888888888888", fuente: "otro", campana: undefined, campana_id: "abc" }));
    expect(filaEscrita(idRaro)[COLUMNAS.indexOf("NOMBRE DE CAMPAÑA")]).toBe("");

    const metaHoja = mockGoogle();
    await POST(pedir({ ...VALIDO, id: "11111111-2222-4333-8444-999999999999", fuente: "meta", campana: undefined }));
    expect(llamadasA(metaHoja, "https://sheets.googleapis.com/")[0][0]).toContain("'LEADS%20META'!A1:append");
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

    const fetchOk = vi.fn(async (_url: string, init: any) => Response.json({ ok: true, id: JSON.parse(init.body).id }));
    globalThis.fetch = fetchOk as any;
    await expect(enviarFormulario("reg-1", datos)).resolves.toBe("reg-1");
    const cuerpo = JSON.parse(fetchOk.mock.calls[0][1].body);
    expect(cuerpo).toMatchObject({ id: "reg-1", origen: "formulario-hero", ...datos, movil: true });
    expect(typeof cuerpo.visitante).toBe("string");

    await enviarFormulario("reg-2", datos, "chat-flotante-registro");
    expect(JSON.parse(fetchOk.mock.calls[1][1].body)).toMatchObject({ id: "reg-2", origen: "chat-flotante-registro" });
  });

  it("enviarFormulario manda la campaña del enlace del anuncio (utm_campaign y utm_id)", async () => {
    (globalThis as any).window = {
      localStorage: { getItem: vi.fn(), setItem: vi.fn() },
      sessionStorage: { getItem: vi.fn(), setItem: vi.fn() },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    };
    vi.stubGlobal("location", {
      search: "?utm_source=tiktok&utm_medium=paid&utm_campaign=C_01_CONEXIPEMA_FINCAALGARROBO_LANDING&utm_id=1877891583735969&ttclid=E.C.P.abc",
      hostname: "grupodlc.conexigo.com",
    });
    const fetchOk = vi.fn(async (_url: string, init: any) => Response.json({ ok: true, id: JSON.parse(init.body).id }));
    globalThis.fetch = fetchOk as any;
    try {
      await enviarFormulario("reg-3", { nombre: "Ana Pérez", celular: "987654321", inicial: "Pago al contado", compra: "Este mes" });
    } finally {
      vi.unstubAllGlobals();
    }
    expect(JSON.parse(fetchOk.mock.calls[0][1].body)).toMatchObject({
      fuente: "tiktok",
      campana: "C_01_CONEXIPEMA_FINCAALGARROBO_LANDING",
      campana_id: "1877891583735969",
    });
  });

  it("clientePotencial envía CompleteRegistration (Meta y TikTok) con el id del registro y sin datos personales", () => {
    const fbq = vi.fn();
    const ttq = { track: vi.fn() };
    (globalThis as any).window = { fbq, ttq };

    clientePotencial("formulario-hero", "reg-1", { inicial: "S/ 5,000 a S/ 10,000", compra: "Este mes" });

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "CompleteRegistration",
      expect.objectContaining({ origen: "formulario-hero", compra: "Este mes", content_name: "Finca Algarrobo" }),
      { eventID: "reg-1" },
    );
    expect(ttq.track).toHaveBeenCalledWith("CompleteRegistration", expect.objectContaining({ content_name: "Finca Algarrobo" }), { event_id: "reg-1" });
    expect(JSON.stringify(fbq.mock.calls)).not.toMatch(/987654321|Ana/);
  });

  it("clientePotencial envía un solo evento por píxel y ya no envía Lead ni SubmitForm", () => {
    const fbq = vi.fn();
    const ttq = { track: vi.fn() };
    (globalThis as any).window = { fbq, ttq };

    clientePotencial("formulario-hero", "reg-2", { inicial: "Pago al contado", compra: "Este mes" });

    expect(fbq).toHaveBeenCalledTimes(1);
    expect(ttq.track).toHaveBeenCalledTimes(1);
    expect(fbq).not.toHaveBeenCalledWith("track", "Lead", expect.anything(), expect.anything());
    expect(ttq.track).not.toHaveBeenCalledWith("SubmitForm", expect.anything(), expect.anything());
  });
});

describe("Chat flotante: ya no abre WhatsApp ni envía conversión por clic", () => {
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

  it("su «Cliente potencial» sale con el id del registro y el origen del chat", () => {
    clientePotencial("chat-flotante-registro", "reg-chat", { inicial: "Más de S/ 10,000", compra: "Este mes" });
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "CompleteRegistration",
      expect.objectContaining({ origen: "chat-flotante-registro", inicial: "Más de S/ 10,000", compra: "Este mes" }),
      { eventID: "reg-chat" },
    );
    expect(ttq.track).toHaveBeenCalledWith(
      "CompleteRegistration",
      expect.objectContaining({ description: "Chat flotante · formulario de registro" }),
      { event_id: "reg-chat" },
    );
  });

  it.each(["chat-flotante-visita", "chat-flotante-asesor", "chat-flotante-mensaje", "sin-identificar"] as const)(
    "un clic a WhatsApp (%s) registra solo la intención, sin evento en los píxeles",
    (id) => {
      const intencion = rastrearContacto(id, "Hola, quiero agendar una visita a Finca Algarrobo este fin de semana.");

      expect(fbq).not.toHaveBeenCalled();
      expect(ttq.track).not.toHaveBeenCalled();
      const cuerpo = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
      expect(cuerpo).toMatchObject({ tipo: "contacto", origen: id, intencion_id: intencion });
    },
  );
});
