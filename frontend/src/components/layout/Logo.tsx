import { cx } from '@/utils/cx'

/** Marca de Vita: la boca del hogar encendida y, dentro, la V como señal de «hecho». Las letras toman el color del texto. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg role="img" aria-label="Vita" viewBox="0 0 208 66" className={cx('block w-auto', className)}>
      <path className="fill-logo-teja" d="M0 30a28 28 0 0 1 56 0v31a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5z" />
      <path className="fill-logo-sol" d="M9 31a19 19 0 0 1 38 0v35H9z" />
      <path className="stroke-logo-tinta" fill="none" strokeWidth="7.500" strokeLinecap="round" strokeLinejoin="round" d="M19 37l8 12L38 31" />
      <path fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" d="M76 23l14 37 14-37 M124 33v27 M150 18v31q0 11 11 11h3 M141 33h22 M202 33v27 M202 46.500a13.500 13.500 0 1 1-27 0a13.500 13.500 0 1 1 27 0z" />
      <circle className="fill-logo-teja" cx="124" cy="16" r="7" />
    </svg>
  )
}
