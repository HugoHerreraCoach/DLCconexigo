# ConexiGO | Clientes potenciales confirmados por WhatsApp
## Especificación de implementación, correcciones y limpieza de código

**Destino:** editor de código con acceso a ambos repositorios.  
**Fecha de preparación:** 9 de octubre de 2026.  
**Estado:** especificación para implementar; no representa código modificado, pruebas ejecutadas ni publicación.  
**Pruebas previstas:** 58 individuales y 30 generales.  
**Repositorios:** `HugoHerreraCoach/DLCconexigo` y `HugoHerreraCoach/conexigo`.

> **Regla principal:** un clic, abrir WhatsApp o completar el formulario no es una conversión. El cliente potencial se confirma únicamente después de que un mensaje real entrante de WhatsApp queda guardado en ConexiGO. Una misma persona no genera nuevos clientes potenciales por escribir más mensajes.

## 1. Instrucción para el editor

Implementa este documento por fases y modifica los dos proyectos de forma coordinada. Primero contrasta los archivos con la rama actual; después reutiliza los servicios existentes. Incluye pruebas en cada fase y reserva la última fase exclusivamente para pruebas generales. No avances con una dependencia crítica fallando.

No agregues integraciones ajenas a este alcance, campañas de mensajes salientes, importadores de contactos ni respuestas automáticas nuevas. No cambies la asignación de asesores, el comportamiento de Migo ni el ingreso habitual de mensajes. La medición debe acompañar la operación, no bloquearla.

Trabaja en ramas de funcionalidad y entornos de prueba. No publiques, ejecutes migraciones sobre producción, alteres campañas publicitarias reales ni envíes eventos reales a sus conjuntos de datos sin autorización de publicación. Sí debes preparar y probar los cambios, las migraciones, los adaptadores y el procedimiento de activación.

**Cortes consultados:** landing `dd0a5dbe`; CRM actualizado de `0c60b7a2` a `673fa1f0`. Los archivos principales de píxel y atribución no cambiaron entre esos cortes. Preserva los demás cambios de `main`. Las referencias completas están en [C0].

### 1.1 Resultado de negocio esperado

| Situación | Clientes potenciales nuevos | Otros registros permitidos |
|---|---:|---|
| Visitar la landing | 0 | Visita / PageView. |
| Completar el formulario y abrir WhatsApp | 0 | Intención de contacto / formulario preparado. |
| Abrir WhatsApp y abandonar sin enviar | 0 | Clic o intención, nunca conversión. |
| Enviar el primer mensaje real, guardado en el CRM | 1 | Mensaje entrante y conversión interna única. |
| El mismo contacto envía cinco mensajes adicionales | 0 adicionales | Cinco mensajes, no cinco clientes potenciales. |
| El proveedor reentrega el mismo webhook | 0 adicionales | Reintento técnico deduplicado. |
| Responde un asesor, Migo o una automatización | 0 | Mensaje saliente, fuera de esta conversión. |
| Falla Meta o TikTok después de confirmar la recepción | Se conserva el 1 interno | Entrega publicitaria pendiente, fallida o bloqueada. |

**Decisión adoptada para esta versión:** contar una sola adquisición por negocio y contacto canónico, en su primer mensaje humano de WhatsApp elegible. Un contacto creado previamente por otra vía puede calificar si nunca había escrito por WhatsApp. Un cliente que ya había escrito antes no vuelve a contarse por regresar desde otra campaña. Las conversaciones nuevas o reactivaciones pueden medirse aparte, pero no como nuevas adquisiciones.

### 1.2 Cuatro hechos que deben permanecer separados

**Intención:** alguien hizo clic o preparó un formulario. **Recepción confirmada:** existe un mensaje entrante persistido en el CRM. **Atribución:** qué fuente, anuncio o landing puede vincularse a esa recepción y con qué evidencia. **Entrega publicitaria:** el proveedor aceptó el evento. Ninguno debe sustituir a los otros.

La confirmación del mensaje es un hecho. La coincidencia por nombre o texto no prueba inequívocamente el origen del anuncio. Una caída de atribución no debe borrar una recepción real; una atribución estimada no debe presentarse como exacta.

## 2. Base verificada y correcciones obligatorias

| Hallazgo en el código revisado | Corrección requerida |
|---|---|
| `clientePotencial()` dispara Meta `Lead` y TikTok `SubmitForm` antes de abrir WhatsApp. [C1] | Eliminar esas conversiones del navegador. Conservar PageView y actividad de intención diferenciada. |
| `/api/whatsapp/recibido` admite cualquier código `L-*`, no solo el solicitado. [C2] | Resolver por coincidencia exacta, controlar ambigüedades y garantizar idempotencia. |
| El formulario valida celular, pero no lo usa al construir el mensaje ni al registrar la solicitud. [C3] | Usarlo para una intención pendiente y una coincidencia de teléfono protegida; nunca crear una conversión por completar el campo. |
| `/api/whatsapp/mensaje` empareja texto/nombre con clics recientes. [C4] | Mantener esas coincidencias como estimaciones, con evidencia explícita y sin reasignar arbitrariamente identificadores publicitarios. |
| El contrato del CRM no incluye todos los datos nuevos de la landing. [C5] | Versionar y sincronizar productor, validación, tipos, interfaz y pruebas. |
| Consultas fallidas de Meta se convierten en listas vacías; hay presupuestos de respaldo 70/140. [C6] | Diferenciar cero, desconocido, error y dato parcial. Eliminar importes inventados. |
| El registro por beacon carece de confirmación duradera; sin base, la ruta responde 204 sin guardar. [C7] | Eventos de intención idempotentes, comprobación explícita de persistencia cuando sea necesaria y observabilidad. |
| `asegurarEsquema()` ejecuta DDL y elimina un índice durante el arranque. [C8] | Migraciones controladas, comprobaciones de esquema y retirada del DDL de las peticiones tras migrar. |

