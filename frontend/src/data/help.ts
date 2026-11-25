export interface HelpTopic { readonly id: string; readonly question: string; readonly steps: readonly string[]; readonly link?: { readonly to: string; readonly label: string } }
export interface HelpGroup { readonly title: string; readonly topics: readonly HelpTopic[] }

/** Con las mismas palabras que se ven en pantalla: si cambia un botón, cambia aquí. */
export const HELP: readonly HelpGroup[] = [
  {
    title: 'Lo de cada día',
    topics: [
      { id: 'apuntar', question: 'Apuntar una cita, una tarea o un gasto', steps: ['En el edificio o en el calendario, pulsa «Apuntar».', 'Elige qué es, rellena lo que sepas y pulsa «Guardar».', 'También puedes escribírselo a Vita con tus palabras: «dentista el martes a las 10».'], link: { to: '/vita', label: 'Pedírselo a Vita' } },
      { id: 'pendiente', question: 'Saber qué hay pendiente', steps: ['El número con el signo de atención dice cuántas cosas hay.', 'En el edificio, pulsa «Resumen»: va de lo más urgente a lo menos.', 'Cuando algo esté, pulsa «Hecho». Si te equivocas, «Deshacer».'], link: { to: '/edificio', label: 'Ir al edificio' } },
      { id: 'buscar', question: 'Encontrar algo', steps: ['Pulsa «Buscar» y escribe una palabra. Da igual poner tildes o no.', 'Se busca en todo lo que tu perfil puede ver.'], link: { to: '/buscar', label: 'Buscar' } },
      { id: 'escuchar', question: 'Que Vita me lo lea', steps: ['Pulsa «Escuchar» en una ficha o en el resumen. Para callarla, «Parar».', 'Si no ves el botón, tu dispositivo no tiene una voz en español instalada. Se añade en los ajustes de accesibilidad o de idioma del propio dispositivo.'] },
    ],
  },
  {
    title: 'Documentos y fotos',
    topics: [
      { id: 'documento', question: 'Guardar un documento', steps: ['Entra en la planta de Finanzas, en Documentación, y pulsa «Añadir documento».', 'Haz una foto o elige un archivo. En un ordenador también puedes arrastrarlo o pegarlo.', 'Si pones la fecha de caducidad, Vita te avisará antes.'], link: { to: '/planta/finance/documents', label: 'Ir a Documentación' } },
      { id: 'compartir', question: 'Enviar algo a otra persona', steps: ['Abre la ficha y pulsa «Compartir».', 'Revisa el texto: se envía exactamente lo que ves.', 'Elige a quién, o pulsa «Copiar texto» y pégalo en un mensaje.'] },
      { id: 'duplicar', question: 'Repetir algo parecido', steps: ['Abre la ficha y pulsa «Duplicar».', 'Cambia lo que haga falta y guarda. El original no se toca.'] },
      { id: 'borrar', question: 'Borrar algo que guardé', steps: ['Abre la ficha de lo que quieres borrar.', 'Si tu perfil puede borrarlo, pulsa «Eliminar» y revisa el aviso antes de confirmar.'] },
      { id: 'recuperar', question: 'Recuperar algo que borré', steps: ['Justo después de borrar, pulsa «Deshacer».', 'Más tarde, en Ajustes, en «Papelera». Se guarda 30 días.'], link: { to: '/ajustes#papelera', label: 'Ir a la papelera' } },
    ],
  },
  {
    title: 'Tu hogar y las personas',
    topics: [
      { id: 'personas', question: 'Añadir o cambiar una persona', steps: ['En «Mi hogar», quien es admin puede añadir personas, cambiar su rol y elegir qué ve cada una.', 'Cada persona puede cambiar sus propios datos.'], link: { to: '/hogar', label: 'Ir a mi hogar' } },
      { id: 'ver', question: 'Quién puede ver lo que guardo', steps: ['Al guardar, elige: todo el hogar, solo algunas personas o solo tú.', 'Los perfiles ordenan lo que se ve dentro de Vita, pero no llevan contraseña: quien use este dispositivo puede cambiar de perfil.'] },
      { id: 'habitaciones', question: 'Quitar habitaciones que no uso', steps: ['En Ajustes, en «Habitaciones abiertas». Cerrar una la oculta, pero no borra lo que hay dentro.'], link: { to: '/ajustes#habitaciones', label: 'Elegir habitaciones' } },
    ],
  },
  {
    title: 'Seguridad y comodidad',
    topics: [
      { id: 'letra', question: 'Ver la letra más grande o con más contraste', steps: ['En Ajustes, en «Lectura y movimiento».'], link: { to: '/ajustes', label: 'Ir a Ajustes' } },
      { id: 'copia', question: 'No perder los datos', steps: ['Los registros del hogar se guardan en este navegador. Si borras sus datos, perderás los registros.', 'En Ajustes, en «Copias de seguridad», guarda una copia de vez en cuando y ponla en otro sitio.'], link: { to: '/ajustes#copias', label: 'Hacer una copia' } },
      { id: 'otro', question: 'Usar Vita en otro dispositivo', steps: ['Guarda una copia aquí y ábrela en el otro con «Restaurar una copia».', 'A partir de ahí son independientes: lo que cambies en uno no aparece en el otro.'], link: { to: '/ajustes#copias', label: 'Copias de seguridad' } },
      { id: 'urgencia', question: 'Tengo una emergencia', steps: ['Pulsa «Emergencias»: verás el teléfono y los datos importantes de cada persona.', 'Vita no llama sola ni avisa a nadie.'], link: { to: '/planta/health/emergency', label: 'Ir a Emergencias' } },
    ],
  },
]
