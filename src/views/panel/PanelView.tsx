import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, LogOut, Settings } from "lucide-react";
import { salir } from "@/app/panel/acciones";
import { RANGOS, type Metricas, type ResultadoMetricas, type Totales } from "@/server/metricas";
import type { Plataforma } from "@/server/plataformas";
import { GraficoColumnas, type Serie } from "@/views/panel/GraficoColumnas";

/* Panel de medición: registro propio (tráfico real, sin bloqueadores) arriba,
   y lo que reportan los píxeles de Meta y TikTok abajo. */

const FUENTES: Record<string, string> = {
  meta: "Meta (Facebook / Instagram)",
  tiktok: "TikTok",
  google: "Google",
  otro: "Otros sitios",
  directo: "Directo / sin origen",
};

const ORIGENES: Record<string, string> = {
  visita: "Agendar visita",
  cuotas: "Plan de cuotas",
  ficha: "Ficha del proyecto",
  video: "Video recorrido",
  documentos: "Documentación",
  general: "Consulta general",
  otro: "Otro",
};

// Paleta categórica validada (modo oscuro), en orden fijo: slot 1 azul, slot 2 naranja.
const SERIE_VISITAS: Serie[] = [{ clave: "visitas", etiqueta: "Visitas", color: "var(--color-dlc)" }];
const SERIES_CONVERSION: Serie[] = [
  { clave: "contactos", etiqueta: "Clics a WhatsApp", color: "#3987e5" },
  { clave: "leads", etiqueta: "Formularios", color: "#d95926" },
];

const num = new Intl.NumberFormat("es-PE");
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");

function Variacion({ actual, anterior, dias }: { actual: number; anterior: number; dias: number }) {
  const periodo = dias === 1 ? "ayer" : `${dias} días previos`;
  if (anterior === 0) return <p className="mt-1 text-xs text-tinta-3">{actual > 0 ? `Sin datos de ${periodo}` : "—"}</p>;
  const cambio = ((actual - anterior) / anterior) * 100;
  const sube = cambio >= 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: sube ? "#0ca30c" : "#e66767" }}>
      <Icono className="size-3.5" aria-hidden="true" />
      {sube ? "+" : ""}
      {cambio.toFixed(0)}% <span className="text-tinta-3">vs. {periodo}</span>
    </p>
  );
}

function Tarjeta({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <p className="text-sm text-tinta-2">{titulo}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{valor}</p>
      {detalle}
    </div>
  );
}

