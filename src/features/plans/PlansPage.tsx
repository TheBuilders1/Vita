import { Check } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackLink } from '@/components/navigation/BackLink'
import { Notice } from '@/components/ui/Notice'
import { useTitle } from '@/hooks/useTitle'

const PLANS = [
  { name: 'Familiar gratuito', summary: 'Para empezar a organizaros.', features: ['Gestión básica', 'Número limitado de integrantes', 'Habitaciones esenciales', 'Todo en vuestro dispositivo'] },
  { name: 'Familiar Plus', summary: 'Para familias con más gente y más planes.', features: ['Más integrantes', 'Más habitaciones', 'Organización avanzada', 'Estadísticas', 'Personalización'] },
  { name: 'Familiar Premium', summary: 'Para gestionarlo todo desde un mismo sitio.', features: ['Gestión familiar completa', 'Más opciones de organización', 'Herramientas avanzadas', 'Funciones adicionales'] },
]

/** Simulación: no hay pagos ni se bloquea ninguna función. */
export function PlansPage() {
  useTitle('Planes')
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6">
      <PageHeader title="Planes previstos" description="Así pensamos ofrecer Vita. Hoy está todo abierto para todas las familias." back={<BackLink to="/ajustes">Volver a ajustes</BackLink>} />
      <Notice tone="success" title="Salud y emergencias, siempre incluidas">Medicación, citas, vacunas, cuidados y emergencias forman parte de todos los planes.</Notice>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => (
          <section key={plan.name} className="bg-crema p-6 shadow-panel">
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="mt-1 text-apagado">{plan.summary}</p>
            <p className="mt-4 text-lg font-bold">Precio por decidir</p>
            <ul className="mt-4 grid grid-cols-1 gap-2">
              {plan.features.map((f) => <li key={f} className="flex items-start gap-2.5"><Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-oliva" />{f}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <Notice>Esta pantalla es una simulación: no se puede contratar ni pagar nada.</Notice>
    </div>
  )
}
