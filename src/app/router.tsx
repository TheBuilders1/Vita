import { createBrowserRouter } from 'react-router'
import { AppLayout } from './AppLayout'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <output className="block p-8">Abriendo tu casa…</output>,
    children: [
      { path: '/bienvenida', lazy: async () => ({ Component: (await import('@/features/welcome/WelcomePage')).WelcomePage }) },
      { path: '/crear', lazy: async () => ({ Component: (await import('@/features/onboarding/OnboardingPage')).OnboardingPage }) },
      {
        element: <AppLayout />,
        children: [
          {
            // Una sola pantalla para estas direcciones: el edificio no se vuelve a montar al navegar.
            element: <HomePage />,
            children: ['/', '/edificio', '/planta/:floorId', '/planta/:floorId/:moduleId'].map((path) => ({ path, element: <></> })),
          },
          { path: '/tareas', lazy: async () => ({ Component: (await import('@/features/planner/PlannerPage')).PlannerPage }) },
          { path: '/calendario', lazy: async () => ({ Component: (await import('@/features/calendar/CalendarPage')).CalendarPage }) },
          { path: '/familia', lazy: async () => ({ Component: (await import('@/features/family/FamilyPage')).FamilyPage }) },
          { path: '/familia/nuevo', lazy: async () => ({ Component: (await import('@/features/family/MemberPage')).NewMemberPage }) },
          { path: '/familia/:memberId', lazy: async () => ({ Component: (await import('@/features/family/MemberPage')).MemberPage }) },
          { path: '/ajustes', lazy: async () => ({ Component: (await import('@/features/settings/SettingsPage')).SettingsPage }) },
          { path: '/planes', lazy: async () => ({ Component: (await import('@/features/plans/PlansPage')).PlansPage }) },
        ],
      },
      { path: '/sistema', lazy: async () => ({ Component: (await import('@/features/system/SystemPage')).SystemPage }) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
