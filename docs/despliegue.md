# Despliegue y endurecimiento

La web se publica en GitHub Pages desde `development` con [`deploy.yml`](../.github/workflows/deploy.yml). El backend y OpenClaw **no se publican**.

Requisitos, una sola vez: *Settings → Pages → Source → GitHub Actions* y permitir `development` en el entorno `github-pages`.

## Controles

Todos tienen que pasar; cualquiera puede parar la publicación.

| Control | Qué comprueba |
| --- | --- |
| Guardián | Archivos prohibidos, estructura, secretos, permisos de los workflows y que ningún control quede sin efecto |
| Agentes | Herramientas exactas de cada agente, Gateway en loopback, plugin cerrado, contenedor sin root |
| Calidad | Linter, tipos y pruebas unitarias del frontend |
| Flujos | actionlint y zizmor |
| Secretos | gitleaks en todo el historial |
| Dependencias | `pnpm audit` y, en los PR, revisión de lo nuevo |
| CodeQL | JavaScript/TypeScript, Python y workflows, sin alertas abiertas altas o críticas |
| Compilación | La web, con la dirección en la que se publica |
| Lighthouse | Rendimiento ≥ 60, accesibilidad ≥ 95, buenas prácticas y SEO ≥ 90 |
| E2E | Playwright y axe en móvil y escritorio, en la misma carpeta que en producción |
| Backend | pytest con PostgreSQL, pip-audit e imagen Docker sin root |

Después se firma la procedencia de cada archivo, se publica y se compara lo publicado con lo revisado. Para comprobar una firma:

```bash
gh attestation verify index.html --repo TheBuilders1/Vita
```

Otros workflows: `monitor` (cada 6 horas), `links` (semanal), `release` (versiones) y `scorecard`. GitHub solo ejecuta lo programado y lo manual cuando el archivo está en la rama por defecto, `main`.

## Dirección de la web

Sale del propietario y del nombre del repositorio: `https://<propietario>.github.io/<repositorio>/`. Al transferir el repositorio cambia sola en el siguiente despliegue; hay que actualizar los enlaces del README y la web del repositorio.

Con dominio propio: configurarlo en *Settings → Pages* y crear la variable del repositorio `SITE_URL` (*Settings → Secrets and variables → Actions → Variables*) con `https://…/`. La carpeta de publicación se deduce de ella.

> Las webs de un mismo `<propietario>.github.io` comparten almacenamiento: otro proyecto publicado por la organización podría leer los datos de Vita. Conviene una organización dedicada o un dominio propio.

> Los datos del navegador pertenecen a una dirección. Si cambia, quien ya usara Vita debe guardar antes una copia en Ajustes y restaurarla en la nueva.

## Modo mantenimiento

Crear la variable `MAINTENANCE_MODE=true` y volver a ejecutar **todos** los jobs del último despliegue de `development` (*Re-run all jobs*). Se publica [`maintenance.html`](../.github/pages/maintenance.html) sin compilar nada. Quien ya tenga Vita abierta o instalada sigue usando la versión guardada en su dispositivo. Para salir, borrar la variable y volver a ejecutar.

## Endurecimiento de la parte de IA

Principios tomados del anuncio y del índice de [*Hardening IA*](https://www.elladodelmal.com/2026/11/hardening-ia-como-desplegar-modelos-e.html) (Juan Luis Cuenca, 0xWord). El artículo no da configuraciones: lo que sigue es la adaptación a Vita.

| Principio | En Vita |
| --- | --- |
| El modelo es tráfico no confiable | La API valida cada resultado con esquemas cerrados y lo compara con el OCR local |
| Mínimo privilegio | Dos agentes con herramientas contadas; `tools/agents.mjs` rechaza cualquier añadido. Cada job pide solo sus permisos |
| Cerrar ante la duda (*fail-closed*) | Un formato que los guardianes no entienden es un fallo. La política del navegador empieza en `default-src 'none'` |
| Defensa en profundidad | Política de contenido, guardianes, análisis estático y comprobación de lo publicado son independientes |
| Veto independiente | Los once controles son obligatorios para publicar |
| Persona al mando | Ninguna fecha se convierte en recordatorio sin confirmación |
| Degradación controlada | Si un control falla antes de publicar, sigue la versión anterior (si falla la comprobación posterior, hay que revertir a mano); la web funciona sin conexión y sin backend |
| Control de acceso determinista (*CDR*) | Las imágenes se decodifican y limitan antes de leerlas; el modelo nunca las recibe |
| Canarios (*Sentinel*) | `tools/*.test.mjs` provoca cada avería y comprueba que se detecta; las pruebas de navegador intentan sacar datos |
| Quién vigila al vigilante (*PRAETOR*) | El guardián falla si un control deja de ser obligatorio u oculta errores; Scorecard puntúa el repositorio |
| *Zero Trust* | Acciones fijadas por SHA, procedencia firmada y comparación byte a byte |

No cubre: un modelo real atacado en producción (no hay ninguno publicado), la retención de sesiones de OpenClaw ni el equipo en el que corre el Gateway. Mantén OpenClaw al día: [CVE-2026-25253](https://nvd.nist.gov/vuln/detail/CVE-2026-25253) permitía robar el token del Gateway **aunque escuchara solo en loopback**; Vita exige `2026.11.8`, posterior al arreglo.

## Probarlo en local

```bash
node tools/guard.mjs
node tools/agents.mjs
node --test "tools/*.test.mjs"
export SITE_URL=https://thebuilders1.github.io/Vita/
cd frontend && pnpm build && pnpm e2e
```

`VITA_CHROMIUM=/usr/bin/chromium` usa un navegador ya instalado.
