# Usabilidad y accesibilidad

Evaluación del 2026-11-24 sobre la app real (Chromium), con el hogar de ejemplo. Es una **revisión experta y automática, sin usuarios**: no sustituye a probar con personas de más de 40 años ni con quien usa lector de pantalla a diario.

## 1. Cómo se ha hecho

- **axe-core 4.14.1**: reglas WCAG 2.0, 2.1 y 2.2 A/AA y buenas prácticas, en 34 pantallas × 2 tamaños (1280 y 390 px), más bienvenida y asistente con errores. También diálogos, los cuatro perfiles y contraste alto con texto máximo.
- **Teclado**: hasta 90 tabulaciones por pantalla, comprobando foco visible, trampas y elementos tapados.
- **Reflujo**: 320 px (zoom 400 %), tres tamaños de texto y espaciado de WCAG 1.4.12.
- **Sistema**: colores forzados y movimiento reducido.
- **Heurísticas de Nielsen**, con gravedad de 0 (nada) a 4 (catástrofe).
- **Mitos de usabilidad**: lista de UX Myths.

## 2. Accesibilidad

**Resultado: axe da 0 fallos** en todo lo anterior; al empezar había 2 tipos. La revisión manual encontró además lo que axe no ve:

| Problema encontrado | Criterio WCAG | Estado |
|---|---|---|
| Al cerrar un diálogo, el foco volvía al principio de la página | 2.4.3 | Corregido: vuelve a quien lo abrió |
| El foco se perdía al borrar, completar o cambiar de pantalla | 2.4.3 | Corregido: `useFocusGuard` |
| Cambiar de pantalla no se anunciaba | 4.1.3 | Corregido: `RouteAnnouncer` |
| En móvil, el menú inferior tapaba 13 elementos enfocados | 2.4.11 | Corregido: 0 tapados |
| En móvil, al entrar en una habitación el menú podía tapar su título, y al volver se perdía el foco | 2.4.11, 2.4.3 | Corregido: el título queda a la vista y al volver se enfoca la misma habitación |
| En móvil, la vista sencilla se montaba encima del ascensor y las plantas | 1.4.10 | Corregido: el alto fijo es solo del 3D |
| A 320 px con letra muy grande se cortaban «Ajustes» y la vista sencilla | 1.4.10 | Corregido |
| Enlaces y botones de 22 a 27 px de alto | 2.5.8 (24 px) | Corregido: 44 px o más |
| «Deshacer» caducaba a los 10 s | 2.2.1 | Corregido: 20 s, y se para con el ratón o el foco encima |
| En la compra, el nombre accesible no incluía la cantidad visible | 2.5.3 | Corregido |
| Salto de nivel de encabezado en el menú semanal | 1.3.1 | Corregido |
| Con colores forzados no se distinguía lo elegido | 1.4.11 | Corregido: borde y subrayado |

Ya cumplía: idioma, un `h1` por pantalla, zonas, enlace «Saltar al contenido», contraste probado por tests (AA normal, AAA alto), etiquetas en todos los campos, error enlazado al campo con foco en el primero, 3D oculto al lector con botones equivalentes, zoom con botones además del pellizco, y vista sencilla sin 3D.

**Sin probar:** NVDA, JAWS, VoiceOver y TalkBack; Firefox y Safari; móviles físicos; control por voz. Hasta hacerlo **no se puede afirmar conformidad con WCAG 2.2 AA**, solo que no hay fallos conocidos.

## 3. Heurísticas de Nielsen

| Heurística | Valoración | Gravedad pendiente |
|---|---|---|
| 1. Visibilidad del estado | Avisos al guardar, «Paso 1 de 2», pendientes por habitación, pantalla actual marcada | 0 |
| 2. Lenguaje del mundo real | Palabras de casa, sin jerga; fechas como «Ayer» | 0. «Máster» pasó a llamarse «Admin del hogar» |
| 3. Control y libertad | «Atrás» **perdía lo escrito sin avisar** (4): corregido. «Hecho» se deshace | 0. Borrar se deshace al momento y, durante 30 días, desde la papelera de Ajustes |
| 4. Consistencia | Mismos botones, diálogos y verbos en todas las habitaciones | 0 |
| 5. Prevención de errores | Aviso al recargar con cambios: añadido. Confirmaciones que dicen qué pasará | 0 |
| 6. Reconocer antes que recordar | Iconos siempre con texto; edificio y lista de plantas a la vez | 0 |
| 7. Flexibilidad y eficiencia | «Apuntar» desde la portada; perfil simple | 0. Búsqueda global sin tildes en `/buscar` |
| 8. Diseño minimalista | Portada por prioridad | 0. Controles del calendario compactados en móvil; falta verlo en un móvil |
| 9. Recuperarse de errores | Mensajes concretos junto al campo; si falla una pantalla, el menú sigue | 0 |
| 10. Ayuda | Textos de ayuda en los campos y guías por módulo | 0. Ayuda general en `/ayuda` |

Asistente de alta: dos pasos imprescindibles y los demás opcionales. El paso va en la dirección: recargar, «atrás» y salir y volver conservan el paso y lo escrito mientras no se cierre la pestaña. Corregido.

## 4. Los mitos de usabilidad, en web y en móvil