Estas correcciones no autorizan borrar históricos, reescribir eventos anteriores como conversiones reales ni cambiar indiscriminadamente módulos ajenos.

## 3. Arquitectura objetivo

```text
LANDING
  Visita / clic / formulario preparado
     -> registro de intención, sin Lead publicitario
     -> apertura de WhatsApp

WHATSAPP -> WEBHOOK AUTENTICADO -> CRM
  mensaje entrante persistido
     -> conversión interna única
     -> trabajo persistente de enriquecimiento y entrega
          -> atribución, sin bloquear el conteo interno
          -> actualización firmada de la proyección de la landing
          -> Meta y/o TikTok, solo cuando el destino sea elegible

PANELES
  CRM: autoridad de conversiones confirmadas
  Landing: proyección sincronizada de conversiones asociadas a ella
  Plataformas: aceptación y atribución publicitaria, mostradas aparte
```

### 3.1 Autoridad y único emisor

El CRM será la autoridad de la conversión y el único emisor de los eventos publicitarios de cliente potencial. La landing conserva la actividad del navegador y los datos necesarios para la atribución; no emite conversiones de cliente potencial por su cuenta.

Reutiliza un motor servidor de conversiones si existe. La búsqueda puntual de `action_source` no devolvió coincidencias, pero eso no demuestra que no haya otra implementación: revisa dependencias, funciones y módulos antes de crearla.

El cambio no consiste en mover `fbq()` a otro componente: debe funcionar con la pestaña cerrada y sin depender de que el usuario vuelva a la web.

### 3.2 Persistencia propuesta

Los siguientes nombres son orientativos. Adáptalos al esquema real sin duplicar estructuras equivalentes:

| Entidad | Responsabilidad y restricciones |
|---|---|
| `conversiones_whatsapp` en CRM | Una fila por negocio + contacto canónico + clase de adquisición. Referencia al mensaje de prueba, fecha real, versión semántica y estado de atribución. |
| `conversiones_entregas` en CRM | Outbox: trabajos persistentes por conversión + destino + conjunto de datos. Estado, intentos, concesión, vencimiento y motivo seguro. |
| Intención de landing | ID estable, visitante, botón/formulario, fecha, procedencia, datos de emparejamiento y permisos. No es un contacto confirmado. |
| Proyección de conversiones en landing | Copia idempotente de confirmaciones autorizadas del CRM. No se escribe desde `/api/eventos` ni desde el navegador. |

**Restricciones mínimas:** unicidad de conversión por `(empresa_id, lead_id, clase)` usando el contacto canónico real; deduplicación del mensaje por negocio y su identidad externa; unicidad de entrega por conversión y destino; unicidad de confirmación en la landing. La pertenencia de mensaje, contacto, integración y landing debe comprobarse en el servidor.

Un identificador de conversión opaco y estable origina el `event_id` del proveedor. Nunca regeneres el ID en un reintento, reconexión o rotación de credenciales. La versión de software o de configuración no debe reiniciar la unicidad de adquisición.

### 3.3 Punto de confirmación y recuperación

El webhook ya tiene que validar autenticidad y resolver el negocio desde la integración de WhatsApp. Reutiliza ese recorrido. Solo después de persistir correctamente el mensaje se puede registrar la conversión; si la transacción revierte, no queda una conversión ni una entrega válida.

Evita HTTP a la landing o a plataformas dentro del ingreso del mensaje. Utiliza un trigger local corto o un servicio posterior, siguiendo el patrón existente, con trabajo persistente y restricciones de base de datos. Si el alta del trabajo falla, el mensaje debe conservarse y un reconciliador debe encontrar mensajes elegibles sin conversión. No dependas de una promesa sin esperar en un proceso serverless.

La documentación del proyecto advierte sobre modificar `ingresar_mensaje`; preserva su firma y semántica. La captura de `referral` se realiza después del ingreso. La conversión interna puede existir inmediatamente, pero su entrega publicitaria debe esperar el enriquecimiento necesario y dar prioridad al referral. [C9]

### 3.4 Mensajes elegibles

Deben ser mensajes reales entrantes del contacto por la integración de WhatsApp, no eventos de estado `sent/delivered/read`, ecos, mensajes salientes, sistema, reacciones ni importación de historial. Deben tener identidad externa, contacto y negocio válidos y fecha razonable.

Incluye texto, audio, imagen, documento y respuestas interactivas que el sistema reconozca como mensajes humanos. No exijas que el primer mensaje contenga una frase de la landing. No descartes un audio solo porque su texto esté vacío. Un mensaje elegible puede generar la adquisición aunque no se pueda atribuir a una landing.

Separa explícitamente ingreso en vivo de sincronización histórica/coexistencia. No uses únicamente «menos de una hora» como prueba: un webhook real puede llegar retrasado. Conserva fecha del evento, recepción del webhook y persistencia en el CRM. Valida relojes futuros y la fecha de corte, sin cambiar la fecha a «ahora» para forzar aceptación publicitaria.

Para mensajes fuera de orden, mantén un solo ID de adquisición. Resuelve el primer mensaje elegible conocido antes de congelar el payload externo cuando sea posible; una corrección posterior del mensaje de referencia no crea otro evento publicitario.

## 4. Landing, identidad y atribución

### 4.1 El navegador solo registra actividad previa

Retira `Lead`, `SubmitForm` y cualquier alias de cliente potencial de los manejadores de clic, formulario, chat flotante y callbacks de apertura de WhatsApp. Conserva PageView. Busca también duplicados en scripts, etiquetas y configuraciones externas de eventos automáticos.

Usa nombres inequívocos, por ejemplo `whatsapp_click` y `formulario_preparado`. Pueden vivir solo en la analítica interna; no sustituyas la conversión retirada por otro evento que la plataforma vuelva a optimizar como cliente potencial. Las filas históricas `tipo='lead'` deben permanecer identificadas como la semántica anterior, no convertirse en clientes confirmados.

