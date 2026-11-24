import { RESTRICTED, defineModule, defineRecordType, notBefore, options } from './define'

const outings = defineModule({
  id: 'outings', floor: 'leisure', name: 'Ocio',
  description: 'Planes, excursiones, salidas y vacaciones.',
  recordTypes: [
    defineRecordType({
      id: 'outing', name: 'Plan', plural: 'Planes', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Plan', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ activity: 'Actividad', trip: 'Excursión', park: 'Parque', outing: 'Salida', holiday: 'Vacaciones', family: 'Plan todos juntos' }) },
        date: { kind: 'date', label: 'Fecha', required: true },
        endDate: { kind: 'date', label: 'Hasta' },
        time: { kind: 'time', label: 'Hora' },
        place: { kind: 'text', label: 'Lugar' },
        members: { kind: 'members', label: 'Quién va' },
        cost: { kind: 'money', label: 'Coste previsto' },
        status: { kind: 'select', label: 'Estado', options: options({ idea: 'Idea', planned: 'Planeado', booked: 'Reservado', done: 'Hecho' }) },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      rules: [notBefore('date', 'endDate', 'El plan no puede acabar antes de empezar')],
      agenda: [{ dateField: 'date', endField: 'endDate', timeField: 'time', category: 'holiday', detailField: 'place' }],
    }),
  ],
})

const shopping = defineModule({
  id: 'shopping', floor: 'leisure', name: 'Compras',
  description: 'Listas compartidas, también la de la compra de casa.',
  access: { member: 'write', vulnerable: 'write' },
  recordTypes: [
    defineRecordType({
      id: 'shoppingList', name: 'Lista de compra', plural: 'Listas de compra', titleField: 'name',
      fields: {
        name: { kind: 'text', label: 'Nombre de la lista', required: true },
        budget: { kind: 'money', label: 'Presupuesto' },
      },
    }),
    defineRecordType({
      id: 'shoppingItem', name: 'Producto', plural: 'Productos', titleField: 'name', doneField: 'bought',
      fields: {
        list: { kind: 'record', label: 'Lista', refType: 'shoppingList', required: true },
        name: { kind: 'text', label: 'Producto', required: true },
        quantity: { kind: 'number', label: 'Cantidad', min: 0 },
        unit: { kind: 'text', label: 'Unidad', maxLength: 30 },
        price: { kind: 'money', label: 'Precio' },
        bought: { kind: 'boolean', label: 'Comprado' },
      },
    }),
  ],
})

const technology = defineModule({
  id: 'technology', floor: 'leisure', name: 'Tecnología',
  description: 'Dispositivos, redes sociales y privacidad.',
  recordTypes: [
    defineRecordType({
      id: 'device', name: 'Dispositivo', plural: 'Dispositivos', titleField: 'name',
      fields: {
        name: { kind: 'text', label: 'Dispositivo', required: true },
        kind: { kind: 'select', label: 'Tipo', required: true, options: options({ phone: 'Móvil', tablet: 'Tableta', computer: 'Ordenador', console: 'Consola', tv: 'Televisión', other: 'Otro' }) },
        member: { kind: 'member', label: 'Quién lo usa' },
        parentalControl: { kind: 'boolean', label: 'Tiene control parental activado' },
        agreements: { kind: 'textarea', label: 'Normas acordadas', help: 'Vita no controla el dispositivo: solo recuerda lo acordado.' },
        reviewDate: { kind: 'date', label: 'Próxima revisión' },
      },
      agenda: [{ dateField: 'reviewDate', category: 'reminder', label: 'Revisar' }],
    }),
    defineRecordType({
      id: 'socialAccount', name: 'Red social', plural: 'Redes sociales', titleField: 'network', visibility: RESTRICTED,
      fields: {
        network: { kind: 'text', label: 'Red o servicio', required: true },
        member: { kind: 'member', label: 'Persona', required: true },
        privacy: { kind: 'select', label: 'Privacidad del perfil', required: true, options: options({ public: 'Público', friends: 'Solo contactos', private: 'Privado', unknown: 'Sin revisar' }) },
        twoFactor: { kind: 'boolean', label: 'Verificación en dos pasos activada' },
        reviewDate: { kind: 'date', label: 'Próxima revisión' },
        notes: { kind: 'textarea', label: 'Notas', help: 'No escribas aquí claves de acceso.' },
      },
      agenda: [{ dateField: 'reviewDate', category: 'reminder', label: 'Revisar' }],
    }),
  ],
})

