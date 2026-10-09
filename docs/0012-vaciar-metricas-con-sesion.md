# 0012 — «Vaciar datos de prueba» con sesión y confirmación

**Fecha:** 2026-10-02 · Commit `3aa4232` (en producción)

## Contexto

En `5359b13` (Isa) volvió el botón «Vaciar datos de prueba» del panel con la
acción `limpiarMetricasPrueba` (`TRUNCATE TABLE eventos` + reinicio de
secuencia) **sin comprobar la sesión**. Una acción de servidor de Next.js se
puede invocar desde fuera de la página, así que cualquiera con su identificador
podía borrar las métricas sin la contraseña.

Decisión del usuario: mantener el borrado, limitado a las métricas y con
verificación de usuario.

## Qué se hizo

- `src/app/panel/acciones.ts`: `limpiarMetricasPrueba` exige `sesionValida()`
  en el servidor; borra solo la tabla de métricas con `DELETE FROM eventos`
  (la landing no tiene otras tablas); ya no reinicia secuencias.
- `src/views/panel/BotonVaciarMetricas.tsx` (**nuevo**, cliente): pide
  confirmación (`window.confirm`) antes de enviar.
- `src/views/panel/PanelView.tsx`: usa el botón nuevo y el texto ya no habla de
  «reiniciar la numeración a L-1».

## Verificación

`pnpm typecheck`, `pnpm lint` (0 errores), `pnpm build`. No se pulsó el botón
en producción (borraría datos reales).
