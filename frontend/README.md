# Vita: frontend

Gestión del hogar en un espacio privado, alrededor de un edificio isométrico de cinco plantas.
Los datos se guardan en el navegador (IndexedDB). Con el backend de demostración local, las preguntas abiertas del chat van a Ollama Cloud junto con un máximo de 20 datos breves, filtrados localmente según permisos, cuando la pregunta requiere consultar el hogar. Los adjuntos se leen localmente y solo se envía el texto extraído, salvo que marques el permiso de análisis visual para una imagen; en ese caso, la imagen se envía a Ollama Cloud y no se guarda en Vita ni en las transcripciones de OpenClaw. El dictado remoto puede enviar la voz al proveedor del navegador.

> Los datos **no están cifrados** en el navegador (la copia de seguridad sí puede llevar contraseña). Se pierden si se borra el almacenamiento del navegador, y los roles
> simulan permisos dentro de la app: no protegen frente a quien use este dispositivo.

## Desarrollo

Requiere Node ≥ 22.22 y pnpm 12.

```bash
pnpm install
pnpm dev      # servidor de desarrollo
pnpm check    # linter, tipos, tests y build
pnpm e2e      # navegador y accesibilidad sobre la versión compilada (antes, pnpm build)
```

## Leer fotos con el servidor del hogar (opcional)

Solo con `pnpm dev`. Arranca el backend, copia `.env.example` a `.env.local`, pon el token y el hogar, y reinicia. Después se activa en Ajustes.
El token se queda en el proxy de Vite, que solo permite las llamadas necesarias y solo desde este equipo. Sin `.env.local`, no hay conexión con el backend ni con el modelo. Puedes pegar imágenes o adjuntar JPG/PNG/WebP, PDF, TXT y DOCX (hasta 3 archivos de 10 MiB). El análisis visual de cada imagen es opcional y requiere marcar su casilla. GitHub Pages es estático y no ofrece el chat con IA.

## Estado

| Fase | Estado |
|---|---|
| 1. Arquitectura y modelo de datos | Hecha |
| 2. Sistema visual | Hecha |
| 3. Edificio isométrico | Hecha |
| 4. Interfaz | Hecha |
| 5. Funcionalidad completa y demostración | Hecha |
| 6. Refinamiento | Pendiente |

Detalles en [docs/arquitectura.md](docs/arquitectura.md). Usabilidad y accesibilidad, en [docs/usabilidad.md](docs/usabilidad.md).
