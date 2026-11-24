import { useSyncExternalStore } from 'react'
import { todayIso } from '@/utils/dates'

/** El día cambia aunque la app se quede abierta o el portátil despierte al día siguiente. */
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000)
  document.addEventListener('visibilitychange', onChange)
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onChange) }
}

export const useToday = () => useSyncExternalStore(subscribe, () => todayIso())
