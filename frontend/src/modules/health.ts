import { FAMILY_LOCKED, RESTRICTED, defineModule, defineRecordType, notBefore, options } from './define'

const appointmentFields = {
  member: { kind: 'member', label: 'Persona', required: true },
  title: { kind: 'text', label: 'Motivo', required: true },
  date: { kind: 'date', label: 'Fecha', required: true },
  time: { kind: 'time', label: 'Hora' },
  place: { kind: 'text', label: 'Centro y dirección' },
  professional: { kind: 'text', label: 'Profesional' },
  companion: { kind: 'member', label: 'Quién acompaña' },
  done: { kind: 'boolean', label: 'Ya ha pasado' },
  notes: { kind: 'textarea', label: 'Notas' },
} as const

const healthRecord = defineModule({
  id: 'healthRecord', floor: 'health', name: 'Salud general', essential: true, disclaimer: 'health',
  description: 'Historial, alergias, citas y revisiones.',
  recordTypes: [
    defineRecordType({
      id: 'condition', name: 'Dato de salud', plural: 'Historial de salud', titleField: 'title', visibility: RESTRICTED,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        title: { kind: 'text', label: 'Nombre', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ illness: 'Enfermedad', allergy: 'Alergia', intolerance: 'Intolerancia', surgery: 'Operación', other: 'Otra información' }) },
        since: { kind: 'date', label: 'Desde' },
        active: { kind: 'boolean', label: 'Sigue activo' },
        notes: { kind: 'textarea', label: 'Notas' },
        files: { kind: 'files', label: 'Informes' },
      },
    }),
    defineRecordType({
      id: 'appointment', name: 'Cita médica', plural: 'Citas médicas', titleField: 'title', visibility: RESTRICTED, doneField: 'done',
      fields: appointmentFields,
      agenda: [{ dateField: 'date', timeField: 'time', category: 'appointment', detailField: 'place' }],
    }),
  ],
})

const dental = defineModule({
  id: 'dental', floor: 'health', name: 'Dentista', essential: true, disclaimer: 'health',
  description: 'Revisiones, tratamientos y dientes de los pequeños.',
  recordTypes: [
    defineRecordType({
      id: 'dentalVisit', name: 'Cita dental', plural: 'Citas dentales', titleField: 'title', visibility: RESTRICTED, doneField: 'done',
      fields: {
        ...appointmentFields,
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ checkup: 'Revisión', cleaning: 'Limpieza', treatment: 'Tratamiento', orthodontics: 'Ortodoncia' }) },
        nextCheckup: { kind: 'date', label: 'Próxima revisión' },
      },
      rules: [notBefore('date', 'nextCheckup', 'La próxima revisión no puede ser anterior a la cita')],
      agenda: [
        { dateField: 'date', timeField: 'time', category: 'appointment', detailField: 'place' },
        { dateField: 'nextCheckup', category: 'reminder', label: 'Próxima revisión', independent: true },
      ],
    }),
    defineRecordType({
      id: 'tooth', name: 'Diente', plural: 'Dientes infantiles', titleField: 'tooth',
      fields: {
        member: { kind: 'member', label: 'Niño o niña', required: true },
        tooth: { kind: 'text', label: 'Diente', required: true, help: 'Por ejemplo: incisivo central inferior.' },
        status: { kind: 'select', label: 'Qué ha pasado', required: true, options: options({ erupted: 'Ha salido', loose: 'Se mueve', fallen: 'Se ha caído', permanent: 'Sale el definitivo' }) },
        date: { kind: 'date', label: 'Fecha', required: true },
        notes: { kind: 'textarea', label: 'Observaciones' },
      },
    }),
  ],
})

