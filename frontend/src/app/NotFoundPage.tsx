import { Link } from 'react-router'
import { MessagePage } from './MessagePage'

export function NotFoundPage() {
  return (
    <MessagePage title="Esta puerta no existe" action={<Link className="underline underline-offset-4" to="/">Volver al inicio</Link>}>
      La dirección que has abierto no lleva a ninguna habitación.
    </MessagePage>
  )
}
