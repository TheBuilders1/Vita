import { RESTRICTED, defineModule, defineRecordType, notBefore, options } from './define'

export const EXPENSE_CATEGORIES = options({
  home: 'Vivienda', food: 'Alimentación', health: 'Salud', education: 'Educación', transport: 'Transporte',
  leisure: 'Ocio', clothing: 'Ropa', pets: 'Mascotas', insurance: 'Seguros', salary: 'Nómina', pension: 'Pensión', other: 'Otros',
})

const positive = (field: string) => ({
  field, message: 'La cantidad debe ser mayor que cero', valid: (d: Record<string, unknown>) => Number(d[field]) > 0,
})

const finances = defineModule({
  id: 'finances', floor: 'finance', name: 'Finanzas', disclaimer: 'finance',
  description: 'Ingresos, gastos y presupuesto del hogar.',
  access: { member: 'read', vulnerable: 'none' },
  recordTypes: [
    defineRecordType({
      id: 'transaction', name: 'Movimiento', plural: 'Movimientos', titleField: 'concept',
      fields: {
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ expense: 'Gasto', income: 'Ingreso' }) },
        concept: { kind: 'text', label: 'Concepto', required: true },
        amount: { kind: 'money', label: 'Importe', required: true },
        category: { kind: 'select', label: 'Categoría', required: true, options: EXPENSE_CATEGORIES },
        date: { kind: 'date', label: 'Fecha', required: true },
        repeat: { kind: 'select', label: 'Se repite', options: options({ none: 'No', weekly: 'Cada semana', monthly: 'Cada mes', yearly: 'Cada año' }) },
        until: { kind: 'date', label: 'Hasta' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [positive('amount'), notBefore('date', 'until', 'La repetición no puede acabar antes de empezar')],
    }),
    defineRecordType({
      id: 'budget', name: 'Presupuesto', plural: 'Presupuestos', titleField: 'category',
      fields: {
        category: { kind: 'select', label: 'Categoría', required: true, options: EXPENSE_CATEGORIES },
        limit: { kind: 'money', label: 'Límite mensual', required: true },
      },
      rules: [positive('limit')],
    }),
  ],
})

const savings = defineModule({
  id: 'savings', floor: 'finance', name: 'Ahorro', disclaimer: 'finance',
  description: 'Objetivos comunes y lo que lleváis reunido.',
  access: { member: 'read', vulnerable: 'none' },
  recordTypes: [
    defineRecordType({
      id: 'savingsGoal', name: 'Objetivo', plural: 'Objetivos', titleField: 'name',
      fields: {
        name: { kind: 'text', label: 'Objetivo', required: true },
        target: { kind: 'money', label: 'Cantidad que queremos reunir', required: true },
        deadline: { kind: 'date', label: 'Para cuándo' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [positive('target')],
      agenda: [{ dateField: 'deadline', category: 'deadline', label: 'Meta de ahorro' }],
    }),
    defineRecordType({
      id: 'savingsContribution', name: 'Aportación', plural: 'Aportaciones', titleField: 'amount',
      fields: {
        goal: { kind: 'record', label: 'Objetivo', refType: 'savingsGoal', required: true },
        amount: { kind: 'money', label: 'Cantidad', required: true },
        date: { kind: 'date', label: 'Fecha', required: true },
        contributor: { kind: 'member', label: 'Quién aporta' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [positive('amount')],
    }),
  ],
})

const kidsMoney = defineModule({
  id: 'kidsMoney', floor: 'finance', name: 'Economía de los hijos', disclaimer: 'finance',
  description: 'Paga, gastos y objetivos de cada hijo o hija.',
  access: { member: 'read', vulnerable: 'none' },
  recordTypes: [
    defineRecordType({
      id: 'allowance', name: 'Paga', plural: 'Pagas', titleField: 'member', visibility: RESTRICTED,
      fields: {
        member: { kind: 'member', label: 'Hijo o hija', required: true },
        amount: { kind: 'money', label: 'Cantidad', required: true },
        repeat: { kind: 'select', label: 'Frecuencia', required: true, options: options({ weekly: 'Semanal', monthly: 'Mensual' }) },
        startDate: { kind: 'date', label: 'Desde', required: true },
        endDate: { kind: 'date', label: 'Hasta' },
      },
      rules: [positive('amount'), notBefore('startDate', 'endDate', 'La paga no puede acabar antes de empezar')],
      agenda: [{ dateField: 'startDate', repeatField: 'repeat', untilField: 'endDate', category: 'reminder' }],
    }),
    defineRecordType({
      id: 'kidMovement', name: 'Movimiento', plural: 'Movimientos', titleField: 'concept', visibility: RESTRICTED, selfLog: true,
      fields: {
        member: { kind: 'member', label: 'Hijo o hija', required: true },
        concept: { kind: 'text', label: 'Concepto', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ income: 'Recibe', expense: 'Gasta', saving: 'Ahorra' }) },
        amount: { kind: 'money', label: 'Cantidad', required: true },
        date: { kind: 'date', label: 'Fecha', required: true },
        goal: { kind: 'record', label: 'Objetivo', refType: 'kidGoal' },
      },
      rules: [positive('amount')],
    }),
    defineRecordType({
      id: 'kidGoal', name: 'Objetivo personal', plural: 'Objetivos personales', titleField: 'name', visibility: RESTRICTED, selfLog: true,
      fields: {
        member: { kind: 'member', label: 'Hijo o hija', required: true },
        name: { kind: 'text', label: 'Objetivo', required: true },
        target: { kind: 'money', label: 'Cantidad', required: true },
      },
      rules: [positive('target')],
    }),
  ],
})

const documents = defineModule({
  id: 'documents', floor: 'finance', name: 'Documentación',
  description: 'DNI, pasaportes, seguros, contratos y sus caducidades.',
  recordTypes: [
    defineRecordType({
      id: 'document', name: 'Documento', plural: 'Documentos', titleField: 'title', visibility: RESTRICTED,
      fields: {
        title: { kind: 'text', label: 'Nombre del documento', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ id: 'DNI', passport: 'Pasaporte', healthCard: 'Tarjeta sanitaria', school: 'Documento escolar', insurance: 'Seguro', contract: 'Contrato', admin: 'Documentación administrativa', other: 'Otro' }) },
        member: { kind: 'member', label: 'De quién es' },
        issueDate: { kind: 'date', label: 'Fecha de expedición' },
        expiryDate: { kind: 'date', label: 'Fecha de caducidad' },
        // De dónde salió la caducidad: solo vale mientras coincida con la fecha guardada.
        scannedDate: { kind: 'date', label: 'Fecha leída de una foto', hidden: true },
        scannedFile: { kind: 'text', label: 'Foto leída', hidden: true },
        location: { kind: 'text', label: 'Dónde está el original' },
        files: { kind: 'files', label: 'Archivos' },
        links: { kind: 'links', label: 'Enlaces' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [notBefore('issueDate', 'expiryDate', 'La caducidad no puede ser anterior a la expedición')],
      agenda: [{ dateField: 'expiryDate', category: 'deadline', label: 'Caduca' }],
    }),
  ],
})

export const FINANCE_MODULES = [finances, savings, kidsMoney, documents]
