import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  LogOut,
  MessageSquare,
  PhoneCall,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { salir } from "@/app/panel/acciones";
import { esRastro, RASTROS } from "@/config/rastros";
import { RANGOS, type Metricas, type ResultadoMetricas, type Totales } from "@/server/metricas";
import type { FilaAnuncioMeta, FilaCampanaMeta, Plataforma, ResultadoCampanasMeta } from "@/server/plataformas";
import { GraficoColumnas, type Serie } from "@/views/panel/GraficoColumnas";

const FUENTES: Record<string, string> = {
  meta: "Meta (Facebook / Instagram)",
  tiktok: "TikTok",
  google: "Google",
  otro: "Otros sitios",
  directo: "Directo / sin origen",
};

const ESTADOS_META: Record<string, { texto: string; color: string }> = {
  ACTIVE: { texto: "Activa", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  PAUSED: { texto: "Pausada", color: "bg-neutral-800 text-neutral-400 border-neutral-700" },
  CAMPAIGN_PAUSED: { texto: "Pausada", color: "bg-neutral-800 text-neutral-400 border-neutral-700" },
  ARCHIVED: { texto: "Archivada", color: "bg-neutral-800 text-neutral-400 border-neutral-700" },
  DELETED: { texto: "Eliminada", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  IN_PROCESS: { texto: "Programado / En revisión", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  PROGRAMADO: { texto: "Programado", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  WITH_ISSUES: { texto: "Con observaciones", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

function estadoLegible(estadoRaw: string) {
  const normal = estadoRaw.toUpperCase();
  return (
    ESTADOS_META[normal] ?? {
      texto: normal.includes("PROG") ? "Programado" : estadoRaw,
      color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    }
  );
}

function nombreRastro(id: string | null) {
  if (!id) return "—";
  return esRastro(id) ? RASTROS[id].nombre : `${id} (no está en catálogo)`;
}

const num = new Intl.NumberFormat("es-PE");
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "0.0%");

function formatoSoles(cantidad: number, moneda = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(cantidad);
}

const SERIE_VISITAS: Serie[] = [{ clave: "visitas", etiqueta: "Visitas", color: "#fdb90c" }];
const SERIES_CONVERSION: Serie[] = [
  { clave: "contactos", etiqueta: "Clics a WhatsApp", color: "#3987e5" },
  { clave: "leads", etiqueta: "Formularios", color: "#d95926" },
];

function Variacion({ actual, anterior, dias }: { actual: number; anterior: number; dias: number }) {
  const periodo = dias === 1 ? "ayer" : `${dias}d previos`;
  if (anterior === 0) return <p className="mt-1 text-xs text-tinta-3">{actual > 0 ? `Sin datos de ${periodo}` : "—"}</p>;
  const cambio = ((actual - anterior) / anterior) * 100;
  const sube = cambio >= 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium" style={{ color: sube ? "#10b981" : "#ef4444" }}>
      <Icono className="size-3.5" aria-hidden="true" />
      {sube ? "+" : ""}
      {cambio.toFixed(0)}% <span className="text-neutral-400 font-normal">vs. {periodo}</span>
    </p>
  );
}

function TarjetaEjecutiva({
  titulo,
  valor,
  icono: Icono,
  colorIcono = "text-dlc",
  detalle,
  destacada = false,
}: {
  titulo: string;
  valor: string;
  icono: React.ElementType;
  colorIcono?: string;
  detalle?: React.ReactNode;
  destacada?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all ${
        destacada
          ? "border-dlc/50 bg-gradient-to-br from-neutral-900 via-neutral-900 to-dlc/10 shadow-[0_4px_24px_rgba(253,185,12,0.12)]"
          : "border-white/10 bg-neutral-900/80 hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{titulo}</span>
        <div className={`flex size-9 items-center justify-center rounded-xl bg-white/[0.05] ${colorIcono}`}>
          <Icono className="size-4.5" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-white">{valor}</p>
      {detalle && <div className="mt-2">{detalle}</div>}
    </div>
  );
}

export function PanelView({
  dias,
  metricas,
  meta,
  plataformas,
}: {
  dias: number;
  metricas: ResultadoMetricas;
  meta: ResultadoCampanasMeta;
  plataformas: Plataforma[];
}) {
  // Extracción de datos de Meta
  const metaOk = meta.estado === "ok";
  const moneda = metaOk ? meta.moneda : "PEN";
  const gastoMeta = metaOk ? meta.totales.gasto : 0;
  const leadsMeta = metaOk ? meta.totales.leadsTotales : 0;
  const cplMeta = metaOk && meta.totales.costoPorLead !== null ? meta.totales.costoPorLead : null;

  // Extracción de datos del registro propio
  const datosPropio = metricas.estado === "ok" ? metricas.datos : null;
  const totalesPropio: Totales = datosPropio?.totales ?? {
    visitas: 0,
    visitantes: 0,
    contactos: 0,
    leads: 0,
    recibidos: 0,
    ventas: 0,
    movil: 0,
  };
  const anterioresPropio: Totales = datosPropio?.anteriores ?? totalesPropio;

  // Leads finales combinados para el gerente:
  // - Total Leads = Formularios Web + Conversaciones de WhatsApp (o Leads Meta si fueron directo)
  const totalLeadsGerencial = Math.max(leadsMeta, totalesPropio.leads + totalesPropio.contactos);
  const cplGerencial = gastoMeta > 0 && totalLeadsGerencial > 0 ? gastoMeta / totalLeadsGerencial : null;
  const tasaLlegadaCRM = pct(totalesPropio.recibidos, totalesPropio.contactos + totalesPropio.leads);

  const rangoTexto = RANGOS.find((r) => r.dias === dias)?.etiqueta ?? `${dias} días`;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* ── HEADER EJECUTIVO ──────────────────────────────────────────────── */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-neutral-900 p-2 shadow-sm">
            <Image src="/brand/dlc-blanco.png" alt="Grupo DLC" width={80} height={40} className="size-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">Panel Gerencial</h1>
              <span className="rounded-full border border-dlc/30 bg-dlc/10 px-2.5 py-0.5 text-[11px] font-semibold text-dlc uppercase tracking-wider">
                Finca Algarrobo
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">
              Control de inversión publicitaria, prospectos y rendimiento de anuncios en tiempo real
            </p>
          </div>
        </div>

        {/* Selector de Período Limpio */}
        <div className="flex flex-wrap items-center gap-3">
          <nav
            aria-label="Selector de período"
            className="inline-flex rounded-xl border border-white/15 bg-neutral-900/90 p-1 shadow-inner backdrop-blur-md"
          >
            {RANGOS.map((r) => {
              const activo = r.dias === dias;
              return (
                <Link
                  key={r.dias}
                  href={`/panel?r=${r.dias}`}
                  aria-current={activo ? "page" : undefined}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    activo
                      ? "bg-dlc text-neutral-950 shadow-sm"
                      : "text-neutral-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {r.etiqueta}
                </Link>
              );
            })}
          </nav>

          <form action={salir}>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
            >
              <LogOut className="size-3.5 text-neutral-400" />
              <span>Salir</span>
            </button>
          </form>
        </div>
      </header>

      {/* ── BARRA DE MONITOREO DE CAMPAÑAS OFICIALES ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span>Monitoreando exclusivamente las 2 campañas oficiales de Finca Algarrobo:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-neutral-900/80 px-2.5 py-1 font-mono text-[11px] text-neutral-200">
            C_01_CONEXIPEMA_FINCAALGARROBO_WHATSAPP
          </span>
          <span className="rounded-lg border border-white/10 bg-neutral-900/80 px-2.5 py-1 font-mono text-[11px] text-neutral-200">
            C_02_CONEXIPEMA_FINCAALGARROBO_LANDING
          </span>
        </div>
      </div>

      {/* ── 6 KPIS GERENCIALES CLAVE ────────────────────────────────────────── */}
      <section aria-labelledby="kpis-gerenciales" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="kpis-gerenciales" className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">
            Métricas Principales · {rangoTexto}
          </h2>
          {metaOk && (
            <span className="text-xs text-neutral-400">
              Período Meta: {meta.desde} → {meta.hasta}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Inversión Meta */}
          <TarjetaEjecutiva
            titulo="Inversión Meta"
            valor={formatoSoles(gastoMeta, moneda)}
            icono={DollarSign}
            colorIcono="text-dlc"
            detalle={
              <p className="text-xs text-neutral-400">
                {metaOk && meta.totales.presupuestoDiarioTotal > 0
                  ? `Presupuesto: ${formatoSoles(meta.totales.presupuestoDiarioTotal, moneda)} / día`
                  : metaOk
                    ? "Presupuesto: S/ 110.00 / día (2 campañas)"
                    : "Sin conexión Meta"}
              </p>
            }
          />

          {/* 2. Total Leads */}
          <TarjetaEjecutiva
            titulo="Total Leads"
            valor={num.format(totalLeadsGerencial)}
            icono={Target}
            colorIcono="text-blue-400"
            destacada={true}
            detalle={
              <p className="text-xs text-neutral-300">
                {leadsMeta > 0
                  ? `${metaOk ? meta.totales.formularios : 0} formularios · ${metaOk ? meta.totales.conversaciones : 0} chats`
                  : `${totalesPropio.leads} formularios · ${totalesPropio.contactos} chats`}
              </p>
            }
          />

          {/* 3. Costo por Lead (CPL) */}
          <TarjetaEjecutiva
            titulo="Coste por Lead (CPL)"
            valor={cplGerencial !== null ? formatoSoles(cplGerencial, moneda) : "—"}
            icono={TrendingUp}
            colorIcono="text-emerald-400"
            destacada={true}
            detalle={
              <p className="text-xs text-neutral-400">
                {cplGerencial !== null ? "Inversión / Total Leads" : "Aún sin gasto o leads"}
              </p>
            }
          />

          {/* 4. Leads Registrados por API */}
          <TarjetaEjecutiva
            titulo="Leads por API (Web)"
            valor={num.format(totalesPropio.leads + totalesPropio.contactos)}
            icono={Users}
            colorIcono="text-amber-400"
            detalle={
              <Variacion
                actual={totalesPropio.leads + totalesPropio.contactos}
                anterior={anterioresPropio.leads + anterioresPropio.contactos}
                dias={dias}
              />
            }
          />

          {/* 5. Leads Finales en CRM */}
          <TarjetaEjecutiva
            titulo="Leads en CRM"
            valor={num.format(totalesPropio.recibidos)}
            icono={MessageSquare}
            colorIcono="text-[#25D366]"
            destacada={true}
            detalle={
              <p className="text-xs text-emerald-400 font-medium">
                {tasaLlegadaCRM} llegaron a WhatsApp
              </p>
            }
          />

          {/* 6. Ventas Cerradas */}
          <TarjetaEjecutiva
            titulo="Ventas Cerradas"
            valor={num.format(totalesPropio.ventas)}
            icono={CheckCircle2}
            colorIcono="text-purple-400"
            detalle={
              <p className="text-xs text-neutral-400">
                {totalesPropio.ventas > 0 ? "Ventas confirmadas" : "Atribución en CRM activa"}
              </p>
            }
          />
        </div>
      </section>

      {/* ── ANUNCIO GANADOR / CREATIVO ESTRELLA ─────────────────────────────── */}
      <section aria-labelledby="anuncio-estrella">
        {metaOk && meta.anuncioGanador ? (
          <div className="relative overflow-hidden rounded-3xl border border-dlc/40 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-dlc/10 p-6 shadow-xl backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-dlc/40 bg-dlc/15 px-3 py-1 text-xs font-bold text-dlc uppercase tracking-wider">
                  <Trophy className="size-4 text-dlc" />
                  <span>Anuncio Ganador del Período (Mejor Rendimiento)</span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white text-balance">
                  {meta.anuncioGanador.nombre}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 flex items-center gap-2">
                  <span className="text-neutral-400">Campaña:</span>
                  <span className="font-semibold text-white">{meta.anuncioGanador.campanaNombre}</span>
                </p>
              </div>

              {/* 3 Cifras clave del creativo */}
              <div className="grid grid-cols-3 gap-3 shrink-0 sm:gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Leads Generados
                  </span>
                  <span className="mt-1 block font-display text-2xl font-extrabold text-white">
                    {num.format(meta.anuncioGanador.leadsTotales)}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Coste por Lead
                  </span>
                  <span className="mt-1 block font-display text-2xl font-extrabold text-emerald-400">
                    {meta.anuncioGanador.costoPorLead !== null
                      ? formatoSoles(meta.anuncioGanador.costoPorLead, moneda)
                      : "—"}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Inversión
                  </span>
                  <span className="mt-1 block font-display text-2xl font-extrabold text-white">
                    {formatoSoles(meta.anuncioGanador.gasto, moneda)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 text-center sm:p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/5 text-dlc mb-3">
              <Sparkles className="size-6" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white">Campañas Programadas / En Lanzamiento</h3>
            <p className="mx-auto mt-1 max-w-xl text-xs text-neutral-400">
              Las 2 campañas oficiales ya están conectadas al panel. El anuncio con menor costo por lead y mayor volumen se destacará automáticamente aquí en cuanto se registren las primeras impresiones de Meta.
            </p>
          </div>
        )}
      </section>

      {/* ── RENDIMIENTO POR CAMPAÑA (SOLO LAS 2 OFICIALES) ──────────────────── */}
      <section aria-labelledby="campanas-oficiales" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="campanas-oficiales" className="font-display text-lg font-bold text-white flex items-center gap-2">
            <span>Rendimiento por Campaña</span>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-neutral-300 font-normal">
              2 campañas
            </span>
          </h2>
          <span className="text-xs text-neutral-400">Meta Ads Manager</span>
        </div>

        {metaOk && meta.filas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {meta.filas.map((campana) => {
              const est = estadoLegible(campana.estado);
              const cpl = campana.costoPorLead !== null ? formatoSoles(campana.costoPorLead, moneda) : "—";
              return (
                <div
                  key={campana.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900/90 p-5 space-y-4 hover:border-white/20 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-neutral-400 block break-all">{campana.nombre}</span>
                      <h4 className="font-display text-base font-bold text-white">
                        {campana.nombre.includes("WHATSAPP")
                          ? "Tráfico Directo a WhatsApp (C_01)"
                          : "Conversión en Landing Page (C_02)"}
                      </h4>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${est.color}`}>
                      {est.texto}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-b border-white/10 py-3 text-center">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-neutral-400">Presupuesto</span>
                      <span className="mt-0.5 block text-xs sm:text-sm font-bold text-dlc">
                        {campana.presupuestoDiario !== null
                          ? `${formatoSoles(campana.presupuestoDiario, moneda)}/d`
                          : "S/ 55.00/d"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-neutral-400">Inversión</span>
                      <span className="mt-0.5 block text-xs sm:text-sm font-bold text-white">
                        {formatoSoles(campana.gasto, moneda)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-neutral-400">Leads Totales</span>
                      <span className="mt-0.5 block text-xs sm:text-sm font-bold text-white">
                        {num.format(campana.leadsTotales)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-neutral-400">Coste / Lead</span>
                      <span className="mt-0.5 block text-xs sm:text-sm font-bold text-emerald-400">{cpl}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>
                      {campana.formularios > 0 && `${campana.formularios} formularios · `}
                      {campana.conversaciones > 0 && `${campana.conversaciones} chats · `}
                      {num.format(campana.clics)} clics
                    </span>
                    <span>{num.format(campana.visitasWeb)} visitas web</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 text-center text-xs text-neutral-400">
            {meta.estado === "sin-configurar"
              ? "Configura META_ACCESS_TOKEN en las variables de entorno de Vercel para visualizar los datos en vivo."
              : meta.estado === "error"
                ? `Meta API Error: ${meta.mensaje}`
                : "No hay actividad registrada en este período."}
          </div>
        )}
      </section>

      {/* ── DESGLOSE DE RENDIMIENTO POR ANUNCIO (CREATIVOS) ─────────────────── */}
      <section aria-labelledby="rendimiento-anuncios" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="rendimiento-anuncios" className="font-display text-lg font-bold text-white">
              Rendimiento por Anuncio (Creativos)
            </h2>
            <p className="text-xs text-neutral-400">
              Identifica qué anuncio genera más prospectos al menor costo
            </p>
          </div>
          {metaOk && meta.anuncios.length > 0 && (
            <span className="text-xs text-neutral-400">{meta.anuncios.length} anuncios registrados</span>
          )}
        </div>

        {metaOk && meta.anuncios.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/90 shadow-md">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-neutral-400">
                  <th className="py-3 px-4">Anuncio / Creativo</th>
                  <th className="py-3 px-4">Campaña</th>
                  <th className="py-3 px-4 text-right">Inversión</th>
                  <th className="py-3 px-4 text-right">Leads</th>
                  <th className="py-3 px-4 text-right">Coste / Lead</th>
                  <th className="py-3 px-4 text-right">Clics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {meta.anuncios.map((ad, idx) => {
                  const esTop = idx === 0 && ad.leadsTotales > 0;
                  return (
                    <tr key={ad.id} className={`hover:bg-white/[0.02] transition-colors ${esTop ? "bg-dlc/[0.03]" : ""}`}>
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                        {esTop ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-dlc/40 bg-dlc/20 px-2 py-0.5 text-[10px] font-bold text-dlc uppercase">
                            <Trophy className="size-3" /> Top #1
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500 font-mono">#{idx + 1}</span>
                        )}
                        <span>{ad.nombre}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-400 max-w-[200px] truncate">
                        {ad.campanaNombre}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-neutral-200">
                        {formatoSoles(ad.gasto, moneda)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {num.format(ad.leadsTotales)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                        {ad.costoPorLead !== null ? formatoSoles(ad.costoPorLead, moneda) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-neutral-400">
                        {num.format(ad.clics)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 text-center text-xs text-neutral-400">
            Los anuncios de las 2 campañas activas aparecerán desglosados en esta tabla con su respectivo gasto, leads y costo por lead en cuanto se registren impresiones en Meta.
          </div>
        )}
      </section>

      {/* ── EMBUDO EJECUTIVO DE CONVERSIÓN (FUNNEL) ────────────────────────── */}
      <section aria-labelledby="embudo-conversion" className="space-y-4">
        <h2 id="embudo-conversion" className="font-display text-lg font-bold text-white">
          Embudo de Conversión de Ventas
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {/* Paso 1: Inversión */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              1. Inversión Meta
            </span>
            <p className="text-xl font-bold text-white">{formatoSoles(gastoMeta, moneda)}</p>
            <p className="text-[11px] text-neutral-400">Campañas activas</p>
          </div>

          {/* Paso 2: Visitas / Clics */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              2. Clics / Visitas
            </span>
            <p className="text-xl font-bold text-white">{num.format(totalesPropio.visitas)}</p>
            <p className="text-[11px] text-neutral-400">{totalesPropio.visitantes} visitantes únicos</p>
          </div>

          {/* Paso 3: Leads por API */}
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              3. Prospectos Web
            </span>
            <p className="text-xl font-bold text-white">{num.format(totalesPropio.leads + totalesPropio.contactos)}</p>
            <p className="text-[11px] text-neutral-400">
              {pct(totalesPropio.leads + totalesPropio.contactos, totalesPropio.visitas)} tasa de contacto
            </p>
          </div>

          {/* Paso 4: Leads en CRM */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              4. Leads en CRM
            </span>
            <p className="text-xl font-bold text-emerald-400">{num.format(totalesPropio.recibidos)}</p>
            <p className="text-[11px] text-emerald-300/80">{tasaLlegadaCRM} confirmados</p>
          </div>

          {/* Paso 5: Ventas */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.05] p-4 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
              5. Ventas Cerradas
            </span>
            <p className="text-xl font-bold text-purple-300">{num.format(totalesPropio.ventas)}</p>
            <p className="text-[11px] text-purple-300/80">Cierres confirmados</p>
          </div>
        </div>
      </section>

      {/* ── BITÁCORA DE ÚLTIMOS LEADS ENTRANTES ─────────────────────────────── */}
      <section aria-labelledby="ultimos-leads" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="ultimos-leads" className="font-display text-lg font-bold text-white">
            Últimos Prospectos Registrados
          </h2>
          {datosPropio && datosPropio.leads.length > 0 && (
            <span className="text-xs text-neutral-400">Mostrando últimos {datosPropio.leads.length}</span>
          )}
        </div>

        {datosPropio && datosPropio.leads.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/90 shadow-md">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold text-neutral-400">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Interés</th>
                  <th className="py-3 px-4">Inicial</th>
                  <th className="py-3 px-4">Formulario / Botón</th>
                  <th className="py-3 px-4">Fuente / Campaña</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {datosPropio.leads.map((l, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-neutral-400 whitespace-nowrap">{l.creado}</td>
                    <td className="py-3 px-4 font-medium text-white">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-dlc/30 bg-dlc/10 px-2.5 py-0.5 text-xs text-dlc font-semibold">
                        {l.datos?.motivo || "Casa de campo"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-300">{l.datos?.inicial || "—"}</td>
                    <td className="py-3 px-4 text-xs text-neutral-400">{nombreRastro(l.origen)}</td>
                    <td className="py-3 px-4 text-xs text-neutral-400">
                      {FUENTES[l.fuente] ?? l.fuente}
                      {l.campana && ` · ${l.campana}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 text-center text-xs text-neutral-400">
            Aún no hay formularios registrados en este período.
          </div>
        )}
      </section>

      {/* ── SECCIÓN PLEGABLE DE AUDITORÍA TÉCNICA ────────────────────────────── */}
      <details className="group border-t border-white/10 pt-6">
        <summary className="flex w-full cursor-pointer list-none items-center justify-between rounded-2xl border border-white/10 bg-neutral-900/60 px-5 py-4 text-left transition-colors hover:bg-neutral-900">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="size-4.5 text-neutral-400" />
            <span className="font-display text-sm font-semibold text-neutral-200">
              Herramientas de Auditoría Técnica (Gráfico diario, TikTok y Catálogo de Rastros)
            </span>
          </div>
          <ChevronDown className="size-4 text-neutral-400 transition-transform duration-200 group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-6 rounded-2xl border border-white/10 bg-neutral-950 p-6">
          {/* Gráfico diario */}
          {datosPropio && datosPropio.dias.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold text-white">Evolución Diaria de Visitas y Conversión</h3>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-neutral-900 p-4">
                  <p className="text-xs text-neutral-400 mb-2">Visitas por día</p>
                  <GraficoColumnas titulo="Visitas por día" dias={datosPropio.dias} series={SERIE_VISITAS} />
                </div>
                <div className="rounded-xl border border-white/10 bg-neutral-900 p-4">
                  <p className="text-xs text-neutral-400 mb-2">Clics a WhatsApp y Formularios por día</p>
                  <GraficoColumnas titulo="Conversiones por día" dias={datosPropio.dias} series={SERIES_CONVERSION} />
                </div>
              </div>
            </div>
          )}

          {/* Plataformas secundarias (TikTok) */}
          {plataformas.map((p) => (
            <div key={p.nombre} className="rounded-xl border border-white/10 bg-neutral-900 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Píxel de {p.nombre}</h4>
              {p.estado === "ok" && p.eventos?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {p.eventos.map((e) => (
                    <div key={e.evento} className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                      <span className="text-[11px] text-neutral-400 block">{e.evento}</span>
                      <span className="text-base font-bold text-white">{num.format(e.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">Sin eventos en este período o sin configurar.</p>
              )}
            </div>
          ))}
        </div>
      </details>
    </main>
  );
}