function Kpis({ t, a, dias }: { t: Totales; a: Totales; dias: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tarjeta titulo="Visitas" valor={num.format(t.visitas)} detalle={<Variacion actual={t.visitas} anterior={a.visitas} dias={dias} />} />
      <Tarjeta
        titulo="Visitantes únicos"
        valor={num.format(t.visitantes)}
        detalle={<p className="mt-1 text-xs text-tinta-3">{pct(t.movil, t.visitas)} desde celular</p>}
      />
      <Tarjeta titulo="Clics a WhatsApp" valor={num.format(t.contactos)} detalle={<Variacion actual={t.contactos} anterior={a.contactos} dias={dias} />} />
      <Tarjeta titulo="Formularios enviados" valor={num.format(t.leads)} detalle={<Variacion actual={t.leads} anterior={a.leads} dias={dias} />} />
      <Tarjeta
        titulo="Tasa de contacto"
        valor={pct(t.contactos + t.leads, t.visitas)}
        detalle={<p className="mt-1 text-xs text-tinta-3">(WhatsApp + formularios) / visitas</p>}
      />
    </div>
  );
}

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-borde bg-superficie p-5">
      <h2 className="font-display font-semibold">{titulo}</h2>
      {nota && <p className="mt-1 text-xs text-tinta-3">{nota}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Barra horizontal de magnitud (un solo tono) detrás de una cifra. */
function Barra({ valor, maximo }: { valor: number; maximo: number }) {
  return (
    <span className="block h-1.5 w-full rounded-full bg-white/5" aria-hidden="true">
      <span className="block h-full rounded-full bg-dlc" style={{ width: `${maximo > 0 ? (valor / maximo) * 100 : 0}%` }} />
    </span>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-sm text-tinta-3">{texto}</p>;
}

function TablaFuentes({ m }: { m: Metricas }) {
  if (m.fuentes.length === 0) return <Vacio texto="Aún no hay visitas en este período." />;
  const maximo = Math.max(...m.fuentes.map((f) => f.visitas));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs text-tinta-3">
            <th className="pb-2 font-normal">Fuente</th>
            <th className="pb-2 text-right font-normal">Visitas</th>
            <th className="pb-2 text-right font-normal">WhatsApp</th>
            <th className="pb-2 text-right font-normal">Formularios</th>
            <th className="pb-2 text-right font-normal">Tasa</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {m.fuentes.map((f) => (
            <tr key={f.fuente} className="border-t border-borde">
              <td className="py-2.5 pr-4">
                <span className="text-tinta">{FUENTES[f.fuente] ?? f.fuente}</span>
                <Barra valor={f.visitas} maximo={maximo} />
              </td>
              <td className="py-2.5 text-right">{num.format(f.visitas)}</td>
              <td className="py-2.5 text-right">{num.format(f.contactos)}</td>
              <td className="py-2.5 text-right">{num.format(f.leads)}</td>
              <td className="py-2.5 text-right text-tinta-2">{pct(f.contactos + f.leads, f.visitas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListaOrigenes({ m }: { m: Metricas }) {
  if (m.origenes.length === 0) return <Vacio texto="Aún no hay clics a WhatsApp." />;
  const maximo = Math.max(...m.origenes.map((o) => o.contactos));
  return (
    <ul className="space-y-3 text-sm">
      {m.origenes.map((o) => (
        <li key={o.origen}>
          <span className="flex justify-between">
            <span>{ORIGENES[o.origen] ?? o.origen}</span>
            <span className="tabular-nums">{num.format(o.contactos)}</span>
          </span>
          <Barra valor={o.contactos} maximo={maximo} />
        </li>
      ))}
    </ul>
  );
}

function TablaCampanas({ m }: { m: Metricas }) {
  if (m.campanas.length === 0)
    return <Vacio texto="Sin campañas etiquetadas. Agrega utm_campaign=… a la URL de tus anuncios para verlas aquí." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs text-tinta-3">
            <th className="pb-2 font-normal">Campaña</th>
            <th className="pb-2 font-normal">Fuente</th>
            <th className="pb-2 text-right font-normal">Visitas</th>
            <th className="pb-2 text-right font-normal">WhatsApp</th>
            <th className="pb-2 text-right font-normal">Formularios</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {m.campanas.map((c) => (
            <tr key={`${c.campana}-${c.fuente}`} className="border-t border-borde">
              <td className="py-2.5 pr-4 break-all">{c.campana}</td>
              <td className="py-2.5 pr-4 text-tinta-2">{FUENTES[c.fuente] ?? c.fuente}</td>
              <td className="py-2.5 text-right">{num.format(c.visitas)}</td>
              <td className="py-2.5 text-right">{num.format(c.contactos)}</td>
              <td className="py-2.5 text-right">{num.format(c.leads)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaLeads({ m }: { m: Metricas }) {
  if (m.leads.length === 0) return <Vacio texto="Aún no hay formularios enviados en este período." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-xs text-tinta-3">
            <th className="pb-2 font-normal">Fecha</th>
            <th className="pb-2 font-normal">Fuente</th>
            <th className="pb-2 font-normal">Lo quiere para</th>
            <th className="pb-2 font-normal">Inicial</th>
            <th className="pb-2 font-normal">Ubicación</th>
            <th className="pb-2 font-normal">Siguiente paso</th>
          </tr>
        </thead>
        <tbody>
          {m.leads.map((l, i) => (
            <tr key={i} className="border-t border-borde">
              <td className="py-2.5 pr-4 whitespace-nowrap text-tinta-2 tabular-nums">{l.creado}</td>
              <td className="py-2.5 pr-4">{FUENTES[l.fuente] ?? l.fuente}</td>
              <td className="py-2.5 pr-4">{l.datos?.motivo}</td>
              <td className="py-2.5 pr-4">{l.datos?.inicial}</td>
              <td className="py-2.5 pr-4">{l.datos?.ubicacion}</td>
              <td className="py-2.5">{l.datos?.paso}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PASOS_PLATAFORMA: Record<Plataforma["nombre"], string[]> = {
  Meta: [
    "Business Settings → Usuarios → Usuarios del sistema → crear uno (Admin).",
    "Asignarle el píxel/dataset 24878647091813468.",
    "Generar token: app conectada, caducidad «Nunca», permisos ads_read + business_management.",
    "Guardarlo en Vercel como META_ACCESS_TOKEN.",
  ],
  TikTok: [
    "Crear una app de desarrollador en business-api.tiktok.com (Marketing API) y autorizar la cuenta publicitaria.",
    "Canjear el auth_code por el access token de larga duración.",
    "Guardar en Vercel TIKTOK_ACCESS_TOKEN y TIKTOK_ADVERTISER_ID.",
  ],
};

function TarjetaPlataforma({ p }: { p: Plataforma }) {
  return (
    <Seccion titulo={`Píxel de ${p.nombre}`} nota={p.rango ? `Datos reportados por ${p.nombre} · ${p.rango}` : undefined}>
      {p.estado === "ok" &&
        (p.eventos?.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-tinta-3">
                <th className="pb-2 font-normal">Evento</th>
                <th className="pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {p.eventos.map((e) => (
                <tr key={e.evento} className="border-t border-borde">
                  <td className="py-2.5">{e.evento}</td>
                  <td className="py-2.5 text-right">{num.format(e.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Vacio texto={`${p.nombre} aún no reporta eventos en este período.`} />
        ))}

      {p.estado === "error" && (
        <p className="flex gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {p.nombre} respondió con error: <span className="break-all">{p.mensaje}</span>
          </span>
        </p>
      )}

      {p.estado === "sin-configurar" && (
        <div className="text-sm text-tinta-2">
          <p className="flex items-center gap-2 text-tinta">
            <Settings className="size-4 text-dlc" aria-hidden="true" />
            Falta conectar la API de {p.nombre}
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            {PASOS_PLATAFORMA[p.nombre].map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
        </div>
      )}
    </Seccion>
  );
}

function Aviso({ tono, children }: { tono: "info" | "error"; children: React.ReactNode }) {
  const Icono = tono === "error" ? AlertTriangle : Settings;
  return (
    <div className={`flex gap-3 rounded-2xl border p-5 text-sm ${tono === "error" ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-dlc/30 bg-dlc/10 text-tinta"}`}>
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

type Props = { dias: number; metricas: ResultadoMetricas; plataformas: Plataforma[] };

export function PanelView({ dias, metricas, plataformas }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image src="/brand/dlc-blanco.png" alt="Grupo DLC" width={96} height={40} className="h-8 w-auto" />
          <div>
            <h1 className="font-display text-xl font-semibold">Panel de medición</h1>
            <p className="text-sm text-tinta-2">Finca Algarrobo · grupodlc.conexigo.com</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav aria-label="Período" className="flex rounded-xl border border-borde bg-superficie p-1 text-sm">
            {RANGOS.map((r) => (
              <Link
                key={r.dias}
                href={`/panel?r=${r.dias}`}
                aria-current={r.dias === dias ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 transition-colors ${r.dias === dias ? "bg-dlc font-semibold text-neutral-950" : "text-tinta-2 hover:text-tinta"}`}
              >
                {r.etiqueta}
              </Link>
            ))}
          </nav>
          <form action={salir}>
            <button type="submit" className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-tinta-2 hover:text-tinta">
              <LogOut className="size-4" aria-hidden="true" />
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="mt-8 space-y-4">
        {metricas.estado === "sin-bd" && (
          <Aviso tono="info">
            <p className="font-semibold">Falta conectar la base de datos del registro propio.</p>
            <p className="mt-1 text-tinta-2">
              En Vercel → proyecto → <em>Storage</em> → crea una base <strong>Neon (Postgres)</strong> y conéctala al proyecto (crea{" "}
              <code>DATABASE_URL</code>). Tras volver a desplegar, las visitas empiezan a contarse solas.
            </p>
          </Aviso>
        )}
        {metricas.estado === "error" && (
          <Aviso tono="error">
            <p className="font-semibold">No se pudo leer la base de datos.</p>
            <p className="mt-1 break-all opacity-80">{metricas.mensaje}</p>
          </Aviso>
        )}

        {metricas.estado === "ok" && (
          <>
            <p className="flex items-center gap-2 text-xs text-tinta-3">
              <CheckCircle2 className="size-3.5 text-[#0ca30c]" aria-hidden="true" />
              Registro propio: cuenta a todos los visitantes, incluso con bloqueador de anuncios. Hora de Perú.
            </p>
            <Kpis t={metricas.datos.totales} a={metricas.datos.anteriores} dias={dias} />
            <div className="grid gap-4 lg:grid-cols-2">
              <GraficoColumnas titulo="Visitas por día" dias={metricas.datos.dias} series={SERIE_VISITAS} />
              <GraficoColumnas titulo="Contactos por día" dias={metricas.datos.dias} series={SERIES_CONVERSION} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <Seccion titulo="¿De dónde vienen?" nota="Meta/TikTok se detectan por el clic en el anuncio (fbclid/ttclid) o por utm_source.">
                  <TablaFuentes m={metricas.datos} />
                </Seccion>
              </div>
              <Seccion titulo="Botón de WhatsApp más usado">
                <ListaOrigenes m={metricas.datos} />
              </Seccion>
            </div>
            <Seccion titulo="Campañas" nota="Según el parámetro utm_campaign de la URL del anuncio.">
              <TablaCampanas m={metricas.datos} />
            </Seccion>
            <Seccion titulo="Últimos formularios" nota="Sin nombre ni celular: esos datos llegan solo al WhatsApp del asesor.">
              <TablaLeads m={metricas.datos} />
            </Seccion>
          </>
        )}

        <h2 className="pt-4 font-display text-lg font-semibold">Lo que reportan las plataformas</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {plataformas.map((p) => (
            <TarjetaPlataforma key={p.nombre} p={p} />
          ))}
        </div>
      </div>
    </main>
  );
}
