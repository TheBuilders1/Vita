import type { FloorId, ModuleId } from '@/modules/types'

export type SceneId = 'cover' | 'kitchen' | 'school' | 'medication' | 'vita' | 'documents' | 'finance' | 'emergency' | 'night' | 'privacy' | 'inside' | 'close'

export interface Chapter {
  readonly id: SceneId
  /** Hora del día en la historia; los capítulos sin hora cuentan cómo está hecho. */
  readonly time?: string
  readonly title: string
  readonly text: string
  /** Para público técnico, plegado. */
  readonly inside?: string
  readonly floorId: FloorId | null
  readonly moduleId: ModuleId | null
  /** Tono del cielo detrás del edificio. */
  readonly sky: 'dawn' | 'day' | 'dusk' | 'night'
}

export const CHAPTERS: readonly Chapter[] = [
  { id: 'cover', title: 'Un día con Los Robles', text: 'Marta, Andrés, Leo, de 9 años, y la abuela Pilar. Cuatro personas, un perro y muchas cosas que recordar. Baja para ver cómo les ayuda Vita a lo largo de un día.', floorId: null, moduleId: null, sky: 'dawn' },
  { id: 'kitchen', time: '07:30', title: 'El desayuno no da sustos', text: 'Leo es alérgico a los frutos de cáscara. Al buscar qué cocinar con lo que hay en casa, Vita marca las recetas que no le convienen.', inside: 'Las recetas se ordenan en el dispositivo cruzando sus ingredientes con lo que hay en la nevera y con las alergias apuntadas de cada persona.', floorId: 'food', moduleId: 'cooking', sky: 'dawn' },
  { id: 'school', time: '08:15', title: 'La mochila de la excursión', text: 'Lo del colegio no se queda en un papel arrugado: la excursión y lo que hay que preparar aparecen en la agenda de quien tiene que hacerlo.', inside: 'El calendario no guarda copias: se calcula a partir de las fechas de cada habitación.', floorId: 'education', moduleId: 'school', sky: 'day' },
  { id: 'medication', time: '09:00', title: 'La pastilla de Pilar', text: 'Pilar usa la vista sencilla: botones grandes y solo lo suyo. Pulsa «Tomada» y el aviso se apaga para toda la familia.', inside: 'Cada toma se apunta aparte, con su hora: así se sabe qué se tomó y qué no, sin tocar la pauta.', floorId: 'health', moduleId: 'medication', sky: 'day' },
  { id: 'vita', time: '11:30', title: 'Se lo pide a Vita', text: 'Marta escribe como hablaría. Vita entiende la fecha, propone la cita y espera: nada se guarda hasta que ella lo confirma.', inside: 'Esta respuesta la calcula el motor real de Vita en este navegador, con reglas. No sale ningún dato del dispositivo.', floorId: 'health', moduleId: 'dental', sky: 'day' },
  { id: 'documents', time: '13:00', title: 'El DNI que caduca', text: 'Una foto del documento basta para proponer la fecha de caducidad. La persona la comprueba antes de guardarla.', inside: 'Con el servidor del hogar activado, un orquestador pasa la foto al agente de documentos (OpenClaw). Sin servidor, la fecha se escribe a mano.', floorId: 'finance', moduleId: 'documents', sky: 'day' },
  { id: 'finance', time: '17:00', title: 'La compra del mes', text: 'Vita lleva la cuenta de lo gastado frente a lo previsto y avisa con tiempo, sin sermones.', inside: 'Todo en céntimos enteros y calculado en el dispositivo. Los gastos que se repiten cuentan cada mes sin volver a apuntarlos.', floorId: 'finance', moduleId: 'finances', sky: 'dusk' },
  { id: 'emergency', time: '19:30', title: 'Si pasa algo', text: 'Se va la conexión y la ficha de emergencia sigue ahí: a quién llamar, alergias y medicación de cada persona.', inside: 'Vita funciona sin conexión: todo vive en el navegador y la app se guarda para abrirse sin red.', floorId: 'health', moduleId: 'emergency', sky: 'dusk' },
  { id: 'night', time: '22:00', title: 'Mañana, ya preparado', text: 'Lo hecho hoy queda apagado. Lo de mañana, ordenado y a la vista.', floorId: null, moduleId: null, sky: 'night' },
  { id: 'privacy', title: 'Lo vuestro se queda en casa', text: 'Vita guarda los datos en el navegador. No hay cuentas ni publicidad. Lo que sale, como la foto de un documento, sale solo si lo pides y te lo decimos antes.', inside: 'Política de contenido estricta, sin scripts de terceros. Los datos no van cifrados en el navegador: lo decimos claramente.', floorId: null, moduleId: null, sky: 'night' },
  { id: 'inside', title: 'Cómo está hecho', text: 'Una web que se instala en el móvil, un edificio en 3D que también existe en versión sencilla, y un backend opcional con agentes para lo que no se puede hacer en el dispositivo.', inside: 'React, TypeScript, Dexie, Three.js; FastAPI, PostgreSQL y OpenClaw. Más de 1.400 pruebas automáticas, accesibilidad revisada con axe y once controles en cada publicación.', floorId: null, moduleId: null, sky: 'night' },
  { id: 'close', title: 'Pruébalo tú', text: 'Entra en el hogar de ejemplo o crea el tuyo. Se tarda un minuto.', floorId: null, moduleId: null, sky: 'dawn' },
]
