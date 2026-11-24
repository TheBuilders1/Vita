import { Bell, Cake, CalendarDays, FileClock, Luggage, Pill, School, Stethoscope, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { AgendaCategory } from '@/modules/types'

/** Cada categoría se distingue por icono y nombre; el color solo acompaña. */
export const CATEGORIES: Record<AgendaCategory, { label: string; icon: LucideIcon; text: string; bar: string }> = {
  appointment: { label: 'Citas', icon: Stethoscope, text: 'text-cat-appointment', bar: 'border-cat-appointment' },
  medication: { label: 'Medicación', icon: Pill, text: 'text-cat-medication', bar: 'border-cat-medication' },
  event: { label: 'Eventos', icon: CalendarDays, text: 'text-cat-event', bar: 'border-cat-event' },
  school: { label: 'Colegio', icon: School, text: 'text-cat-school', bar: 'border-cat-school' },
  holiday: { label: 'Ocio y vacaciones', icon: Luggage, text: 'text-cat-holiday', bar: 'border-cat-holiday' },
  birthday: { label: 'Cumpleaños', icon: Cake, text: 'text-cat-birthday', bar: 'border-cat-birthday' },
  reminder: { label: 'Recordatorios', icon: Bell, text: 'text-cat-reminder', bar: 'border-cat-reminder' },
  deadline: { label: 'Caducidades y plazos', icon: FileClock, text: 'text-cat-deadline', bar: 'border-cat-deadline' },
  meal: { label: 'Menú', icon: UtensilsCrossed, text: 'text-cat-meal', bar: 'border-cat-meal' },
}
export const CATEGORY_IDS = Object.keys(CATEGORIES) as AgendaCategory[]
