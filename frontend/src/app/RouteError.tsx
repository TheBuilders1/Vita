import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { MessagePage } from './MessagePage'

export function RouteError() {
  const error = useRouteError()
  useEffect(() => { console.error(error) }, [error])
  return (
    <MessagePage title="Algo ha fallado en esta pantalla" action={<a className="underline underline-offset-4" href={import.meta.env.BASE_URL}>Volver al inicio</a>}>
      Tus datos guardados siguen en este dispositivo. Vuelve al inicio e inténtalo de nuevo.
    </MessagePage>
  )
}