Añade un ID único por intento para deduplicar la ingesta. Un doble manejador no debe registrar dos veces una misma acción. Los clics verdaderamente distintos pueden seguir contándose como actividad, nunca como adquisiciones.

### 4.2 Corrección del celular del formulario

Mantén la experiencia comercial y utiliza el celular para registrar una **intención pendiente**, no un lead confirmado. Normaliza con país explícito y validación real; no aceptes simplemente «nueve o más dígitos» ni impongas Perú a todos los negocios.

La landing puede recibir el teléfono transitoriamente por HTTPS y guardar una huella HMAC específica del negocio para el emparejamiento. El CRM calcula la misma huella a partir del teléfono real del remitente. No guardes el teléfono en claro en analítica, URLs o logs. No lo envíes a plataformas antes de la recepción ni reutilices esta captura para mensajes salientes.

El secreto de emparejamiento debe ser servidor, versionado y distinto del secreto de firma o derivado con separación de propósito documentada. Rotar la firma no debe invalidar silenciosamente intenciones pendientes. No confundas esta huella HMAC con el formato de hash que pueda requerir una plataforma publicitaria.

Persistir la intención debe devolver su ID antes de afirmar que quedó guardada. Si falla, permite continuar a WhatsApp, muestra un mensaje honesto y registra el fallo: no inventes una intención exitosa ni bloquees el contacto comercial. Sustituye «enviado» por una indicación como «Continúa en WhatsApp para enviar tu mensaje»; abrir otra aplicación no confirma el envío.

### 4.3 Niveles de evidencia

Prioriza la atribución directa del proveedor cuando exista y corresponda al mensaje. Un referral de anuncio directo a WhatsApp no se debe adjudicar además a la landing por compartir un texto genérico.

Para la landing, distingue referencia técnica inequívoca, coincidencia por teléfono, coincidencia por nombre, coincidencia por plantilla y sin atribución. Una coincidencia de teléfono debe ser única dentro de una ventana definida, corresponder al remitente real y no contradecir otra evidencia. No la llames «prueba del anuncio»; documenta su nivel de confianza. Con dos candidatos indistinguibles, devuelve ambigüedad, no selecciones el más reciente arbitrariamente.

Conserva el reconocimiento por nombre/texto para contexto estimado, no como identidad exacta. No adjuntes `_fbc`, `_fbp`, `ttclid`, `_ttp`, IP o agente de otro visitante a una conversión basándote solo en la plantilla. Con varias landings activas, una coincidencia genérica no permite escoger una al azar.

No reincorpores códigos visibles en los mensajes actuales como efecto lateral de esta tarea. Los enlaces sin teléfono o referencia suficiente pueden quedar sin atribución inequívoca. Eso no impide confirmar el cliente en el total del CRM.

### 4.4 Reparación del recorrido antiguo

En `/api/whatsapp/recibido`, elimina las alternativas `codigo = 'L-1'` y `codigo LIKE 'L-%'`. Normaliza y busca únicamente el código solicitado dentro de la landing correspondiente. Si no existe, devuelve no encontrado. Si el histórico contiene varias filas con ese código, identifica el caso como ambiguo y no actualices ninguna al azar.

Audita duplicados antes de recrear un índice único. Mantén idempotencia transaccional y pruebas de concurrencia: repetir un aviso debe apuntar siempre a la misma fila. Conserva los datos históricos; no reasignes recepción o venta sin evidencia.

La ruta antigua no será otra autoridad que incremente clientes potenciales: deberá actuar como adaptador de atribución/proyección del ID canónico del CRM. `venta:true` no prueba un mensaje ni una adquisición. Preserva la compatibilidad documentada de ventas, pero exige una venta real identificada para cualquier cambio nuevo; no inventes un circuito de ventas dentro de este trabajo.

## 5. Entrega a Meta y TikTok desde el servidor

### 5.1 Elegibilidad y alcance

Confirma por negocio el destino publicitario, sus permisos, tokens y fuente de datos. Un token que permite leer campañas no demuestra permiso para escribir conversiones. No copies automáticamente las credenciales de DLC a otros negocios ni publiques secretos en la respuesta del panel.

Cada conversión real se evalúa por destino. Debe existir configuración autorizada y permiso aplicable para compartir los datos, además de cumplir el contrato del proveedor. Sin ello, registra `bloqueada_configuracion`, `sin_permiso_datos` o `sin_datos_atribucion`, según corresponda; el contador interno continúa siendo correcto.

Para el píxel asociado a una landing, no envíes como suyos todos los contactos del negocio. Envía únicamente los elegibles bajo una política explícita de atribución; las coincidencias genéricas por nombre/plantilla no deben transportar identificadores de clic. Los contactos no atribuibles permanecen en el total CRM y separados del subtotal de la landing.

### 5.2 Contratos publicitarios

**Meta:** integra mediante Conversions API y valida el evento, la fuente de acción y el conjunto de datos concretos antes de activar. El SDK oficial distingue `chat`, `website` y `business_messaging`; no declares `website` solo porque el recorrido empezó en una web. El hecho final sucede al recibir el mensaje. Usa `Lead` únicamente donde lo admita el contrato validado; la modalidad de mensajería empresarial debe comprobarse separadamente, incluidos sus nombres de evento y requisitos de identidad. No fuerces el mismo payload en todas las modalidades. [E1, E2]

**TikTok:** implementa Events API con la fuente de datos adecuada a este recorrido, sin fingir un evento web si corresponde a otra fuente. TikTok documenta que `SubmitForm` se renombra a `Lead`, conserva compatibilidad histórica y recomienda los nombres nuevos para nuevas configuraciones. Define un único mapeo, no envíes ambos como dos eventos. Tener el píxel de navegador no acredita disponer del acceso servidor requerido. [E3, E4]

