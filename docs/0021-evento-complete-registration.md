# 0021 — Nuevo evento de conversión: `CompleteRegistration` en Meta y TikTok

**Fecha:** 2026-10-20 · **Rama:** `Jheferson`

## Qué se pidió

> «Vamos a cambiar de evento con el cual registramos tanto para meta y tiktok, este evento registrará en
> ambos meta/tiktok los registros que se capturan actualmente en el evento de meta y tiktok, en resumen vas
> a crear un nuevo evento en meta con otro nombre que reemplazará al evento actual, y que registrará todo lo
> que registra el actuaL y el otro quedará en desuso y no registrará nada, lo mismo hará en tiktok.»

Nombre elegido: **«Si, avanza con CompleteRegistration»**.

## Cómo estaba

Desde 0015/0018, cuando un formulario «Registrarme» (el del inicio o el del chat flotante) quedaba
guardado como fila en la hoja, `clientePotencial()` enviaba:

- **Meta:** `Lead`, con `eventID` = id del registro. Meta además manda una copia automática desde su
  servidor (`mpc2-prod-…run.app`) con el mismo id.
- **TikTok:** `SubmitForm`. `pixel.js` 2.2.1 lo envía con el nombre `Lead` y en la configuración del píxel
  figura como `FORM` (ver 0020).

Era el único evento de conversión. Al cargar la página solo se envía `PageView`.

## Qué se hizo

### Landing

`clientePotencial()` envía ahora **`CompleteRegistration`** («Registro completado») a los dos píxeles, en
el mismo momento (solo con la fila confirmada), con los mismos datos y el mismo id de evento:

```ts
window.fbq?.("track", "CompleteRegistration", { ...CONTENIDO, ...datos, origen: id, rastro }, { eventID: registroId });
window.ttq?.track("CompleteRegistration", { ...CONTENIDO, description: rastro }, { event_id: registroId });
```

El nombre vive en la constante `EVENTO_REGISTRO` de `src/shared/lib/pixeles.ts`. La landing **ya no
envía `Lead` ni `SubmitForm`**: esos eventos siguen en el historial de cada píxel, pero no recibirán nada
nuevo de la landing una vez publicado este cambio.

Por qué `CompleteRegistration`: es un evento **estándar** en Meta y en TikTok, así que los grupos de
anuncios pueden optimizar con él directamente, sin conversiones personalizadas. Encaja con el botón
«Registrarme».

### Panel

- **Meta** (`src/server/plataformas.ts`): la cifra del píxel de la landing (`clicsWhatsApp`, el nombre
  del campo viene de 0014) suma `offsite_conversion.fb_pixel_complete_registration` **y** el
  `offsite_conversion.fb_pixel_lead` anterior. Así, un rango de fechas que cruce el cambio no pierde los
  registros de antes. No hay doble conteo porque la landing envía uno u otro, nunca los dos.
  En la tarjeta «Clics a WhatsApp (Web)» el texto dice «Meta los cuenta como «Registro completado» (antes
  «Lead»)».
- **TikTok** (`nombreTikTok`): los tipos con `REGIST` se muestran como «CompleteRegistration (registro)» y
  `FORM` como «SubmitForm (formulario, en desuso)». El aviso de la pestaña TikTok ya no menciona
  `SubmitForm`, `Contact` ni `Lead`.

### Cuentas de Meta y TikTok (revisión y altas)

- **Meta:** no hace falta «crear» el evento. Los eventos que envía el código aparecen solos en el
  Administrador de eventos con el primer envío. No se usó `ads_pixel_event_create`: crea reglas sin
  código (por texto de botón o URL) que se dispararían **al hacer clic**, antes de confirmar la fila, y
  duplicarían el evento.
  - Conversiones personalizadas sobre el píxel `1409214864656514`: **ninguna**.
  - Conjuntos de anuncios que optimizan con `Lead` de este píxel: los dos están **pausados** (campaña
    pausada). No hay ninguno activo que se quede sin conversiones.
    - `120253309685490494` — `C_NVNRO_CONEXIPEMA_FINCAALGARROBO_LANDING_LAMB-JAEN-CUTERVO_22-55`
      (campaña `META_NVNRO-LANDING CONEXIPEMA_FINCAALGARROBO_`).
    - `120253059641670494` — `C_04_AS_01_CONEXIPEMA_FINCAALGARROBO_LANDING_LAMB-JAEN-CUTERVO_22-55`
      (campaña `C_04_CONEXIPEMA_FINCAALGARROBO_LANDING`).
