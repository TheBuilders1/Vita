import { describe, expect, test } from 'vitest'
import { FLOORS } from '@/modules/floors'
import { MODULES, getModule, getRecordType, modulesOnFloor, RECORD_TYPES } from '@/modules/registry'

const duplicates = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i)

describe('plantas y módulos', () => {
  test('hay cinco plantas en el orden del edificio', () => {
    expect(FLOORS.map((f) => [f.level, f.id])).toEqual([
      [1, 'food'], [2, 'education'], [3, 'health'], [4, 'finance'], [5, 'leisure'],
    ])
  })

  test('cada planta contiene exactamente los módulos del encargo', () => {
    const byFloor = Object.fromEntries(FLOORS.map((f) => [f.id, modulesOnFloor(f.id).map((m) => m.id)]))
    expect(byFloor).toEqual({
      food: ['cooking', 'diet', 'fridge'],
      education: ['school', 'grants', 'development', 'bookings'],
      health: ['healthRecord', 'dental', 'medication', 'care', 'vaccination', 'emergency', 'pets'],
      finance: ['finances', 'savings', 'kidsMoney', 'documents'],
      leisure: ['outings', 'shopping', 'technology', 'cybersecurity', 'digitalInfo', 'album'],
    })
  })

  test('tareas y eventos son transversales y no pertenecen a ninguna planta', () => {
    expect(MODULES.filter((m) => m.floor === null).map((m) => m.id)).toEqual(['planner'])
  })

  test('los identificadores no se repiten', () => {
    expect(duplicates(MODULES.map((m) => m.id))).toEqual([])
    expect(duplicates(RECORD_TYPES.map((t) => t.id))).toEqual([])
  })

  test('pedir un módulo o tipo desconocido falla con un mensaje claro', () => {
    expect(() => getModule('nope' as never)).toThrow('No existe el módulo "nope"')
    expect(() => getRecordType('nope')).toThrow('No existe el tipo de registro "nope"')
  })
})

describe('compromisos de producto', () => {
  test('salud básica, medicación, cuidados, vacunas y emergencias son esenciales', () => {
    const essential = MODULES.filter((m) => m.essential).map((m) => m.id)
    expect(essential).toEqual(expect.arrayContaining(['healthRecord', 'medication', 'care', 'vaccination', 'emergency']))
  })

  test('todo módulo sanitario o económico declara su aviso orientativo', () => {
    for (const m of modulesOnFloor('health')) expect(m.disclaimer, m.id).toBe('health')
    for (const id of ['finances', 'savings', 'kidsMoney'] as const) expect(getModule(id).disclaimer, id).toBe('finance')
    expect(getModule('diet').disclaimer).toBe('health')
  })

  test('nadie puede quedarse sin leer las emergencias', () => {
    expect(getModule('emergency').minimumAccess).toBe('read')
    expect(getRecordType('emergencyCard').visibility).toEqual({ default: 'family', locked: true })
    expect(getRecordType('emergencyContact').visibility).toEqual({ default: 'family', locked: true })
  })

  test('los datos médicos y los documentos nacen restringidos', () => {
    for (const id of ['condition', 'appointment', 'medicationPlan', 'medicationIntake', 'vaccine', 'careNeed', 'document']) {
      expect(getRecordType(id).visibility.default, id).toBe('restricted')
    }
  })

  test('ningún campo invita a guardar contraseñas', () => {
    const suspicious = RECORD_TYPES.flatMap((t) => Object.entries(t.fields).map(([name, f]) => `${t.id}.${name} ${f.label}`))
      .filter((s) => /password|contraseña|\bpin\b|cvv/i.test(s))
    expect(suspicious).toEqual([])
  })
})

