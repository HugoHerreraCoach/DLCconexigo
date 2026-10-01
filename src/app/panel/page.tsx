import type { Metadata } from "next";
import { RANGOS, obtenerMetricas } from "@/server/metricas";
import { campanasMeta, estadisticasTikTok } from "@/server/plataformas";
import { panelConfigurado, sesionValida } from "@/server/sesion-panel";
import { Ingreso, PanelSinConfigurar } from "@/views/panel/Ingreso";
import { PanelView } from "@/views/panel/PanelView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de medición · Finca Algarrobo",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    r?: string;
    desde?: string;
    hasta?: string;
    p?: "meta" | "tiktok";
    error?: string;
  }>;
};

export default async function Panel({ searchParams }: Props) {
  const { r, desde, hasta, p, error } = await searchParams;
  if (!panelConfigurado()) return <PanelSinConfigurar />;
  if (!(await sesionValida())) return <Ingreso error={error === "1"} />;

  const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const rangoPersonalizado =
    typeof desde === "string" && typeof hasta === "string" && FECHA_REGEX.test(desde) && FECHA_REGEX.test(hasta)
      ? { desde, hasta }
      : null;

  const dias = rangoPersonalizado ? null : RANGOS.find((x) => String(x.dias) === r)?.dias ?? 7;
  const paramRango = rangoPersonalizado ?? dias ?? 7;

  const [metricas, meta, tiktok] = await Promise.all([
    obtenerMetricas(paramRango),
    campanasMeta(paramRango),
    estadisticasTikTok(paramRango),
  ]);

  const plataformaActiva: "meta" | "tiktok" = p === "tiktok" ? "tiktok" : "meta";

  return (
    <PanelView
      dias={dias}
      desde={rangoPersonalizado?.desde}
      hasta={rangoPersonalizado?.hasta}
      plataforma={plataformaActiva}
      metricas={metricas}
      meta={meta}
      plataformas={[tiktok]}
    />
  );
}
