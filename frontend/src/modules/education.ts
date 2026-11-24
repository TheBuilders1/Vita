import { RESTRICTED, defineModule, defineRecordType, notBefore, options } from './define'

const school = defineModule({
  id: 'school', floor: 'education', name: 'Escuela',
  description: 'Centro, profesorado, horarios, exámenes y avisos del colegio.',
  recordTypes: [
    defineRecordType({
      id: 'schoolProfile', name: 'Curso escolar', plural: 'Cursos escolares', titleField: 'center',
      fields: {
        member: { kind: 'member', label: 'Estudiante', required: true },
        center: { kind: 'text', label: 'Centro educativo', required: true },
        course: { kind: 'text', label: 'Curso y grupo', required: true },
        teacher: { kind: 'text', label: 'Tutor o tutora' },
        phone: { kind: 'phone', label: 'Teléfono del centro' },
        startDate: { kind: 'date', label: 'Inicio del curso' },
        endDate: { kind: 'date', label: 'Fin del curso' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [notBefore('startDate', 'endDate', 'El curso no puede acabar antes de empezar')],
    }),
    defineRecordType({
      id: 'schoolClass', name: 'Clase', plural: 'Horario', titleField: 'subject',
      fields: {
        member: { kind: 'member', label: 'Estudiante', required: true },
        subject: { kind: 'text', label: 'Asignatura', required: true },
        weekdays: { kind: 'weekdays', label: 'Días', required: true },
        start: { kind: 'time', label: 'Empieza', required: true },
        end: { kind: 'time', label: 'Termina', required: true },
        teacher: { kind: 'text', label: 'Profesor o profesora' },
      },
      rules: [{ field: 'end', message: 'La clase debe terminar después de empezar', valid: (d) => String(d.end) > String(d.start) }],
    }),
    defineRecordType({
      id: 'schoolEvent', name: 'Fecha escolar', plural: 'Fechas escolares', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Título', required: true },
        member: { kind: 'member', label: 'Estudiante', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ exam: 'Examen', homework: 'Entrega', extracurricular: 'Extraescolar', meeting: 'Reunión', holiday: 'Festivo escolar', notice: 'Comunicación' }) },
        date: { kind: 'date', label: 'Fecha', required: true },
        time: { kind: 'time', label: 'Hora' },
        repeat: { kind: 'select', label: 'Se repite', options: options({ none: 'No', weekly: 'Cada semana', monthly: 'Cada mes' }) },
        until: { kind: 'date', label: 'Hasta' },
        place: { kind: 'text', label: 'Lugar' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [notBefore('date', 'until', 'La repetición no puede acabar antes de empezar')],
      agenda: [{ dateField: 'date', timeField: 'time', category: 'school', repeatField: 'repeat', untilField: 'until', detailField: 'place' }],
    }),
  ],
})

const grants = defineModule({
  id: 'grants', floor: 'education', name: 'Becas y ayudas',
  description: 'Solicitudes, plazos y documentación necesaria.',
  recordTypes: [
    defineRecordType({
      id: 'grant', name: 'Beca o ayuda', plural: 'Becas y ayudas', titleField: 'title', visibility: RESTRICTED,
      fields: {
        title: { kind: 'text', label: 'Nombre de la ayuda', required: true },
        member: { kind: 'member', label: 'Para quién', required: true },
        organism: { kind: 'text', label: 'Organismo' },
        openDate: { kind: 'date', label: 'Se abre el plazo' },
        deadline: { kind: 'date', label: 'Último día' },
        status: { kind: 'select', label: 'Estado', required: true, options: options({ pending: 'Por preparar', preparing: 'Reuniendo documentos', submitted: 'Presentada', granted: 'Concedida', denied: 'Denegada' }) },
        requirements: { kind: 'tags', label: 'Documentos necesarios' },
        files: { kind: 'files', label: 'Archivos' },
        links: { kind: 'links', label: 'Enlaces' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [notBefore('openDate', 'deadline', 'El último día no puede ser anterior a la apertura')],
      agenda: [
        { dateField: 'openDate', category: 'reminder', label: 'Se abre el plazo' },
        { dateField: 'deadline', category: 'deadline', label: 'Último día' },
      ],
    }),
  ],
})

const development = defineModule({
  id: 'development', floor: 'education', name: 'Desarrollo infantil',
  description: 'Etapas, hitos y momentos importantes del crecimiento.',
  recordTypes: [
    defineRecordType({
      id: 'milestone', name: 'Hito', plural: 'Hitos', titleField: 'title',
      fields: {
        member: { kind: 'member', label: 'Niño o niña', required: true },
        title: { kind: 'text', label: 'Hito', required: true },
        area: { kind: 'select', label: 'Área', required: true, options: options({ motor: 'Movimiento', language: 'Lenguaje', social: 'Social y emocional', learning: 'Aprendizaje', autonomy: 'Autonomía', activity: 'Actividad' }) },
        expectedDate: { kind: 'date', label: 'Fecha prevista' },
        achievedDate: { kind: 'date', label: 'Fecha en que lo logró' },
        notes: { kind: 'textarea', label: 'Notas' },
        files: { kind: 'files', label: 'Fotos' },
      },
      agenda: [{ dateField: 'expectedDate', category: 'reminder', label: 'Previsto' }],
    }),
  ],
})

const bookings = defineModule({
  id: 'bookings', floor: 'education', name: 'Reservas',
  description: 'Comedor, excursiones y servicios del centro.',
  recordTypes: [
    defineRecordType({
      id: 'booking', name: 'Reserva', plural: 'Reservas', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Qué reservamos', required: true },
        member: { kind: 'member', label: 'Para quién', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ activity: 'Actividad escolar', canteen: 'Comedor', trip: 'Excursión', service: 'Otro servicio' }) },
        date: { kind: 'date', label: 'Fecha', required: true },
        price: { kind: 'money', label: 'Precio' },
        status: { kind: 'select', label: 'Estado', required: true, options: options({ pending: 'Pendiente', booked: 'Reservada', paid: 'Pagada', cancelled: 'Cancelada' }) },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      agenda: [{ dateField: 'date', category: 'school' }],
    }),
  ],
})

export const EDUCATION_MODULES = [school, grants, development, bookings]