**Campos comunes:** `event_id` persistente, nombre/mapeo verificado, hora del mensaje real y datos permitidos del remitente o del recorrido vinculado. No envíes el texto íntegro del chat. No uses la IP o el agente del servidor de Meta/CRM como si fueran del visitante. No inventes identificadores de clic. Valida normalización y hashing según cada API.

La documentación web detallada de Meta devolvió limitación de acceso durante esta preparación. Las estructuras generales se contrastaron con su SDK oficial, pero la combinación exacta de evento, destino y modalidad debe quedar respaldada por documentación vigente y una prueba real del editor. No declarar completada esa parte solo por aceptar un mock. [E1, E2]

### 5.3 Outbox, reintentos y estados

Separa `pendiente`, `procesando`, `aceptada`, `fallida`, `resultado_desconocido`, `bloqueada` y `expirada`, con motivos seguros y trazabilidad. Usa concesiones temporales, reclamación atómica, espera progresiva con dispersión, límites por negocio y reconciliación de trabajos abandonados.

Una respuesta HTTP exitosa no basta: interpreta el resultado de cada evento según el proveedor. Distingue **aceptado por la API** de **atribuido por la plataforma**; no prometas igualdad instantánea entre Ads Manager y los contadores propios.

Si se pierde la respuesta después del envío, conserva el mismo ID y payload. Reintenta solo dentro de las garantías y ventanas de deduplicación verificadas; fuera de ellas, no reenvíes ciegamente. TikTok documenta una ventana de 48 horas para eventos de Events API con el mismo evento e ID. La deduplicación local debe durar más que los reintentos y no depender solo de esa ventana. [E5]

En esta versión el cliente potencial será exclusivamente servidor: no lo dupliques desde el navegador después de confirmarlo. Un reintento nunca incrementa el contador CRM y una caída de un destino no impide procesar los demás.

## 6. Contrato entre repositorios y paneles

### 6.1 Confirmación firmada a la landing

Reutiliza el canal HMAC servidor a servidor, pero añade un contrato versionado para proyectar conversiones, por ejemplo `POST /api/conexigo/conversiones`. Es una ruta propuesta, no un archivo existente. Incluye versión, ID canónico, identidad del emisor/landing, fecha real, ID de intención cuando exista, evidencia y datos mínimos.

La landing valida firma sobre bytes exactos, timestamp, repetición e identidad autorizada. Cada landing debe estar ligada a su negocio mediante configuración servidor. Un `empresa_id` dentro del cuerpo o una firma válida por sí solos no autorizan escribir en otro negocio. Usa HTTPS, destino permitido, control de SSRF, rechazo de redirecciones, tamaño limitado y respuestas acotadas.

Un replay no crea otra fila. Una misma conversión enviada con datos incompatibles debe generar un conflicto visible. Los cambios de atribución posteriores se versionan sin volver a contar ni reenviar el evento publicitario. La ruta pública de actividad debe rechazar intentos de registrar conversiones confirmadas.

### 6.2 Métricas con semántica explícita

| Métrica | Autoridad / definición |
|---|---|
| Visitas y clics a WhatsApp | Actividad de navegador; no clientes potenciales. |
| Formularios preparados | Intenciones previas al envío; no recepciones. |
| Mensajes entrantes | Cantidad de mensajes humanos únicos, no cantidad de personas. |
| Clientes potenciales WhatsApp | Adquisiciones únicas confirmadas en CRM. |
| Clientes potenciales de la landing | Subconjunto confirmado y asociado con evidencia admitida a esa landing. |
| Atribuciones estimadas | Recepciones reales con origen estimado, mostradas aparte. |
| Eventos publicitarios | Pendientes, aceptados, rechazados o bloqueados por destino. |

Los totales diarios de adquisición se agrupan por la hora real del mensaje en `America/Lima`, no por la hora del clic ni por el último reintento. Conserva timestamps UTC y convierte únicamente al agrupar/presentar.

No dividas adquisiciones recibidas hoy entre clics hechos hoy y lo llames una tasa exacta de conversión: pueden pertenecer a días distintos. Para una tasa clic-a-mensaje usa una cohorte de intenciones únicas del mismo intervalo y sus confirmaciones, con ventana y nivel de atribución declarados. Si no puede calcularse con rigor, muestra «sin datos suficientes».

Actualiza a la vez `metricas.ts`, la ruta del panel, `pixel.landing.ts`, los tipos compartidos y ambas interfaces. Usa contrato v2 o negociación explícita; no cambies silenciosamente el significado del campo `leads`. Durante la transición, etiqueta v1 como «intenciones históricas», no como clientes confirmados.

Reincorpora los campos útiles que hoy se descartan —ventas, anuncios, presupuestos y estados— solo con definición y fuente verificables. Un dato no implementado es nulo o no disponible, no cero. El «anuncio ganador» necesita criterios y datos completos; no selecciones un ganador cuando faltan resultados.

### 6.3 Correcciones de reportes y registro

Elimina los `.catch(() => ({ data: [] }))` que convierten fallos publicitarios en resultados normales. Conserva las consultas independientes y devuelve estado parcial con el motivo seguro de cada fuente. Elimina los presupuestos de respaldo 70/140 y cualquier moneda o resultado no confirmado que se presente como un dato real.

Mueve cuenta y campañas objetivo a configuración servidor por negocio/landing. Prefiere IDs estables y conserva los filtros actuales de DLC como configuración inicial; no amplíes inadvertidamente el reporte a todas las campañas de la cuenta. Revisa paginación, límites de rangos, fechas y cachés. No llames «tiempo real» a datos cacheados.

El registro público de intenciones necesita límite de tamaño antes de consumir cuerpos grandes, validación de origen cuando proceda, protección contra abuso, listas de campos y errores seguros. `sendBeacon` puede seguir como optimización para actividad no crítica, no como prueba de persistencia. Una base no configurada debe ser visible en salud operativa y no simular almacenamiento exitoso.

