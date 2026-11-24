import type { Access } from '@/modules/types'
import type { Need, Role } from '@/types/family'

export const ROLE_LABELS: Record<Role, string> = { master: 'Máster familiar', member: 'Miembro familiar', vulnerable: 'Perfil vulnerable' }
export const ROLE_OPTIONS = [
  { value: 'master', label: ROLE_LABELS.master, hint: 'Administra la familia, los permisos y las habitaciones.' },
  { value: 'member', label: ROLE_LABELS.member, hint: 'Consulta, añade y cambia lo suyo.' },
  { value: 'vulnerable', label: ROLE_LABELS.vulnerable, hint: 'Pantalla sencilla, con botones grandes y lo esencial.' },
] as const
export const NEED_LABELS: Record<Need, string> = {
  dependency: 'Necesita ayuda en el día a día', disability: 'Tiene una discapacidad', allergy: 'Tiene alergias', intolerance: 'Tiene intolerancias', newParent: 'Espera o cuida a su primer bebé',
}
export const ACCESS_LABELS: Record<Access, string> = { none: 'No la ve', read: 'Puede consultar', write: 'Puede añadir y cambiar lo suyo' }
export const ageText = (age: number) => (age === 1 ? '1 año' : `${age} años`)
