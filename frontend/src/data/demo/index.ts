import type { VitaDb } from '@/database/db'
import type { Repositories } from '@/database/repositories'
import type { RecordData } from '@/modules/fields'
import { MODULES } from '@/modules/registry'
import type { MemberInput } from '@/types/family'
import { addDays, addMonths } from '@/utils/dates'
import { educationDemo } from './education'
import { financeDemo } from './finance'
import { foodDemo } from './food'
import { healthDemo } from './health'
import { leisureDemo } from './leisure'

export interface DemoContext {
  readonly today: string
  readonly marta: string
  readonly andres: string
  readonly leo: string
  readonly pilar: string
  readonly day: (offset: number) => string
  readonly add: (ownerId: string, typeId: string, data: RecordData) => Promise<string>
}

/** Las edades se calculan desde hoy para que la familia siempre tenga 44, 46, 9 y 78 años. */
function demoMembers(today: string): MemberInput[] {
  const born = (years: number, offset: number) => addMonths(addDays(today, offset), -12 * years)
  return [
    { name: 'Marta', relationship: 'Madre', role: 'master', birthDate: born(44, -70), needs: [], phone: '555 010 010' },
    { name: 'Andrés', relationship: 'Padre', role: 'member', birthDate: born(46, -160), needs: [], phone: '555 010 011' },
    { name: 'Leo', relationship: 'Hijo', role: 'member', birthDate: born(10, 10), needs: ['allergy'], notes: 'Alérgico a los frutos de cáscara: nada con nueces, almendras ni avellanas.' },
    { name: 'Pilar', relationship: 'Abuela', role: 'vulnerable', birthDate: born(78, -240), needs: ['dependency'], phone: '555 010 012', notes: 'Celíaca: nada con gluten. Oye mejor por el lado izquierdo.' },
  ]
}

/** Familia ficticia. Se crea con los repositorios normales: si algo no fuera válido, no se guardaría nada. */
export async function loadDemo(db: VitaDb, { family, records }: Repositories, today: string): Promise<void> {
  await db.transaction('rw', [db.families, db.members, db.records, db.files], async () => {
    const { members } = await family.setup({
      family: { name: 'Los Robles', enabledModules: MODULES.map((m) => m.id) },
      members: demoMembers(today),
      isDemo: true,
    })
    const [marta, andres, leo, pilar] = members.map((m) => m.id) as [string, string, string, string]
    const context: DemoContext = {
      today, marta, andres, leo, pilar,
      day: (offset) => addDays(today, offset),
      add: async (ownerId, typeId, data) => (await records.create(ownerId, { typeId, data })).id,
    }
    for (const fill of [plannerDemo, foodDemo, educationDemo, healthDemo, financeDemo, leisureDemo]) await fill(context)
  })
}

async function plannerDemo({ add, day, marta, andres, leo, pilar }: DemoContext) {
  await add(marta, 'task', { title: 'Pedir cita para renovar el DNI', members: [marta], dueDate: day(2), priority: 'high' })
  await add(marta, 'task', { title: 'Llamar al fontanero', members: [andres], dueDate: day(-1), priority: 'normal' })
  await add(andres, 'task', { title: 'Preparar la mochila de la excursión', members: [leo], dueDate: day(4) })
  await add(marta, 'task', { title: 'Ordenar las fotos del verano', members: [] })
  await add(marta, 'task', { title: 'Comprar pilas para el mando', members: [andres], done: true })
  await add(marta, 'event', { title: 'Comida en casa de los abuelos', date: day(5), time: '14:00', members: [marta, andres, leo, pilar], place: 'Casa' })
  await add(andres, 'event', { title: 'Reunión de la comunidad', date: day(9), time: '19:30', members: [andres], place: 'Portal' })
}