describe.each(RECORD_TYPES.map((t) => [t.id, t] as const))('tipo %s', (_id, type) => {
  test('pertenece a un módulo existente', () => {
    expect(getModule(type.moduleId).recordTypes).toContain(type)
  })

  test('su título es un campo obligatorio', () => {
    expect(type.fields[type.titleField]).toMatchObject({ required: true })
  })

  test('su campo de completado es un booleano', () => {
    if (type.doneField) expect(type.fields[type.doneField]?.kind).toBe('boolean')
  })

  test('sus referencias apuntan a tipos existentes', () => {
    for (const field of Object.values(type.fields)) {
      if (field.kind === 'record') expect(() => getRecordType(field.refType)).not.toThrow()
    }
  })

  test('su agenda usa campos del tipo correcto', () => {
    for (const entry of type.agenda ?? []) {
      expect(type.fields[entry.dateField]?.kind).toBe('date')
      if (entry.endField) expect(type.fields[entry.endField]?.kind).toBe('date')
      if (entry.untilField) expect(type.fields[entry.untilField]?.kind).toBe('date')
      if (entry.timeField) expect(type.fields[entry.timeField]?.kind).toBe('time')
      if (entry.timesField) expect(type.fields[entry.timesField]?.kind).toBe('times')
      if (entry.weekdaysField) expect(type.fields[entry.weekdaysField]?.kind).toBe('weekdays')
      if (entry.detailField) expect(type.fields).toHaveProperty(entry.detailField)
      if (entry.log) {
        expect(getRecordType(entry.log.typeId).fields[entry.log.refField]).toMatchObject({ kind: 'record', refType: type.id, required: true })
        expect(getRecordType(entry.log.typeId).fields).toMatchObject({ date: { kind: 'date' }, time: { kind: 'time' } })
      }
      if (entry.repeatField) expect(type.fields[entry.repeatField]?.kind).toBe('select')
    }
  })

  test('los selects tienen opciones sin repetir', () => {
    for (const field of Object.values(type.fields)) {
      if (field.kind !== 'select') continue
      expect(field.options.length).toBeGreaterThan(1)
      expect(duplicates(field.options.map((o) => o.value))).toEqual([])
    }
  })

  test('los autorregistros identifican a su protagonista', () => {
    if (type.selfLog) expect(type.fields.member).toMatchObject({ kind: 'member', required: true })
  })
})

describe('reglas de negocio de los formularios', () => {
  test('un tratamiento no puede acabar antes de empezar', () => {
    const base = { member: 'm1', name: 'Enalapril', dose: '10 mg', times: ['09:00'], startDate: '2026-11-10' }
    expect(getRecordType('medicationPlan').schema.safeParse({ ...base, endDate: '2026-11-09' }).success).toBe(false)
    expect(getRecordType('medicationPlan').schema.safeParse({ ...base, endDate: '2026-11-10' }).success).toBe(true)
  })

  test('una clase no puede acabar antes de empezar', () => {
    const base = { member: 'm1', subject: 'Lengua', weekdays: [1] }
    expect(getRecordType('schoolClass').schema.safeParse({ ...base, start: '10:00', end: '10:00' }).success).toBe(false)
    expect(getRecordType('schoolClass').schema.safeParse({ ...base, start: '10:00', end: '11:00' }).success).toBe(true)
  })

  test('un objetivo de ahorro de cero euros no es válido', () => {
    expect(getRecordType('savingsGoal').schema.safeParse({ name: 'Viaje', target: 0 }).success).toBe(false)
    expect(getRecordType('savingsGoal').schema.safeParse({ name: 'Viaje', target: 1 }).success).toBe(true)
  })

  test('el menú exige una receta o un plato escrito', () => {
    const base = { date: '2026-11-24', meal: 'lunch' }
    const schema = getRecordType('mealPlan').schema
    expect(schema.safeParse(base).success).toBe(false)
    expect(schema.safeParse({ ...base, dish: 'Lentejas' }).success).toBe(true)
    expect(schema.safeParse({ ...base, recipe: 'r1' }).success).toBe(true)
  })
})
