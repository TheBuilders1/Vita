import type { FloorId } from './types'

export interface Floor {
  readonly id: FloorId
  readonly level: 1 | 2 | 3 | 4 | 5
  readonly name: string
  readonly place: string
  readonly description: string
}

export const FLOORS: readonly Floor[] = [
  { id: 'food', level: 1, name: 'Alimentación', place: 'Cocina y comedor', description: 'Recetas, menús, necesidades de cada persona y lo que hay en la nevera.' },
  { id: 'education', level: 2, name: 'Educación y desarrollo', place: 'Biblioteca y estudio', description: 'Colegio, becas, crecimiento y reservas de actividades.' },
  { id: 'health', level: 3, name: 'Salud y bienestar', place: 'Espacio de cuidados', description: 'Citas, medicación, vacunas, cuidados y emergencias.' },
  { id: 'finance', level: 4, name: 'Finanzas y administración', place: 'Despacho de casa', description: 'Gastos, ahorro, paga de los hijos y documentos.' },
  { id: 'leisure', level: 5, name: 'Ocio y vida en el hogar', place: 'Salón y zona recreativa', description: 'Planes, compras, tecnología segura y recuerdos.' },
]