- **TikTok:** se intentó registrar el evento en el píxel `Pixel_DLC-CONEXIPEMA_FincaAlgarrobo`
  (`7688841512808890386`, código `DAQ48QRC77U77GG14PMG`) con `pixel/event/create` (`ON_WEB_REGISTER`).
  TikTok respondió **`40002 Pixel cannot be modified`**: el píxel está **compartido** con la cuenta
  «ads dlc inmobiliaria» (`ownership_status: false`) y solo su dueño puede editarlo. No hace falta: el
  píxel está en modo de eventos por código (`CUSTOMIZE_EVENTS`) y sus eventos actuales (`FORM`, `CONSULT`,
  `LANDING_PAGE_VIEW`…) se dieron de alta solos al llegar. `CompleteRegistration` debería aparecer igual con
  el primer envío.
  - Grupo de anuncios **activo** que optimiza con `FORM` sobre este píxel:
    `1879339605026338` — `Cnvnro_01_CONEXIPEMA_FINCAALGARROBO_LANDING_LAMB-CAJ_18+` (campaña
    `TIKTOK_LANDING_NVNRO_CONEXIPEMA_FINCAALGARROBO`, entregando). **Cuando se publique este cambio, ese
    grupo deja de recibir conversiones** hasta que se le cambie el evento de optimización (ver
    Pendientes).
  - Los demás grupos con `FORM` usan otro píxel (`7691459618781921281`, formularios instantáneos) y no
    pasan por la landing: no les afecta.

No se modificó ninguna campaña, conjunto ni grupo de anuncios.

## Archivos tocados

| Archivo | Cambio |
| --- | --- |
| `src/shared/lib/pixeles.ts` | `EVENTO_REGISTRO = "CompleteRegistration"`; `clientePotencial()` lo envía a Meta y TikTok en lugar de `Lead` / `SubmitForm`. Regla del encabezado actualizada. |
| `src/server/plataformas.ts` | `extraerClicsWhatsApp()` suma `fb_pixel_complete_registration` + `fb_pixel_lead`; `nombreTikTok()` reconoce el registro y marca `FORM` como en desuso; comentarios. |
| `src/views/panel/PanelView.tsx` | Textos: «Registro completado (antes Lead)» y aviso de TikTok. |
| `test/formulario.spec.ts` | Espera `CompleteRegistration` en los dos píxeles; prueba nueva: un solo evento por píxel y nunca `Lead` ni `SubmitForm`. |
| `test/fase1.spec.ts` | F1.1: un clic o formulario que abre WhatsApp no llama a ningún píxel. |
| `test/fase5.spec.ts` | El ejemplo de Meta incluye `fb_pixel_complete_registration` y se comprueba la suma con el `Lead` anterior (10 + 3 = 13). |

## Cómo se verificó

- `npx vitest run`: **42 pruebas, 4 archivos, todo verde**.
- `npx tsc --noEmit`: sin errores. `eslint` sobre los archivos tocados: sin avisos.
- Consultas de solo lectura a Meta (conversiones personalizadas y conjuntos de anuncios) y a TikTok
  (píxel y grupos de anuncios), el 2026-10-20.
- **No se envió un evento real** a los píxeles: habría dejado una conversión de prueba en cada uno (y, sin
  simular la hoja, una fila). La forma de la llamada está cubierta por las pruebas.

## Pendientes (para el dueño)

1. **Publicar** (merge a `main` y despliegue en Vercel). Hasta entonces producción sigue enviando `Lead` /
   `SubmitForm`.
2. **Comprobar el primer envío** tras publicar: Administrador de eventos de Meta → píxel → «Probar
   eventos», y Administrador de eventos de TikTok → «Probar eventos». Debe llegar `CompleteRegistration`
   (no `Lead`) y, en Meta, también por la copia automática del servidor con el mismo id.
3. **TikTok — grupo activo `1879339605026338`:** cambiar el evento de optimización de `FORM` («Enviar
   formulario» / «Lead») a **«Registro completo» (`CompleteRegistration`)**, en cuanto el evento aparezca
   en el píxel (después del primer registro). Si TikTok no deja cambiar el evento en un grupo ya creado,
   hay que duplicar el grupo con el evento nuevo. Cambiarlo suele reiniciar el aprendizaje.
4. **Meta — si se reactivan** las campañas de landing `C_04_…_LANDING` o `META_NVNRO-LANDING …`: cambiar
   el evento de conversión de sus conjuntos de `Lead` a **«Registro completado»** antes de activarlas.
5. Pestañas abiertas antes de la publicación pueden enviar algún `Lead` / `SubmitForm` suelto durante un
   rato: es el código viejo en caché del navegador.