La fuente original (uxmyths.com) rechaza lecturas automáticas. Los títulos 1 a 32 salen de [Speckyboy](https://speckyboy.com/posters-that-debunk-common-ux-misconceptions.md), y 14 de ellos coinciden con los de [Hesburgh Libraries](https://randal-sean-harrison.github.io/handbook/help-ux-myths.html). **El 33 y el 34 no se han podido comprobar**: se citan de memoria como «los usuarios móviles están distraídos» y «simple = minimalista».

✔ Vita no cae en el mito · ◐ en parte · ✘ cae · — no aplica

| # | Mito (es falso que…) | Web | Móvil | En Vita |
|---|---|---|---|---|
| 1 | La gente lee en la web | ✔ | ✔ | Frases cortas y títulos que resumen: «Hay 7 cosas que atender» |
| 2 | Todo debe estar a 3 clics | ✔ | ✔ | Importa que cada paso esté claro: edificio, planta, habitación |
| 3 | La gente no se desplaza | ✔ | ✔ | La portada móvil se desplaza; lo urgente va primero |
| 4 | Diseñar es que quede bonito | ✔ | ✔ | El edificio es la navegación, no un adorno |
| 5 | La accesibilidad es cara y difícil | ✔ | ✔ | Los fallos de esta revisión se corrigieron en una sesión |
| 6 | Los sitios accesibles son feos | ✔ | ✔ | El 3D convive con alternativas completas |
| 7 | Los gráficos hacen más visible un elemento | ✔ | ✔ | Lo importante es texto y botón, no imagen |
| 8 | Las fotos de archivo mejoran la experiencia | ✔ | ✔ | No hay ninguna |
| 9 | El diseño debe ser original | ✔ | ✔ | Original el edificio; convencionales menú, formularios y calendario |
| 10 | Si el diseño es bueno, los detalles no importan | ◐ | ◐ | El foco perdido era un detalle grave |
| 11 | Hay que rediseñar cada cierto tiempo | ✔ | ✔ | Cambios graduales |
| 12 | Más opciones, más satisfacción | ◐ | ◐ | 24 habitaciones; se pueden cerrar las que no se usan |
| 13 | Los iconos mejoran la usabilidad | ✔ | ✔ | Ninguno va sin texto |
| 14 | Eres como tus usuarios | ✘ | ✘ | No se ha probado con nadie de 40+ |
| 15 | Los usuarios eligen lo óptimo | ✔ | ✔ | Opciones a la vista y valores por defecto |
| 16 | La búsqueda arregla la navegación | ✔ | ✔ | Se navega sin buscador; el buscador es un complemento |
| 17 | La portada es lo más importante | ✔ | ✔ | Cada habitación tiene su dirección |
| 18 | Flash es malo | — | — | |
| 19 | No hace falta contenido para diseñar | ✔ | ✔ | Diseñada con un hogar de ejemplo completo |
| 20 | Si le funciona a Amazon, te funcionará | ✔ | ✔ | |
| 21 | La gente sabe decir lo que quiere | ✘ | ✘ | Falta observar el uso |
| 22 | Probar es caro | ✘ | ✘ | Con 5 personas bastaría para empezar |
| 23 | Las opciones, siempre 7±2 | ✔ | ✔ | Se agrupa por sentido: 5 plantas |
| 24 | Usarán el producto como imaginaste | ◐ | ◐ | «Atrás» con un formulario abierto no se había previsto |
| 25 | Si es usable, la estética da igual | ✔ | ✔ | |
| 26 | Test de usabilidad = grupo de discusión | — | — | No se ha hecho ninguno |
| 27 | UX es solo usabilidad | ✔ | ✔ | También confianza, privacidad y tono |
| 28 | El espacio en blanco es espacio perdido | ✔ | ◐ | En móvil, los controles del calendario van apretados |
| 29 | La gente es racional | ✔ | ✔ | Confirmaciones, deshacer y tono tranquilo |
| 30 | Si eres experto, no hace falta probar | ✘ | ✘ | Esta revisión es experta: falta probar |
| 31 | UX es una fase del proyecto | ◐ | ◐ | Hay tests de contraste y axe en la CI |
| 32 | El éxito llega de golpe | — | — | |
| 33 | *Los usuarios móviles están distraídos* | — | ✔ | Misma funcionalidad que en escritorio |
| 34 | *Simple = minimalista* | ✔ | ✔ | Perfil simple: menos opciones, no menos ayuda |

## 5. Prueba con personas (guion listo)

Cinco personas de más de 40 años, una con lector de pantalla o zoom alto; 30 minutos, con hogar de ejemplo y pensando en voz alta. **Con consentimiento y sin datos reales.**

| Tarea | Éxito si… |
|---|---|
| Apuntar una cita médica para el martes | La guarda en menos de 2 min sin ayuda |
| Averiguar qué hay pendiente hoy | Lo dice en menos de 20 s |
| Marcar una pastilla como tomada y deshacerlo | Encuentra «Deshacer» |
| Añadir leche a la compra desde el móvil | Llega sin pedir ayuda |
| Encontrar los datos de emergencia | Menos de 15 s |
| Agrandar la letra | Encuentra Ajustes |

Al acabar, cuestionario SUS; objetivo, 75 o más.

## 6. Pendiente, por orden

1. Probar con NVDA o VoiceOver y con TalkBack, en móvil físico.
2. Prueba con cinco personas.
3. Importar el `.ics` en Google Calendar, Apple y Outlook, e instalar Vita en un móvil.
4. Probar la voz en un dispositivo con voces en español y el menú de compartir en un móvil.