## 7. Históricos, seguridad y limpieza

Define un instante de corte `T0` explícito y una versión de semántica. Conserva todos los clics y formularios anteriores con su significado original. No los reenvíes a Meta/TikTok ni conviertas `recibido_en` histórico en prueba definitiva: el recorrido antiguo pudo asignarlo incorrectamente.

Antes del corte identifica los contactos que ya tenían mensajes humanos de WhatsApp, para que una nueva respuesta no los convierta en adquisiciones nuevas. Esa marca de elegibilidad no es una conversión retroactiva. Los históricos de coexistencia posteriores al corte tampoco generan adquisiciones nuevas por importarse.

Cualquier reconstrucción histórica será un proceso separado, autorizado, auditable y sin envío publicitario por defecto. No borres duplicados históricos para hacer pasar un índice: produce un informe y una migración reconciliada. No uses la fecha fija actual de inicio de medición de la landing como sustituto de `T0`.

Migra primero el esquema y después elimina el DDL ejecutado desde las peticiones. No edites migraciones ya aplicadas. Usa las herramientas del proyecto para crear nuevas migraciones, ensaya aplicación/reaplicación y conserva reversión compatible sin pérdida de mensajes o conversiones.

Las tablas expuestas deben tener RLS y permisos mínimos. Los procesos con privilegios de servicio deben filtrar explícitamente por negocio. Revisa grants por columna y RPC, especialmente porque el proyecto ya depende de ellos. Los secretos, textos de chat, nombres, teléfonos e identificadores de seguimiento no deben aparecer en logs o respuestas públicas. [E6]

Documenta retención y eliminación de intenciones, hashes y señales publicitarias; un hash no elimina por sí mismo la necesidad de protección. Conserva solo las claves de deduplicación mínimas compatibles con la política de retención y con la eliminación/fusión de contactos. No reinicies adquisiciones por fusionar, reconectar WhatsApp o recrear una configuración.

**Limpieza exigida:** retirar funciones y tipos muertos de conversión por clic; renombrar manejadores de intención; actualizar comentarios que contradicen el código; centralizar normalización, firma y decisión de elegibilidad; separar analítica de atribución y entrega; remover excepciones silenciosas; evitar `any` y contratos divergentes. Mantén adaptadores antiguos solo mientras existan consumidores y pruebas. No hagas refactorizaciones generales fuera de este módulo.

## 8. Mapa de intervención

Rutas relativas a la raíz de cada repositorio. Las carpetas nuevas se diseñan en la fase 0; no se presupone que ya existan.

### DLCconexigo

- `src/shared/lib/pixeles.ts` y `src/shared/ui/Pixeles.tsx`: retirar conversión por clic y preservar PageView.
- `src/shared/lib/registro.ts` y `src/app/api/eventos/route.ts`: intenciones, IDs, validación y persistencia.
- `src/views/home/components/FormularioContacto.tsx`: teléfono útil, intención pendiente y estado visual honesto.
- `src/shared/lib/whatsapp.ts` y `src/shared/lib/plantillas.ts`: apertura, personalización y reconocimiento sin confundir identidad.
- `src/server/nombre-huella.ts`: separar finalidad, versión y rotación de huellas.
- `src/app/api/whatsapp/recibido/route.ts` y `src/app/api/whatsapp/mensaje/route.ts`: reparar código exacto y evidencia de atribución.
- `src/server/db.ts`, `src/server/metricas.ts` y `src/server/plataformas.ts`: migraciones, semántica, calidad y configuración.
- `src/app/api/conexigo/panel/route.ts` y la vista `/panel`: contrato v2 y métricas coherentes.
- Nueva ruta servidor de confirmación y proyección: añadir solo después de definir y probar su contrato.

### conexigo

- `apps/api/src/modules/business/ventas/integraciones/`: ingreso WhatsApp y datos de referral; no alterar innecesariamente `ingresar_mensaje`.
- `apps/api/src/modules/business/ventas/atribucion/`: repositorio, decisiones, cliente HTTP y despachador; reutilizar sin confundir atribución con conversión.
- `apps/api/src/modules/business/marketing/pixel/`: servicio, repositorio y validación del panel.
- `packages/types/src/marketing/pixel.types.ts`: contrato compartido versionado.
- `apps/web/src/modules/marketing/pixel/`: etiquetas, fuentes, estados y métricas.
- `supabase/migrations/` y `supabase/verificaciones/`: migraciones nuevas y pruebas reales de permisos, unicidad y concurrencia.
- `docs/sistema/`, `docs/pendientes/` y documentación de integración: actualizar semántica y límites operativos.

## 9. Plan de ejecución por fases

Cada fase cierra con archivos cambiados, pruebas ejecutadas y resultados, commit evaluado, dependencias externas y pendientes. No basta declarar «funciona» ni listar pruebas que no se ejecutaron.

### Fase 0 — Reconocimiento, contratos y línea base

**Implementación.** Revisar ambos repositorios y su documentación. Identificar todos los emisores de Lead, consumidores de métricas, ingreso en vivo/histórico y automatizaciones afectadas. Verificar configuración y scripts sin leer ni publicar secretos. Documentar las reglas de unicidad, atribución y fuentes de datos; preparar dos negocios ficticios y proveedores simulados. Confirmar el contrato Meta/TikTok que se implementará.

**Pruebas individuales:** F0.1 ejecutar suites existentes y registrar fallos previos; F0.2 rastrear una acción desde el clic hasta el webhook; F0.3 comprobar separación A/B; F0.4 asegurar que el entorno no emite a conjuntos de datos reales; F0.5 inventariar scripts y etiquetas externos que también disparan conversiones.

**Salida:** mapa técnico, contratos propuestos, pruebas base y bloqueos externos concretos. No inventar credenciales ni declarar aprobada una plataforma sin acceso.

