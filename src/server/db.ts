import "server-only";
import postgres from "postgres";

/* Conexión a Postgres (Neon vía Vercel Storage → DATABASE_URL). Sin la variable
   el registro no guarda nada y el panel lo avisa, pero la landing sigue igual. */

const url = process.env.DATABASE_URL;

// Una sola conexión por instancia; en dev se guarda en globalThis para que el
// hot reload no abra una nueva en cada cambio.
const global = globalThis as unknown as { __sql?: postgres.Sql };

export const sql: postgres.Sql | null = url
  ? (global.__sql ??= postgres(url, { max: 3, prepare: false, idle_timeout: 20, onnotice: () => {} }))
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
    .catch((e) => {
      esquemaListo = null; // reintentar en la próxima petición
      throw e;
    });
  return esquemaListo;
}