const medication = defineModule({
  id: 'medication', floor: 'health', name: 'Medicación', essential: true, disclaimer: 'health',
  description: 'Medicamentos prescritos, horarios y tomas.',
  recordTypes: [
    defineRecordType({
      id: 'medicationPlan', name: 'Medicamento', plural: 'Medicamentos', titleField: 'name', visibility: RESTRICTED,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        name: { kind: 'text', label: 'Medicamento', required: true },
        dose: { kind: 'text', label: 'Dosis prescrita', required: true, help: 'Cópiala tal como aparece en la receta.' },
        times: { kind: 'times', label: 'Horas', required: true },
        weekdays: { kind: 'weekdays', label: 'Días', help: 'Si no marcas ninguno, se entiende que es todos los días.' },
        startDate: { kind: 'date', label: 'Empieza', required: true },
        endDate: { kind: 'date', label: 'Termina' },
        prescriber: { kind: 'text', label: 'Quién lo ha recetado' },
        notes: { kind: 'textarea', label: 'Indicaciones' },
      },
      rules: [notBefore('startDate', 'endDate', 'El tratamiento no puede acabar antes de empezar')],
      agenda: [{ dateField: 'startDate', timesField: 'times', weekdaysField: 'weekdays', untilField: 'endDate', repeat: 'daily', category: 'medication', detailField: 'dose', log: { typeId: 'medicationIntake', refField: 'plan', statusField: 'status' } }],
    }),
    defineRecordType({
      id: 'medicationIntake', name: 'Toma', plural: 'Historial de tomas', titleField: 'date', visibility: RESTRICTED, selfLog: true,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        plan: { kind: 'record', label: 'Medicamento', refType: 'medicationPlan', required: true },
        date: { kind: 'date', label: 'Día', required: true },
        time: { kind: 'time', label: 'Hora prevista', required: true },
        status: { kind: 'select', label: 'Estado', required: true, options: options({ taken: 'Tomada', skipped: 'No tomada' }) },
        notes: { kind: 'textarea', label: 'Notas' },
      },
    }),
  ],
})

const care = defineModule({
  id: 'care', floor: 'health', name: 'Discapacidad y dependencia', essential: true, disclaimer: 'health',
  description: 'Rutinas de cuidado, ayudas técnicas e información para cuidadores.',
  recordTypes: [
    defineRecordType({
      id: 'careNeed', name: 'Necesidad', plural: 'Necesidades', titleField: 'title', visibility: RESTRICTED,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        title: { kind: 'text', label: 'Necesidad', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ need: 'Necesidad particular', aid: 'Ayuda técnica', caregiverInfo: 'Información para cuidadores' }) },
        reviewDate: { kind: 'date', label: 'Próxima revisión' },
        details: { kind: 'textarea', label: 'Detalles' },
        files: { kind: 'files', label: 'Archivos' },
      },
      agenda: [{ dateField: 'reviewDate', category: 'reminder', label: 'Revisar' }],
    }),
    defineRecordType({
      id: 'careRoutine', name: 'Rutina de cuidado', plural: 'Rutinas de cuidado', titleField: 'title', visibility: RESTRICTED,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        title: { kind: 'text', label: 'Rutina', required: true },
        times: { kind: 'times', label: 'Horas', required: true },
        weekdays: { kind: 'weekdays', label: 'Días' },
        startDate: { kind: 'date', label: 'Desde', required: true },
        endDate: { kind: 'date', label: 'Hasta' },
        caregiver: { kind: 'member', label: 'Quién se encarga' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [notBefore('startDate', 'endDate', 'La rutina no puede acabar antes de empezar')],
      agenda: [{ dateField: 'startDate', timesField: 'times', weekdaysField: 'weekdays', untilField: 'endDate', repeat: 'daily', category: 'reminder', detailField: 'notes', log: { typeId: 'careLog', refField: 'routine' } }],
    }),
    defineRecordType({
      id: 'careLog', name: 'Cuidado realizado', plural: 'Cuidados realizados', titleField: 'date', visibility: RESTRICTED, selfLog: true,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        routine: { kind: 'record', label: 'Rutina', refType: 'careRoutine', required: true },
        date: { kind: 'date', label: 'Día', required: true },
        time: { kind: 'time', label: 'Hora prevista', required: true },
        notes: { kind: 'textarea', label: 'Notas' },
      },
    }),
  ],
})

const vaccination = defineModule({
  id: 'vaccination', floor: 'health', name: 'Vacunación', essential: true, disclaimer: 'health',
  description: 'Dosis puestas y próximas dosis.',
  recordTypes: [
    defineRecordType({
      id: 'vaccine', name: 'Vacuna', plural: 'Vacunas', titleField: 'name', visibility: RESTRICTED,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        name: { kind: 'text', label: 'Vacuna', required: true },
        dose: { kind: 'text', label: 'Dosis', maxLength: 50 },
        givenDate: { kind: 'date', label: 'Fecha de la dosis' },
        nextDate: { kind: 'date', label: 'Próxima dosis' },
        center: { kind: 'text', label: 'Centro' },
        lot: { kind: 'text', label: 'Lote', maxLength: 50 },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [
        notBefore('givenDate', 'nextDate', 'La próxima dosis no puede ser anterior a la última'),
        { field: 'givenDate', message: 'Indica la fecha de la dosis o de la próxima', valid: (d) => Boolean(d.givenDate ?? d.nextDate) },
      ],
      agenda: [{ dateField: 'nextDate', category: 'appointment', label: 'Próxima dosis' }],
    }),
  ],
})

