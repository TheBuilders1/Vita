import { cx } from '@/utils/cx'

/** Selector de vistas. En móvil se desliza en horizontal en vez de partir los nombres. */
export function Tabs<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
          className={cx('min-h-12 shrink-0 border-b-4 px-4 font-bold focus-visible:outline-offset-[-3px]', o.value === value ? 'border-marino bg-yeso' : 'border-beige hover:bg-yeso')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