### Fase 1 — Retirar conversiones prematuras y registrar intenciones

**Implementación.** Quitar Lead del navegador; centralizar clics; crear identificadores estables; convertir el formulario en una intención persistida con teléfono protegido y estado honesto. Mantener compatibilidad de recepción de clientes web antiguos: sus eventos `lead` siguen tratándose como intención, nunca como confirmación.

**Pruebas individuales:** F1.1 visitar genera PageView sin Lead; F1.2 formulario válido genera intención y cero clientes; F1.3 clic y abandono no generan conversión; F1.4 doble manejador/reintento no duplica la intención; F1.5 formulario inválido no se guarda como válido; F1.6 fallo de base sigue permitiendo WhatsApp sin afirmar éxito; F1.7 un payload público que diga «confirmado» es rechazado.

**Salida:** ningún recorrido cliente nuevo emite una conversión; la actividad sigue medible.

### Fase 2 — Conversión canónica al persistir el mensaje

**Implementación.** Crear o reutilizar el registro de adquisición y la outbox. Conectar el ingreso real sin llamadas externas bloqueantes. Implementar elegibilidad, claves únicas, reconciliación y control histórico. Registrar mensajes entrantes y adquisiciones como métricas distintas.

**Pruebas individuales:** F2.1 primer texto persistido crea una adquisición; F2.2 primer audio/imagen también califica; F2.3 mensajes siguientes no duplican; F2.4 webhook duplicado y dos workers producen una fila; F2.5 rollback del mensaje deja cero conversiones; F2.6 estado/eco/histórico/saliente no califica; F2.7 fallo al encolar se recupera por reconciliación; F2.8 primer mensaje retrasado legítimo no se pierde por un límite arbitrario de una hora.

**Salida:** el contador interno se demuestra con PostgreSQL real, independiente de los proveedores y la atribución.

### Fase 3 — Atribución, corrección de códigos y confirmación de landing

**Implementación.** Reparar coincidencia exacta de códigos; conservar compatibilidad; añadir coincidencia de teléfono con evidencias y ambigüedad; mantener texto/nombre como aproximados; priorizar referral; implementar la proyección firmada idempotente y resolver varias landings sin adivinar.

**Pruebas individuales:** F3.1 solicitar L-1 no selecciona L-2; F3.2 L-999 inexistente no actualiza nada; F3.3 reintentos del mismo aviso actualizan una única fila; F3.4 dos candidatos ambiguos no se atribuyen arbitrariamente; F3.5 teléfono coincide solo dentro del negocio correcto; F3.6 nombre/plantilla no se etiquetan como exactos; F3.7 referral tardío prevalece antes del envío; F3.8 firma inválida, replay, timestamp vencido y cruce de negocio no duplican ni contaminan la proyección.

**Salida:** recepción y atribución están separadas; ninguna confirmación de landing nace de un clic público.

### Fase 4 — Entrega publicitaria servidor y deduplicación

**Implementación.** Crear adaptadores del proveedor detrás del motor único del CRM. Configurar destinos autorizados y permisos. Construir payloads mínimos, IDs estables y estados de entrega. Añadir límites, reintentos, vencimiento, pausa y manejo de respuesta incierta.

**Pruebas individuales:** F4.1 sin mensaje real no hay trabajo publicitario; F4.2 conversión elegible envía el mapeo correcto; F4.3 reintento conserva ID, nombre y fecha; F4.4 timeout posterior al envío queda incierto, sin reenvío ciego; F4.5 errores de token/payload no se marcan aceptados; F4.6 ausencia de permiso de datos bloquea solo la entrega; F4.7 un destino caído no detiene otro; F4.8 el navegador cerrado no afecta; F4.9 no viajan cookies de una coincidencia genérica ajena.

**Salida:** pruebas de contrato y funcionamiento en modo de prueba de cada proveedor. Si falta acceso real, el adaptador queda implementado y probado localmente, pero su validación externa figura bloqueada; no se restaura el Lead por clic.

### Fase 5 — Paneles, contratos y calidad de métricas

**Implementación.** Publicar contrato versionado en productor y consumidor; añadir métricas confirmadas, estimadas y estados de entrega. Corregir presupuestos ficticios, errores convertidos en cero, configuración de campañas, rangos, paginación y cachés. Mantener tasas por cohortes y horarios coherentes.

**Pruebas individuales:** F5.1 respuesta realista de landing conserva campos en el parser CRM; F5.2 clics aumentan sin aumentar clientes; F5.3 recepción aumenta una vez y reconcilia ambos paneles; F5.4 error parcial Meta no se muestra como cero válido; F5.5 presupuesto ausente es nulo; F5.6 medianoche de Lima y mensaje al día siguiente agrupan correctamente; F5.7 v1 se identifica como histórico/intenciones; F5.8 un negocio no ve datos de otro mediante caché o selector.

**Salida:** las pantallas permiten explicar de dónde proviene cada cifra; no suman capturas previas con conversiones reales.

### Fase 6 — Limpieza, migraciones y endurecimiento

**Implementación.** Retirar código muerto y comentarios obsoletos; unificar helpers; sacar DDL de las peticiones después de migrar. Revisar RLS, grants, SSRF, logs, retención y rotación. Preparar migraciones aditivas y ensayo de reversión. Documentar todo adaptador antiguo conservado.

**Pruebas individuales:** F6.1 aplicar y reaplicar migraciones en PostgreSQL; F6.2 lectura/escritura A/B y rol no autorizado; F6.3 índice no destruye históricos duplicados; F6.4 rotar firma no rompe huellas pendientes; F6.5 logs no contienen secretos o datos personales; F6.6 arranque/peticiones no ejecutan DDL; F6.7 compilación, tipos, lint y suites afectadas limpias o con fallos previos documentados.

**Salida:** código mantenible, históricos conservados y ningún debilitamiento del ingreso de mensajes.

### Fase 7 — Candidato de publicación y procedimiento operativo