const cybersecurity = defineModule({
  id: 'cybersecurity', floor: 'leisure', name: 'Ciberseguridad',
  description: 'Buenas prácticas y avisos de posibles estafas.',
  recordTypes: [
    defineRecordType({
      id: 'safetyCheck', name: 'Revisión de seguridad', plural: 'Revisiones de seguridad', titleField: 'title', doneField: 'done',
      fields: {
        title: { kind: 'text', label: 'Qué revisar', required: true },
        member: { kind: 'member', label: 'Quién' },
        dueDate: { kind: 'date', label: 'Fecha límite' },
        done: { kind: 'boolean', label: 'Hecho' },
        notes: { kind: 'textarea', label: 'Notas' },
      },
      agenda: [{ dateField: 'dueDate', category: 'reminder' }],
    }),
    defineRecordType({
      id: 'scamReport', name: 'Posible estafa', plural: 'Posibles estafas', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Qué ha pasado', required: true },
        channel: { kind: 'select', label: 'Por dónde llegó', required: true, options: options({ sms: 'SMS', email: 'Correo', call: 'Llamada', social: 'Red social', web: 'Página web', person: 'En persona' }) },
        date: { kind: 'date', label: 'Fecha', required: true },
        signals: { kind: 'tags', label: 'Señales sospechosas' },
        action: { kind: 'textarea', label: 'Qué hicimos' },
      },
    }),
  ],
})

const digitalInfo = defineModule({
  id: 'digitalInfo', floor: 'leisure', name: 'Información digital',
  description: 'Contrastar noticias y reconocer bulos en casa.',
  recordTypes: [
    defineRecordType({
      id: 'newsCheck', name: 'Noticia por contrastar', plural: 'Noticias contrastadas', titleField: 'headline',
      fields: {
        headline: { kind: 'text', label: 'Noticia o mensaje', required: true },
        url: { kind: 'url', label: 'Enlace' },
        source: { kind: 'text', label: 'Quién lo publica' },
        date: { kind: 'date', label: 'Fecha' },
        authorKnown: { kind: 'boolean', label: 'Sabemos quién lo firma' },
        otherSources: { kind: 'boolean', label: 'Lo confirman otras fuentes fiables' },
        currentDate: { kind: 'boolean', label: 'La fecha y la imagen son actuales' },
        verdict: { kind: 'select', label: 'Conclusión', required: true, options: options({ pending: 'Sin comprobar', reliable: 'Parece fiable', doubtful: 'Dudosa', hoax: 'Posible bulo' }) },
        notes: { kind: 'textarea', label: 'Notas' },
      },
    }),
  ],
})

const album = defineModule({
  id: 'album', floor: 'leisure', name: 'Álbum del hogar',
  description: 'Fotos, recuerdos y archivos compartidos.',
  access: { member: 'write', vulnerable: 'write' },
  recordTypes: [
    defineRecordType({
      id: 'memory', name: 'Recuerdo', plural: 'Recuerdos', titleField: 'title',
      fields: {
        title: { kind: 'text', label: 'Título', required: true },
        date: { kind: 'date', label: 'Fecha', required: true },
        members: { kind: 'members', label: 'Quién aparece' },
        files: { kind: 'files', label: 'Fotos y archivos' },
        links: { kind: 'links', label: 'Enlaces' },
        story: { kind: 'textarea', label: 'Historia' },
      },
    }),
  ],
})

export const LEISURE_MODULES = [outings, shopping, technology, cybersecurity, digitalInfo, album]
