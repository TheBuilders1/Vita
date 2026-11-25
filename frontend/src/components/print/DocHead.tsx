import { Logo } from '@/components/layout/Logo'

/** Cabecera de los documentos impresos: el logo de la web y el nombre del documento. */
export function DocHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="doc-head">
      <Logo />
      <div><strong>{title.toUpperCase()}</strong><span>{subtitle}</span></div>
    </header>
  )
}
