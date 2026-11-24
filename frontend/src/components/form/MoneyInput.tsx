import { useState, type Ref } from 'react'
import { TextInput } from '@/components/ui/Field'
import { parseMoney, toMoneyInput } from '@/utils/money'

interface MoneyProps { label: string; help?: string | undefined; error?: string | undefined; required?: boolean; value: number | undefined; onChange: (cents: number | undefined) => void; inputRef?: Ref<HTMLInputElement> }

/** Se escribe en euros y se guarda en céntimos. Lo que no se entiende pasa como NaN y lo rechaza la validación. */
export function MoneyInput({ value, onChange, inputRef, label, ...info }: MoneyProps) {
  const [text, setText] = useState(value === undefined || Number.isNaN(value) ? '' : toMoneyInput(value))
  const change = (next: string) => {
    setText(next)
    onChange(next.trim() === '' ? undefined : (parseMoney(next) ?? Number.NaN))
  }
  return <TextInput {...info} ref={inputRef} label={`${label} (€)`} inputMode="decimal" autoComplete="off" value={text} onChange={(e) => change(e.target.value)} />
}
