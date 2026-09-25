import "server-only";
import postgres from "postgres";

/* Conexión a Postgres (Supabase). Vale `DATABASE_URL` pegada a mano o
   `POSTGRES_URL`, que crea la integración Supabase de Vercel. Sin ninguna el
   registro no guarda nada y el panel lo avisa, pero la landing sigue igual. */

const url = prepararUrl(process.env.DATABASE_URL || process.env.POSTGRES_URL);

/** Quita lo que postgres.js no entiende y exige SSL fuera de localhost. */
function prepararUrl(cruda: string | undefined) {
  if (!cruda) return null;
  let u: URL;
  try {
    u = new URL(cruda.trim());
  } catch {
    console.error("[db] La URL de la base de datos no es válida; el registro queda desactivado.");
    return null;
  }
  // La integración de Vercel añade `supa=base-pooler.x` (y la variante Prisma,
  // `pgbouncer`/`connection_limit`); postgres.js los mandaría al servidor como
  // parámetros de conexión y Postgres los rechaza.
  for (const p of ["supa", "pgbouncer", "connection_limit"]) u.searchParams.delete(p);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (!local && !u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

// Una sola conexión por instancia; en dev se guarda en globalThis para que el
// hot reload no abra una nueva en cada cambio. `prepare: false` es obligatorio
// con el pooler de Supabase en modo transacción (puerto 6543).
const global = globalThis as unknown as { __sql?: postgres.Sql };

export const sql: postgres.Sql | null = url
  ? (global.__sql ??= postgres(url, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} }))
  : null;

let esquemaListo: Promise<unknown> | null = null;

/** Crea la tabla la primera vez; las siguientes llamadas reutilizan la promesa. */
export function asegurarEsquema(db: postgres.Sql) {
  esquemaListo ??= db`
    CREATE TABLE IF NOT EXISTS eventos (
      id         bigserial PRIMARY KEY,
      creado     timestamptz NOT NULL DEFAULT now(),
      tipo       text NOT NULL,
      visitante  text NOT NULL,
      fuente     text NOT NULL,
      campana    text,
      origen     text,
      movil      boolean NOT NULL DEFAULT false,
      datos      jsonb
    )`
    .then(() => db`CREATE INDEX IF NOT EXISTS eventos_creado_idx ON eventos (creado)`)
    // Supabase publica las tablas de `public` en su API REST: con RLS activo y
    // sin políticas nadie las lee por ahí. Nosotros entramos como dueños de la
    // tabla, y el dueño no pasa por RLS.
    .then(() => db`ALTER TABLE eventos ENABLE ROW LEVEL SECURITY`)
    // Referencia "Ref: FA-XXXXX" del mensaje de WhatsApp y cuándo llegó de
    // verdad (lo avisa el CRM en /api/whatsapp/recibido). Tablas creadas antes
    // de esta versión reciben las columnas aquí.
    .then(() => db`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS codigo text, ADD COLUMN IF NOT EXISTS recibido_en timestamptz`)
    .then(() => db`CREATE UNIQUE INDEX IF NOT EXISTS eventos_codigo_uidx ON eventos (codigo) WHERE codigo IS NOT NULL`)
    .catch((e) => {
      esquemaListo = null; // reintentar en la próxima petición
      throw e;
    });
  return esquemaListo;
}
