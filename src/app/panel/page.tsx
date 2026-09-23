import type { Metadata } from "next";
import { RANGOS, obtenerMetricas } from "@/server/metricas";
import { estadisticasMeta, estadisticasTikTok } from "@/server/plataformas";
import { panelConfigurado, sesionValida } from "@/server/sesion-panel";
import { Ingreso, PanelSinConfigurar } from "@/views/panel/Ingreso";
import { PanelView } from "@/views/panel/PanelView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de medición · Finca Algarrobo",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ r?: string; error?: string }> };

export default async function Panel({ searchParams }: Props) {
  const { r, error } = await searchParams;
  if (!panelConfigurado()) return <PanelSinConfigurar />;
  if (!(await sesionValida())) return <Ingreso error={error === "1"} />;

  const dias = RANGOS.find((x) => String(x.dias) === r)?.dias ?? 7;
  const [metricas, meta, tiktok] = await Promise.all([obtenerMetricas(dias), estadisticasMeta(dias), estadisticasTikTok(dias)]);

  return <PanelView dias={dias} metricas={metricas} plataformas={[meta, tiktok]} />;
}