const emergency = defineModule({
  id: 'emergency', floor: 'health', name: 'Emergencias', essential: true, disclaimer: 'health', minimumAccess: 'read',
  description: 'Contactos y datos importantes para actuar deprisa.',
  recordTypes: [
    defineRecordType({
      id: 'emergencyContact', name: 'Contacto de emergencia', plural: 'Contactos de emergencia', titleField: 'name', visibility: FAMILY_LOCKED,
      fields: {
        name: { kind: 'text', label: 'Nombre', required: true },
        relation: { kind: 'text', label: 'Relación' },
        phone: { kind: 'phone', label: 'Teléfono', required: true },
        priority: { kind: 'integer', label: 'Orden de llamada', min: 1, max: 20 },
        notes: { kind: 'textarea', label: 'Notas' },
      },
    }),
    defineRecordType({
      id: 'emergencyCard', name: 'Ficha de emergencia', plural: 'Fichas de emergencia', titleField: 'member', visibility: FAMILY_LOCKED,
      fields: {
        member: { kind: 'member', label: 'Persona', required: true },
        bloodType: { kind: 'select', label: 'Grupo sanguíneo', options: options({ 'A+': 'A+', 'A-': 'A−', 'B+': 'B+', 'B-': 'B−', 'AB+': 'AB+', 'AB-': 'AB−', 'O+': 'O+', 'O-': 'O−' }) },
        allergies: { kind: 'textarea', label: 'Alergias' },
        conditions: { kind: 'textarea', label: 'Información médica importante' },
        medication: { kind: 'textarea', label: 'Medicación relevante' },
        instructions: { kind: 'textarea', label: 'Qué debe saber quien atienda' },
        doctor: { kind: 'text', label: 'Médico de referencia' },
        doctorPhone: { kind: 'phone', label: 'Teléfono del médico' },
      },
    }),
  ],
})

const pets = defineModule({
  id: 'pets', floor: 'health', name: 'Mascotas', disclaimer: 'health',
  description: 'Perfil, veterinario, vacunas y alimentación.',
  recordTypes: [
    defineRecordType({
      id: 'pet', name: 'Mascota', plural: 'Mascotas', titleField: 'name',
      fields: {
        name: { kind: 'text', label: 'Nombre', required: true },
        species: { kind: 'text', label: 'Especie y raza', required: true },
        birthDate: { kind: 'date', label: 'Fecha de nacimiento' },
        microchip: { kind: 'text', label: 'Microchip', maxLength: 50 },
        vet: { kind: 'text', label: 'Veterinario' },
        vetPhone: { kind: 'phone', label: 'Teléfono del veterinario' },
        feeding: { kind: 'textarea', label: 'Alimentación' },
        photo: { kind: 'files', label: 'Fotos' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      agenda: [{ dateField: 'birthDate', category: 'birthday', repeat: 'yearly', label: 'Cumpleaños' }],
    }),
    defineRecordType({
      id: 'petCare', name: 'Cuidado de mascota', plural: 'Cuidados de mascotas', titleField: 'title', doneField: 'done',
      fields: {
        pet: { kind: 'record', label: 'Mascota', refType: 'pet', required: true },
        title: { kind: 'text', label: 'Cuidado', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ vaccine: 'Vacuna', checkup: 'Revisión', medication: 'Medicación', grooming: 'Higiene', other: 'Otro' }) },
        date: { kind: 'date', label: 'Fecha', required: true },
        time: { kind: 'time', label: 'Hora' },
        done: { kind: 'boolean', label: 'Hecho' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      agenda: [{ dateField: 'date', timeField: 'time', category: 'appointment' }],
    }),
  ],
})

export const HEALTH_MODULES = [healthRecord, dental, medication, care, vaccination, emergency, pets]
