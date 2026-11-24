import * as z from '@/utils/zod'
import { isIsoDate, isTime } from '@/utils/dates'
import { isWebLink, tidyLink } from '@/utils/webLinks'

/**
 * Los campos declarados por cada módulo son la única fuente de verdad:
 * de ellos salen el esquema de validación, el formulario y los tipos.
 */
export interface Option { readonly value: string; readonly label: string }
export interface Ingredient { name: string; quantity?: number | undefined; unit?: string | undefined }

interface FieldBase {
  readonly label: string
  readonly required?: boolean
  readonly help?: string
  /** Lo escribe la app; no aparece en formularios ni listados. */
  readonly hidden?: boolean
}
interface SimpleField extends FieldBase {
  readonly kind:
    | 'date' | 'time' | 'money' | 'boolean' | 'tags' | 'times' | 'weekdays'
    | 'member' | 'members' | 'files' | 'ingredients' | 'phone' | 'url' | 'links'
}
interface TextField extends FieldBase { readonly kind: 'text' | 'textarea'; readonly maxLength?: number }
interface NumberField extends FieldBase { readonly kind: 'number' | 'integer'; readonly min?: number; readonly max?: number; readonly unit?: string }
interface SelectField extends FieldBase { readonly kind: 'select' | 'choices'; readonly options: readonly Option[] }
interface RecordField extends FieldBase { readonly kind: 'record'; readonly refType: string }

export type Field = SimpleField | TextField | NumberField | SelectField | RecordField
export type Fields = Readonly<Record<string, Field>>
export type RecordData = Record<string, unknown>

export interface Rule {
  readonly field: string
  readonly message: string
  readonly valid: (data: RecordData) => boolean
}

interface ValueByKind {
  text: string; textarea: string; date: string; time: string; phone: string; url: string
  money: number; number: number; integer: number; boolean: boolean
  tags: string[]; times: string[]; weekdays: number[]; members: string[]; files: string[]; links: string[]
  ingredients: Ingredient[]; member: string; record: string; select: string; choices: string[]
}
type AlwaysPresent = 'boolean' | 'choices' | 'tags' | 'times' | 'weekdays' | 'members' | 'files' | 'links' | 'ingredients'
type ValueOf<F extends Field> = F extends { kind: 'select'; options: readonly { value: infer V }[] } ? V : ValueByKind[F['kind']]
type IsPresent<F extends Field> = F['kind'] extends AlwaysPresent ? true : F extends { required: true } ? true : false

export type InferData<F extends Fields> = {
  -readonly [K in keyof F as IsPresent<F[K]> extends true ? K : never]: ValueOf<F[K]>
} & {
  -readonly [K in keyof F as IsPresent<F[K]> extends true ? never : K]?: ValueOf<F[K]>
}

export const REQUIRED_MESSAGE = 'Este dato es obligatorio'
const TEXT_MAX = 200
const TEXTAREA_MAX = 5000
export const LINK_MAX = 2000
export const MAX_LINKS = 20

const blankToUndefined = (value: unknown) =>
  value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value

const text = (max: number) =>
  z.string({ error: 'Escribe un texto' }).trim().max(max, `Como máximo ${max} caracteres`)

function number({ min, max }: { min?: number; max?: number }, integer: boolean) {
  let schema = z.number({ error: 'Escribe un número' })
  if (integer) schema = schema.refine(Number.isInteger, 'Escribe un número sin decimales')
  if (min !== undefined) schema = schema.min(min, `El valor mínimo es ${min}`)
  if (max !== undefined) schema = schema.max(max, `El valor máximo es ${max}`)
  return schema
}

const uniqueSorted = <T extends string | number>(values: T[]) =>
  [...new Set(values)].toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))
const uniqueTexts = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))]

const dateSchema = z.string({ error: 'La fecha no es válida' }).refine(isIsoDate, 'La fecha no es válida')
const timeSchema = z.string({ error: 'La hora no es válida' }).refine(isTime, 'La hora no es válida')
const isHttpUrl = (value: string) => /^https?:$/.test(URL.parse(value)?.protocol ?? '')

