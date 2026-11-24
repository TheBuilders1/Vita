import { RouterProvider } from 'react-router/dom'
import { Toaster } from '@/components/ui/Toaster'
import { DatabaseProvider } from './providers/DatabaseProvider'
import { PreferencesProvider } from './providers/PreferencesProvider'
import { router } from './router'

export function App() {
  return (
    <DatabaseProvider>
      <PreferencesProvider>
        <RouterProvider router={router} />
        <Toaster />
      </PreferencesProvider>
    </DatabaseProvider>
  )
}