**Implementación.** Preparar flags por negocio, corte T0, registro de contactos preexistentes, ensayo de transición v1/v2, conciliación y alertas. Definir orden: esquema compatible; receptor y consumidor v2; frontend sin Lead; activación de conversión; activación publicitaria autorizada. No realizar ese despliegue real dentro de esta tarea documental.

**Pruebas individuales:** F7.1 interruptor detiene entregas, no mensajes; F7.2 corte no envía históricos; F7.3 cola sobrevive a reinicio; F7.4 reversión conserva conversiones e intenciones; F7.5 contratos cruzados de versiones fallan de forma comprensible; F7.6 configuración de destino nuevo no reenvía adquisiciones antiguas automáticamente.

**Salida:** commits candidatos identificados en ambos repositorios, runbook y evidencias. Congelar funcionalidad antes de la fase final.

### Fase 8 — Exclusivamente pruebas generales

No desarrollar funciones ni hacer limpieza en esta fase. Ejecutar la matriz siguiente sobre los commits candidatos. Si aparece un defecto, registrarlo, corregirlo en la fase correspondiente y repetir las pruebas afectadas y generales sobre un nuevo candidato.

## 10. Matriz final de pruebas generales

Todos los escenarios se ejecutan con datos ficticios y aislamiento por entorno. «Real» en los escenarios de proveedor significa una cuenta/número/conjunto de datos de prueba autorizado, no tráfico de clientes.

| ID | Escenario | Resultado obligatorio |
|---|---|---|
| G01 | Diez visitas sin contacto. | Visitas registradas; cero adquisiciones y cero Lead enviados. |
| G02 | Cinco formularios preparados y WhatsApp abandonado. | Cinco intenciones válidas; cero adquisiciones. |
| G03 | Formulario, cierre de landing y primer mensaje real. | Una adquisición; entrega servidor elegible sin pestaña abierta. |
| G04 | Botón directo sin formulario y mensaje real. | Una adquisición CRM; origen solo con evidencia suficiente. |
| G05 | Primer mensaje es un audio o una imagen. | Una adquisición aunque no exista texto reconocible. |
| G06 | Mismo cliente envía diez mensajes. | Diez mensajes humanos únicos; una adquisición, no diez. |
| G07 | El mismo webhook se entrega diez veces. | Un mensaje canónico y una adquisición. |
| G08 | Dos workers procesan simultáneamente. | Una conversión y una entrega por destino. |
| G09 | Falla y revierte la persistencia del mensaje. | Cero adquisiciones y cero entregas. |
| G10 | El mensaje se guarda y falla la outbox. | Se conserva el mensaje; reconciliación produce una adquisición. |
| G11 | Migo, asesor, estados y ecos. | No incrementan adquisiciones. |
| G12 | Importación histórica / coexistencia. | No genera conversiones nuevas ni envío retroactivo. |
| G13 | Contacto preexistente vuelve a escribir. | No se cuenta otra adquisición; puede medirse reactivación aparte. |
| G14 | Contacto creado antes, sin mensajes previos de WhatsApp. | Primer mensaje humano en vivo califica una sola vez. |
| G15 | Mismo teléfono o ID externo en dos negocios de prueba. | Aislamiento completo según las claves reales del sistema. |
| G16 | L-1, L-2, código inexistente y código histórico duplicado. | Coincidencia exacta o ambigüedad; nunca elección arbitraria. |
| G17 | Personas homónimas o mismo texto genérico. | No se afirma identidad exacta ni se mezclan cookies publicitarias. |
| G18 | Varias landings y referral directo a WhatsApp. | No se atribuye al azar ni se duplica entre recorridos. |
| G19 | Meta/TikTok caído o credencial revocada. | Conteo interno intacto; estado de entrega visible y recuperable. |
| G20 | El proveedor acepta y la respuesta se pierde. | Mismo ID; política segura de incertidumbre y reintento. |
| G21 | Llegada retrasada y mensajes fuera de orden. | Una adquisición; fecha del hecho conservada, sin duplicar. |
| G22 | Falta permiso de datos o acceso servidor TikTok. | No se envía al destino; bloqueo explícito, sin volver al clic. |
| G23 | Panel CRM y landing, caché y cambio de día. | Conciliación por ID y fecha; desfase temporal explicado. |
| G24 | Meta devuelve datos parciales/presupuesto ausente. | Error o nulo, no cero ficticio, 70/140 o ganador inventado. |
| G25 | Payload público falso, firma inválida, replay y SSRF. | Rechazo o deduplicación sin escrituras cruzadas. |
| G26 | Reinicio, rollback y cambio de versión. | Sin perder mensajes, conversiones o trabajos pendientes. |
| G27 | 1.000 mensajes mezclados de 100 contactos elegibles nuevos. | 100 adquisiciones; carga con proveedores simulados, sin spam real. |
| G28 | Recorrido autorizado hasta cada proveedor y revisión de etiquetas. | Un evento servidor elegible; ningún Lead de clic por código o regla externa. |
| G29 | Revisión de Bandeja, Migo, asesores, embudos y plantillas existentes. | Sin regresiones ni nuevas acciones comerciales involuntarias. |
| G30 | Corte T0 con históricos y pestañas antiguas. | Se detecta transición; no se reetiquetan ni reenvían históricos. |

### 10.1 Requisitos de la prueba real

Captura el ID anonimizado del mensaje, la conversión canónica, el trabajo de entrega, el `event_id`, la respuesta del proveedor y la evidencia de sus herramientas de prueba. Incluye el caso de abandono antes del envío y el de recepción con navegador cerrado. No publiques teléfonos, secretos ni el contenido de conversaciones.

Las pruebas de SQL deben ejecutarse contra PostgreSQL con concurrencia; la reproducción anterior en SQLite solo demostró el predicado defectuoso, no validó migraciones ni transacciones del proyecto. Las pruebas de interfaz deben inspeccionar red y no limitarse al cambio visual de un contador.

