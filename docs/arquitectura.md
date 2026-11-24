# Arquitectura de Vita

## Enfoque
Cada módulo se declara una sola vez en `src/modules/` (campos, reglas, permisos y calendario). De ahí salen
la validación, los formularios, los listados y la agenda. Los módulos clave (nevera, menú, medicación,
emergencias, finanzas, documentos y álbum) tendrán además una vista a medida. Se descartó programar 24 CRUD
independientes (duplicación) y un CRUD solo genérico (parecería un panel de administración).

## Capas
| Carpeta | Responsabilidad | No depende de |
|---|---|---|
| `modules/` | Plantas, módulos, tipos de registro y sus campos | React, Three.js, Dexie |
| `types/` | Familia, integrantes y registros | React, Three.js |
| `services/` | Permisos, integridad, errores (funciones puras) | React, Three.js, Dexie |
| `database/` | Dexie y repositorios; única vía de escritura | React, Three.js |
| `features/`, `components/`, `app/` | Interfaz 2D | Three.js |
| `three/` | Edificio. Recibe módulos y pendientes, emite selecciones | Dexie, formularios |

## Reglas que conviene conocer
- **Fechas** como `AAAA-MM-DD` y horas `HH:mm` locales. **Dinero** en céntimos enteros.
- **Permisos** comprobados en los repositorios, con el actor leído de la base en cada operación.
  - Un miembro modifica solo lo que crea; un responsable puede marcarlo como hecho.
  - `private` solo lo ve su autor, ni siquiera el máster. `restricted`: autor, protagonistas, invitados y másteres.
  - Emergencias es siempre legible y no se puede desactivar. Siempre queda un máster.
  - Con acceso de lectura se puede anotar lo propio (`selfLog`): una toma, un cuidado.
- **Protagonistas** (`subjectIds`) se derivan de los campos `member` y `members`.
- **Borrados**: `planRemoval` calcula lo que se borra y lo que solo pierde una referencia; sirve para avisar y para ejecutar.
- **Archivos**: JPG, PNG, WebP, GIF, PDF y texto, hasta 15 MB. Heredan la visibilidad de su registro y se borran con él.
- **Franjas de edad**: 0-18, 19-39 y 40 o más. El encargo dejaba sin definir 19 y 35-39.

## Dependencias
- React fijado en `~19.3`: R3F 9.8 exige `<19.4`.
- oxlint en vez de ESLint: typescript-eslint 8.74 exige TypeScript `<6.1` y usamos la 7.
- Se respeta la espera mínima de pnpm antes de instalar versiones recién publicadas.

## Sistema visual
Catálogo vivo en `/sistema`. Tokens en `src/styles/tokens.css`; `tests/styles/contrast.test.ts` exige AA en normal y AAA en contraste alto.
- **Pieza firma**: esquina escalonada (`pixel-edge`) solo en lo pulsable y en las placas. Los paneles son planos con zócalo.
- **Tipografía**: Atkinson Hyperlegible para todo.
- **Marca**: dibujada en `components/layout/Logo.tsx` (la boca del hogar encendida con la V de «hecho»); el icono de la app es `public/favicon.svg`.
- Botones de 48 px como mínimo y siempre con texto. Campos obligatorios por defecto; se marca lo opcional.
- Los errores dentro de un diálogo se muestran en el propio diálogo. Los avisos flotantes de error no se cierran solos.
- Rejillas con `grid-cols-1` explícito: sin él, el contenido largo desborda con texto muy grande.

## Edificio (`src/three/`)
- **Cámara** ortográfica fija: 35° de giro y 21° de elevación. La isométrica pura escondería la pared del fondo tras el forjado; `tests/three/framing.test.ts` comprueba la visibilidad. Si cambian `BUILDING` o `VIEW`, esos tests mandan.
- **Geometría** por código con `MeshBuilder`: cada habitación (suelo, pared, tabique y muebles) es una sola malla. Edificio completo: 26 llamadas de dibujo.
- **Texturas** pixel propias pintadas en `materials/tiles.ts` (20 píxeles por metro) y guardadas como capas de una única textura. Un test impide colores estridentes.
- **Render bajo demanda**: en reposo no dibuja. La sombra se calcula una vez.
- **Selección**: la dirección (`/planta/:floorId/:moduleId`) es la fuente de verdad. Pulsar forjado, escalera o ascensor lleva a la planta.
- **Rótulos** en DOM colocados con variables CSS. `Html` de drei daba error al desmontarse con React 19.
- **Alternativa 2D** (`Building2D`) si falta WebGL 2, se pierde el contexto, falla la escena o se elige «Vista sencilla».
- **Añadir una habitación**: ancho en `rooms/layout.ts` y muebles en `rooms/<planta>.ts`. Si falta una, no compila.

## Interfaz
- **`HomeContext`** (`app/providers/home.ts`): familia, integrantes, perfil activo y los registros que ese perfil puede ver, reactivos a Dexie. `null` lleva a la bienvenida.
- **Agenda** (`services/agenda.ts`): se calcula a partir de los registros y los perfiles. No se guarda nada propio del calendario.
- **Atención** (`services/attention.ts`): qué merece aviso y cuándo. Alimenta el resumen, la portada sencilla y los indicadores del edificio (solo atrasado, hoy y mañana).
- **Dar por hecho** (`services/completion.ts`): marca el registro o anota la toma. Nunca una cita o dosis futura. Siempre con «Deshacer», que se retira al cambiar de perfil para no actuar con permisos ajenos.
- **Perfil vulnerable**: portada propia en `/`; el edificio está en `/edificio`.
- **Tras borrar la familia**, `navigationStore.entry` dice a dónde ir; navegar a mano competiría con la redirección automática.
- **Demostración** (`data/demo/`): familia ficticia con fechas relativas a hoy, creada con los repositorios normales. Teléfonos con prefijo no asignado.

## Registros
- **`RecordEditorProvider`** es el único sitio para crear, ver y cambiar registros; se abre con `useRecordEditor()` desde cualquier pantalla.
- **`FieldControl`** tiene un control por tipo de campo: un módulo nuevo obtiene formulario, detalle y lista con solo declararse.
- Los textos de listas (`TagsInput`) se añaden también al salir del campo. El dinero se escribe en euros y se guarda en céntimos (`utils/money.ts`).
- Botones que cambian de función en el mismo sitio llevan **clave distinta**: React recicla el nodo y un clic en «Seguir editando» llegó a enviar el formulario.
- **Vistas propias** en `features/modules/views.tsx`; el resto usa `ModuleRecords`.
- **Recetas** (`services/recipes.ts`): comparación por raíces de palabra. Nunca afirma que un plato sea seguro.
- **Consejos** (`services/tips.ts`): reglas locales. Su identificador incluye el periodo para que un consejo descartado pueda volver.

## Copias de seguridad
`services/backup.ts` valida la copia entera antes de tocar nada y **recalcula** módulo y protagonistas, para que un archivo manipulado no cambie permisos. No va cifrada e incluye lo privado.

## Fondo
`components/backdrop/`: paisaje pixel art dibujado a baja resolución. Versión completa donde está el edificio y suave donde hay texto; un test comprueba el contraste. Se oculta con contraste alto.
