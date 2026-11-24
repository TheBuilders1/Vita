import { defineModule, defineRecordType, notBefore, options } from './define'

/** Tareas y eventos de toda la familia: alimentan el resumen y no viven en ninguna planta. */
const planner = defineModule({
  id: 'planner', floor: null, name: 'Tareas y eventos', essential: true,
  description: 'Lo que hay que hacer y lo que está por venir.',
  access: { member: 'write', vulnerable: 'write' },
  recordTypes: [
    defineRecordType({
      id: 'task', name: 'Tarea', plural: 'Tareas', titleField: 'title', doneField: 'done',
      fields: {
        title: { kind: 'text', label: 'Tarea', required: true },
        members: { kind: 'members', label: 'Quién se encarga' },
        dueDate: { kind: 'date', label: 'Para cuándo' },
        priority: { kind: 'select', label: 'Prioridad', options: options({ low: 'Baja', normal: 'Normal', high: 'Alta' }) },
        done: { kind: 'boolean', label: 'Hecha' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      agenda: [{ dateField: 'dueDate', category: 'reminder' }],
    }),
    defineRecordType({
      id: 'event', name: 'Evento', plural: 'Eventos', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Evento', required: true },
        date: { kind: 'date', label: 'Fecha', required: true },
        endDate: { kind: 'date', label: 'Hasta' },
        time: { kind: 'time', label: 'Hora' },
        repeat: { kind: 'select', label: 'Se repite', options: options({ none: 'No', weekly: 'Cada semana', monthly: 'Cada mes', yearly: 'Cada año' }) },
        until: { kind: 'date', label: 'Se repite hasta' },
        members: { kind: 'members', label: 'Quién participa' },
        place: { kind: 'text', label: 'Lugar' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [
        notBefore('date', 'endDate', 'El evento no puede acabar antes de empezar'),
        notBefore('date', 'until', 'La repetición no puede acabar antes de empezar'),
      ],
      agenda: [{ dateField: 'date', endField: 'endDate', timeField: 'time', repeatField: 'repeat', untilField: 'until', category: 'event', detailField: 'place' }],
    }),
  ],
})

export const TRANSVERSAL_MODULES = [planner]
