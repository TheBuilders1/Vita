import type { ModuleId } from '@/modules/types'

export interface Guide { readonly title: string; readonly points: readonly string[] }

/** Orientación general escrita para la demostración. No sustituye a ningún profesional ni organismo. */
export const GUIDES: Partial<Record<ModuleId, readonly Guide[]>> = {
  development: [
    { title: 'Los primeros meses', points: ['Para dormir, boca arriba y en una superficie firme y despejada.', 'Los bebés piden comer a su ritmo: las dudas sobre tomas y peso, a su pediatra.', 'Hablarle, cantarle y mirarle a la cara es jugar.', 'Pedir ayuda y descansar también es cuidar.'] },
    { title: 'Cuándo consultar', points: ['Si algo te preocupa, consúltalo aunque parezca pequeño.', 'Fiebre en los primeros meses, dificultad para respirar o mucha somnolencia: llama a un servicio sanitario sin esperar.'] },
    { title: 'Cada niño lleva su ritmo', points: ['Los hitos son orientativos: hay mucha variación normal.', 'Anótalos aquí y llévalos a las revisiones.'] },
  ],
  emergency: [
    { title: 'Antes de que pase', points: ['Ten a mano esta pantalla y enséñala en casa.', 'Comprobad juntos que los más pequeños saben a quién llamar.'] },
  ],
  technology: [
    { title: 'Acuerdos que funcionan', points: ['Pocas normas, claras y las mismas para toda la casa.', 'Pantallas fuera del dormitorio por la noche.', 'Revisad juntos la privacidad de cada red una vez al año.', 'Vita no controla los dispositivos: solo os ayuda a recordar lo acordado.'] },
  ],
  cybersecurity: [
    { title: 'Señales de una estafa', points: ['Mete prisa o miedo: «hoy se bloquea tu cuenta».', 'Pide claves, códigos que llegan por SMS o pagos raros.', 'El enlace o el remitente no coinciden con el oficial.', 'Promete un premio que no esperabas.'] },
    { title: 'Qué hacer', points: ['No pulses ni contestes. Busca tú el teléfono oficial y llama.', 'Si diste datos del banco, llama a tu banco cuanto antes.', 'Guarda pruebas y denúncialo.'] },
    { title: 'Contraseñas', points: ['Largas y distintas para cada servicio; un gestor de contraseñas ayuda.', 'Activa la verificación en dos pasos.', 'No las guardes en Vita: los datos no van cifrados.'] },
    { title: 'Proteger a los menores', points: ['Que sepan que pueden contarlo sin castigo.', 'Nada de fotos, dirección o colegio a desconocidos.'] },
  ],
  digitalInfo: [
    { title: 'Antes de reenviar, cinco preguntas', points: ['¿Quién lo publica y se le puede identificar?', '¿De cuándo es? Muchas cadenas reciclan noticias viejas.', '¿Lo cuentan otras fuentes fiables?', '¿La imagen es de ese momento y lugar?', '¿Me hace sentir rabia o miedo? Razón de más para comprobarlo.'] },
  ],
  care: [
    { title: 'Cuidar a quien cuida', points: ['Repartid turnos y apuntadlos: lo que no se ve, se carga siempre a la misma persona.', 'Preguntad en servicios sociales por ayudas y respiro familiar.'] },
  ],
  finances: [
    { title: 'Para empezar', points: ['Apunta primero lo que se repite: vivienda, suministros y seguros.', 'Pon presupuesto solo a dos o tres categorías.', 'Revisadlo juntos una vez al mes.'] },
  ],
}
