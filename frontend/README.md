# Vita: frontend

Gestión del hogar en un espacio privado, alrededor de un edificio isométrico de cinco plantas.
Solo frontend: los datos se guardan en el navegador (IndexedDB) y no se envían a ningún servidor.

> Los datos **no están cifrados**. Se pierden si se borra el almacenamiento del navegador, y los roles
> simulan permisos dentro de la app: no protegen frente a quien use este dispositivo.

## Desarrollo

Requiere Node ≥ 22.22 y pnpm 12.

```bash
pnpm install
pnpm dev      # servidor de desarrollo
pnpm check    # linter, tipos, tests y build
```

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
