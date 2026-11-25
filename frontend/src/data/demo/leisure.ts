import type { DemoContext } from '.'

export async function leisureDemo({ add, day, marta, andres, leo, pilar }: DemoContext) {
  const everyone = [marta, andres, leo, pilar]
  await add(andres, 'outing', { title: 'Tarde en el parque', kind: 'park', date: day(4), time: '16:30', members: [andres, leo], status: 'planned' })
  await add(marta, 'outing', { title: 'Vacaciones en la costa', kind: 'holiday', date: day(215), endDate: day(225), members: everyone, cost: 150000, status: 'idea' })
  const list = await add(marta, 'shoppingList', { name: 'Compra de casa', budget: 12000 })
  await add(marta, 'shoppingItem', { list, name: 'Leche', quantity: 6, unit: 'l', price: 570, category: 'dairy' })
  await add(marta, 'shoppingItem', { list, name: 'Calabacín', quantity: 3, unit: 'unidades', price: 240, category: 'produce' })
  await add(pilar, 'shoppingItem', { list, name: 'Manzanilla', quantity: 1, unit: 'caja', category: 'pantry' })
  await add(andres, 'shoppingItem', { list, name: 'Pan integral', quantity: 2, unit: 'barras', price: 260, bought: true, category: 'pantry' })
  const cleaning = await add(andres, 'shoppingList', { name: 'Droguería' })
  await add(andres, 'shoppingItem', { list: cleaning, name: 'Detergente', quantity: 1, unit: 'botella', category: 'cleaning' })
  await add(andres, 'shoppingItem', { list: cleaning, name: 'Pasta de dientes', quantity: 2, unit: 'tubos', category: 'hygiene' })
  await add(marta, 'device', { name: 'Tableta de Leo', kind: 'tablet', member: leo, parentalControl: true, agreements: 'Una hora los días de colegio. Sin pantalla en la mesa.', reviewDate: day(5) })
  await add(andres, 'device', { name: 'Móvil de Pilar', kind: 'phone', member: pilar, agreements: 'Los enlaces desconocidos se consultan antes de abrirlos.' })
  await add(andres, 'wifi', { name: 'Robles-Invitados', password: 'ejemplo-ficticio-2026', location: 'Salón, junto a la tele' })
  await add(marta, 'socialAccount', { network: 'Red de fotos', member: marta, privacy: 'friends', twoFactor: true, reviewDate: day(30) })
  await add(marta, 'safetyCheck', { title: 'Actualizar el router', member: andres, dueDate: day(3) })
  await add(marta, 'safetyCheck', { title: 'Revisar quién ve nuestras fotos', member: marta, done: true })
  await add(andres, 'scamReport', { title: 'SMS de un paquete que no esperábamos', channel: 'sms', date: day(-9), signals: ['Enlace raro', 'Pide pagar con prisa'], action: 'Lo borramos sin abrirlo.' })
  await add(andres, 'newsCheck', { headline: 'Cadena: «Mañana cierran todos los bancos»', source: 'Mensaje reenviado', date: day(-3), verdict: 'hoax', notes: 'Ningún medio ni organismo oficial lo confirma.' })
  await add(marta, 'memory', { title: 'Primer día de playa de Nube', date: day(-120), members: [leo, andres], story: 'No quería salir del agua.', category: 'travel' })
  await add(pilar, 'memory', { title: 'La receta de rosquillas de la abuela', date: day(-30), members: [pilar, leo], story: 'Leo aprendió a amasar.', category: 'daily' })
  await add(marta, 'memory', { title: 'Cumpleaños de Leo', date: day(-200), members: [marta, andres, leo, pilar], story: 'Tarta de chocolate sin frutos secos.', category: 'birthday' })
}
