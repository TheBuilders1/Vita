import {
  CalendarCheck, ChefHat, Coins, FolderArchive, GraduationCap, HandHeart, HeartPulse, Images, MonitorSmartphone,
  Newspaper, PawPrint, PiggyBank, Pill, Refrigerator, School, ShieldCheck, ShoppingBasket, Siren, Smile, Sprout,
  Syringe, TicketCheck, TreePine, Wallet, Wheat, type LucideIcon,
} from 'lucide-react'
import type { ModuleId } from '@/modules/types'

/** El tipo obliga a que todo módulo tenga icono: si falta uno, no compila. */
const ICONS: Record<ModuleId, LucideIcon> = {
  cooking: ChefHat, diet: Wheat, fridge: Refrigerator,
  school: School, grants: GraduationCap, development: Sprout, bookings: TicketCheck,
  healthRecord: HeartPulse, dental: Smile, medication: Pill, care: HandHeart, vaccination: Syringe, emergency: Siren, pets: PawPrint,
  finances: Wallet, savings: PiggyBank, kidsMoney: Coins, documents: FolderArchive,
  outings: TreePine, shopping: ShoppingBasket, technology: MonitorSmartphone, cybersecurity: ShieldCheck, digitalInfo: Newspaper, album: Images,
  planner: CalendarCheck,
}

export function ModuleIcon({ id, className = 'size-6' }: { id: ModuleId; className?: string }) {
  const Icon = ICONS[id]
  return <Icon aria-hidden="true" className={`shrink-0 ${className}`} />
}