const linkSchema = z.string().max(LINK_MAX, `Como máximo ${LINK_MAX} caracteres`)
  .refine(isWebLink, { error: ({ input }) => `«${String(input)}» no es un enlace. Debe parecerse a www.ejemplo.es` })

const ingredientSchema = z.strictObject({
  name: text(TEXT_MAX).min(1, REQUIRED_MESSAGE),
  quantity: z.preprocess(blankToUndefined, number({ min: 0 }, false).optional()),
  unit: z.preprocess(blankToUndefined, text(30).optional()),
})

const optionValues = (field: SelectField) => field.options.map((o) => o.value) as [string, ...string[]]

function scalarSchema(field: Field): z.ZodType {
  switch (field.kind) {
    case 'text': return text(field.maxLength ?? TEXT_MAX)
    case 'textarea': return text(field.maxLength ?? TEXTAREA_MAX)
    case 'date': return dateSchema
    case 'time': return timeSchema
    case 'phone': return text(30).regex(/^\+?[\d\s().-]{3,}$/, 'El teléfono no es válido')
    case 'url': return text(2000).refine(isHttpUrl, 'El enlace debe empezar por http:// o https://')
    case 'money': return number({ min: 0 }, true)
    case 'number': return number(field, false)
    case 'integer': return number(field, true)
    case 'select': return z.enum(optionValues(field), { error: 'Elige una de las opciones' })
    case 'member': case 'record': return z.string({ error: 'Elige una de las opciones' })
    default: throw new Error(`El tipo de campo "${field.kind}" no es un valor simple`)
  }
}

function listSchema(field: Field): z.ZodType<unknown[]> | undefined {
  switch (field.kind) {
    case 'tags': case 'members': case 'files': return z.array(z.string()).transform(uniqueTexts)
    case 'choices': return z.array(z.enum(optionValues(field), { error: 'Elige una de las opciones' })).transform((v) => [...new Set(v)])
    case 'links': return z.array(z.string()).transform((links) => uniqueTexts(links.map(tidyLink))).pipe(z.array(linkSchema).max(MAX_LINKS, `Como máximo ${MAX_LINKS} enlaces`))
    case 'times': return z.array(timeSchema).transform(uniqueSorted)
    case 'weekdays': return z.array(number({ min: 1, max: 7 }, true)).transform(uniqueSorted)
    case 'ingredients': return z.array(ingredientSchema)
    default: return undefined
  }
}

function fieldSchema(field: Field): z.ZodType {
  if (field.kind === 'boolean') return z.boolean({ error: 'Elige sí o no' }).default(false)
  const list = listSchema(field)
  if (list) {
    const present = field.required ? list.refine((v) => v.length > 0, 'Añade al menos un elemento') : list
    return z.preprocess((v) => v ?? [], present)
  }
  const scalar = scalarSchema(field)
  if (!field.required) return z.preprocess(blankToUndefined, scalar.optional())
  return z.preprocess(blankToUndefined, z.any().refine((v) => v !== undefined, { error: REQUIRED_MESSAGE, abort: true }).pipe(scalar))
}

const withoutUndefined = (data: RecordData): RecordData =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))

export function buildSchema<const F extends Fields>(fields: F, rules: readonly Rule[] = []): z.ZodType<InferData<F>> {
  const shape = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, fieldSchema(field)]))
  const schema = z
    .strictObject(shape, { error: (issue) => (issue.code === 'unrecognized_keys' ? `Dato desconocido: ${issue.keys.join(', ')}` : undefined) })
    .superRefine((data, ctx) => {
      for (const rule of rules) {
        if (!rule.valid(data)) ctx.addIssue({ code: 'custom', path: [rule.field], message: rule.message })
      }
    })
    .transform(withoutUndefined)
  return schema as unknown as z.ZodType<InferData<F>>
}