En la landing, el `package.json` revisado incluye `lint`, `typecheck` y `build`, pero no un script de tests. Añade un runner compatible y pruebas de navegador; no reportes un `pnpm test` inexistente como ejecutado. [C10]

Comandos de referencia existentes, sujetos a verificar en el checkout del editor:

```text
# Desde DLCconexigo
pnpm lint
pnpm typecheck
pnpm build

# Desde conexigo
pnpm --filter @conexigo/api exec jest --runInBand src/modules/business/marketing/pixel
pnpm --filter @conexigo/api exec jest --runInBand src/modules/business/ventas/atribucion
pnpm --filter conexigo exec vitest run src/modules/marketing/pixel
```

Añade las suites nuevas y las de ingreso WhatsApp, SQL, migraciones, contratos y extremo a extremo que correspondan. No confundas «compila» con «funciona en producción».

## 11. Publicación, límites y aceptación

La entrega del editor debe incluir cambios en ambos repositorios, migraciones, pruebas, listado de archivos eliminados/conservados, contratos, variables necesarias sin valores secretos y un informe por fase. El informe final debe distinguir aprobado, fallido y bloqueado, con evidencia y commit.

**Puerta de aceptación:** cero conversiones por clic; una adquisición por primer mensaje elegible; idempotencia probada; aislamiento entre negocios; históricos preservados; ambos paneles reconciliables; ausencia de importes ficticios; pruebas generales sin defectos críticos o altos; regresiones comprobadas; verificación real de los destinos habilitados.

La activación productiva exige autorización aparte. Comienza con un negocio piloto, interruptores independientes para captación interna, proyección y entrega, y alertas por discrepancias, cola atrasada y fallos. La reversión debe poder detener entregas sin detener WhatsApp ni borrar evidencias.

Revisa reglas de eventos del administrador publicitario y gestores de etiquetas, no solo el repositorio. El código nuevo no puede retirar un `Lead` ya enviado por una pestaña antigua ni corregir automáticamente cifras históricas del proveedor. Documenta ese intervalo de transición, purga cachés aplicables y evita publicar una comparación antes/después como si la definición no hubiera cambiado.

Un destino sin credenciales, contrato verificado o prueba real queda bloqueado; eso no obliga a dejar de contar correctamente las recepciones internas. Tampoco permite declarar completada la entrega publicitaria. Nunca uses de nuevo el clic como sustituto para aparentar que hay conversiones.

## 12. Referencias de implementación

Las referencias de código corresponden a los cortes indicados; no certifican variables, migraciones o despliegues de producción. Las decisiones marcadas como propuestas en este documento deben implementarse, no se presentan como funciones existentes.

### Código consultado

**[C0] Repositorios y cortes.**  
Landing: https://github.com/HugoHerreraCoach/DLCconexigo/tree/dd0a5dbe7df0dca038e3575614e16b6f66b38884  
CRM: https://github.com/HugoHerreraCoach/conexigo/tree/673fa1f015c42a605efeef445a669df98c48ca26

**[C1] Conversión de navegador.** En la landing, `src/shared/lib/pixeles.ts`, `src/shared/ui/Pixeles.tsx` y `src/shared/lib/whatsapp.ts`.

**[C2] Selección por código.** En la landing, `src/app/api/whatsapp/recibido/route.ts`.

**[C3] Formulario.** En la landing, `src/views/home/components/FormularioContacto.tsx`.

**[C4] Atribución sin código.** En la landing, `src/app/api/whatsapp/mensaje/route.ts`, `src/shared/lib/plantillas.ts` y `src/server/nombre-huella.ts`. En CRM, `supabase/migrations/20261003130000_el_primer_mensaje_de_la_landing_se_pregunta.sql` y el módulo de atribución.

**[C5] Contrato de panel.** En la landing, `src/app/api/conexigo/panel/route.ts` y `src/server/metricas.ts`. En CRM, `apps/api/src/modules/business/marketing/pixel/pixel.landing.ts`, `pixel.service.ts` y `packages/types/src/marketing/pixel.types.ts`.

**[C6] Reportes publicitarios.** En la landing, `src/server/plataformas.ts`.

**[C7] Ingesta de actividad.** En la landing, `src/shared/lib/registro.ts` y `src/app/api/eventos/route.ts`.

**[C8] Esquema de landing.** En la landing, `src/server/db.ts`.

**[C9] Ingreso y referral.** En CRM, `docs/0003-referral-de-anuncio-whatsapp.md`, `docs/sistema/de-que-anuncio-viene-un-lead.md` y `docs/sistema/el-pixel-de-la-landing-en-marketing.md`. Contrastados con los módulos de atribución y las migraciones señaladas.

**[C10] Scripts disponibles.** `DLCconexigo/package.json` en el corte indicado.

### Fuentes técnicas oficiales

**[E1] Meta, SDK oficial: campos de evento, fecha, ID y datos.**  
https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/event.py

**[E2] Meta, SDK oficial: fuentes de acción.**  
https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/action_source.py

**[E3] TikTok: actualización de nombres estándar.**  
https://ads.tiktok.com/help/article/how-to-adopt-tiktoks-updated-standard-events?lang=en

**[E4] TikTok: inicio de Events API.**  
https://ads.tiktok.com/help/article/getting-started-events-api?lang=en

**[E5] TikTok: deduplicación por evento e ID.**  
https://ads.tiktok.com/help/article/event-deduplication?lang=en

**[E6] Supabase: Row Level Security.**  
https://supabase.com/docs/guides/database/postgres/row-level-security

**Instrucción final:** implementa el cambio de semántica y las correcciones como un único trabajo coordinado, pero prueba y entrega cada fase por separado. No cierres la tarea con un contador visual arreglado si el navegador sigue enviando Lead o si el CRM todavía puede duplicar adquisiciones.
