import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

/** Da tiempo a que la pantalla nueva se monte y ponga su título. */
const SETTLE_MS = 300

/** En una SPA el navegador no avisa del cambio de pantalla: aquí se anuncia su título al lector de pantalla. */
export function RouteAnnouncer() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (previous.current === pathname) return
    const timer = setTimeout(() => {
      previous.current = pathname
      setMessage(document.title)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [pathname])

  return <output className="sr-only">{message}</output>
}
