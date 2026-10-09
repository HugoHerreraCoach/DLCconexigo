# 0001 — Subida del proyecto a GitHub

**Fecha:** 2026-09-23 · **Commit:** `38e47df`

## Qué se hizo

- Se inicializó el repositorio git (rama `main`) y se subió a
  <https://github.com/HugoHerreraCoach/DLCconexigo> (repo **público**).
- Se amplió `.gitignore` para excluir archivos locales y documentos del cliente.

## Qué quedó fuera del repo y por qué

| Ruta | Motivo |
| --- | --- |
| `node_modules/`, `.next/`, `*.tsbuildinfo` | Generados; ya estaban ignorados |
| `respaldo-landing-v1.tgz` | Respaldo local de la v1 (diseño claro) |
| `bash.exe.stackdump` | Volcado de error de la terminal |
| `.claude/settings.local.json` | Configuración local de Claude Code |
| `recursos/Info/` | Ficha del proyecto Finca Algarrobo (docx/pdf) — documento interno del cliente |
| `recursos/Publico Objetivo/` | Documento de público objetivo — interno del cliente |

Como el repo es público, los documentos del cliente se dejaron fuera a
propósito. Para subirlos, quitar esas dos líneas del `.gitignore`.

## Verificación

- Búsqueda de secretos (`api key`, `token`, `secret`, `password`…) en `src/`: sin hallazgos.
- `git push -u origin main` correcto; cuenta con permiso de escritura.
