export function Progress({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap justify-between gap-x-4">
        <span className="font-bold">{label}</span>
        <span className="tabular-nums">{detail ?? `${percent} %`}</span>
      </div>
      <progress className="sr-only" aria-label={label} value={percent} max={100} aria-valuetext={detail} />
      <div aria-hidden="true" className="h-5 border-2 border-borde bg-crema p-0.5">
        <div className="h-full bg-oliva" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
