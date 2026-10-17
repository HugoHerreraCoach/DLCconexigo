import "server-only";
import { createSign } from "node:crypto";

/* Hoja de cálculo de leads (Google Sheets) donde cae el formulario del hero:
   «LEADS DLC_ FINCA ALGARROBO AUTOMATIZACIÓN - CRM», pestaña «Hoja 1». La misma
   hoja recibe los formularios instantáneos de TikTok, así que las columnas A–J
   siguen su formato (FECHA en segundos Unix, NUMERO como «+51 9XX XXX XXX»;
   INICIAL y TIEMPO DE COMPRA son las mismas preguntas) y lo propio de la
   landing va de la K a la M (ver COLUMNAS).

   Acceso con una cuenta de servicio de Google Cloud (API de Google Sheets
   activada y la hoja compartida con su correo como Editor):
     GOOGLE_SHEETS_ID            id de la hoja (lo que va entre /d/ y /edit en el enlace)
     GOOGLE_SHEETS_CLIENT_EMAIL  `client_email` del JSON de la cuenta de servicio
     GOOGLE_SHEETS_PRIVATE_KEY   `private_key` del mismo JSON (vale con los \n escritos)
     GOOGLE_SHEETS_HOJA          pestaña; por defecto «Hoja 1»
   Sin librerías: el token sale de un JWT firmado (RS256) contra oauth2.googleapis.com. */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const ALCANCE = "https://www.googleapis.com/auth/spreadsheets";
const TIEMPO_MS = 8000;

export type ConfigHoja = { id: string; hoja: string; correo: string; clave: string };

/** null si falta alguna variable: el formulario responde 503 y no inventa un éxito. */
export function configHoja(): ConfigHoja | null {
  const id = process.env.GOOGLE_SHEETS_ID?.trim();
  const correo = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
  // Vercel y los .env suelen guardar la clave con "\n" literales y a veces entre comillas.
  const clave = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (!id || !correo || !clave) return null;
  return { id, correo, clave, hoja: process.env.GOOGLE_SHEETS_HOJA?.trim() || "Hoja 1" };
}

/* ── Fila ───────────────────────────────────────────────────────────────── */

/** Encabezados de la fila 1. A–J ya existen en la hoja (formato de TikTok);
 *  K–M son de la landing y se escriben a mano una sola vez. */
export const COLUMNAS = [
  "ID CAMPAÑA",
  "FECHA",
  "NOMBRE",
  "NUMERO",
  "INICIAL",
  "TIEMPO DE COMPRA",
  "TikTok Lead ID",
  "TikTok Lead Status",
  "Lead creation time",
  "Lead update time",
  "ORIGEN",
  "FUENTE",
  "ID REGISTRO",
] as const;

export type LeadHoja = {
  /** Id del envío: también es el `eventID` del píxel. */
  id: string;
  fecha: Date;
  nombre: string;
  /** Celular de 9 dígitos (ver celularPeru). */
  celular: string;
  inicial: string;
  /** Cuándo quiere comprar (TIEMPOS_COMPRA). */
  compra: string;
  fuente: string;
  campana: string | null;
  origen: string;
};

/** «987654321» → «+51 987 654 321», como los escribe TikTok en la hoja. */
const numeroHoja = (celular: string) => `+51 ${celular.slice(0, 3)} ${celular.slice(3, 6)} ${celular.slice(6)}`;

export function filaLead(l: LeadHoja): (string | number)[] {
  const unix = Math.floor(l.fecha.getTime() / 1000);
  const valores: Record<(typeof COLUMNAS)[number], string | number> = {
    "ID CAMPAÑA": l.campana ?? "",
    FECHA: unix,
    NOMBRE: l.nombre,
    NUMERO: numeroHoja(l.celular),
    INICIAL: l.inicial,
    "TIEMPO DE COMPRA": l.compra,
    "TikTok Lead ID": "",
    "TikTok Lead Status": "",
    "Lead creation time": unix,
    "Lead update time": "",
    ORIGEN: l.origen,
    FUENTE: l.fuente,
    "ID REGISTRO": l.id,
  };
  return COLUMNAS.map((c) => valores[c]);
}

/* ── Google ─────────────────────────────────────────────────────────────── */

let token: { correo: string; valor: string; vence: number } | null = null;

const b64url = (texto: string) => Buffer.from(texto).toString("base64url");

async function tokenAcceso(c: ConfigHoja): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  if (token && token.correo === c.correo && token.vence - 60 > ahora) return token.valor;

  const cabecera = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const reclamos = b64url(JSON.stringify({ iss: c.correo, scope: ALCANCE, aud: TOKEN_URL, iat: ahora, exp: ahora + 3600 }));
  const firma = createSign("RSA-SHA256").update(`${cabecera}.${reclamos}`).sign(c.clave, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecera}.${reclamos}.${firma}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIEMPO_MS),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`token de Google: ${json.error_description ?? json.error ?? `HTTP ${res.status}`}`);
  token = { correo: c.correo, valor: json.access_token, vence: ahora + (json.expires_in ?? 3600) };
  return token.valor;
}

/** Agrega la fila al final de la tabla de la pestaña y devuelve el rango
 *  escrito (p. ej. «'Hoja 1'!A20:N20»). Lanza si Google no confirma UNA fila.
 *  RAW: lo que escribe el visitante nunca se interpreta como fórmula. */
export async function agregarFila(c: ConfigHoja, fila: (string | number)[]): Promise<string> {
  const rango = encodeURIComponent(`'${c.hoja.replace(/'/g, "''")}'!A1`);
  const res = await fetch(
    `${SHEETS_API}/${encodeURIComponent(c.id)}/values/${rango}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await tokenAcceso(c)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [fila] }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIEMPO_MS),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    updates?: { updatedRange?: string; updatedRows?: number };
    error?: { message?: string };
  };
  if (res.status === 401) token = null; // token revocado o vencido: el próximo envío pide otro
  if (!res.ok) throw new Error(`Google Sheets: ${json.error?.message ?? `HTTP ${res.status}`}`);
  if (json.updates?.updatedRows !== 1 || !json.updates.updatedRange) throw new Error("Google Sheets no confirmó la fila");
  return json.updates.updatedRange;
}
