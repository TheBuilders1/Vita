import type { DemoContext } from '.'

export async function educationDemo({ add, day, marta, andres, leo }: DemoContext) {
  await add(marta, 'schoolProfile', { member: leo, center: 'Colegio El Olmo (ficticio)', course: '4.º B', teacher: 'Irene', startDate: day(-75), endDate: day(210) })
  await add(marta, 'schoolClass', { member: leo, subject: 'Matemáticas', weekdays: [1, 3, 5], start: '09:00', end: '10:00' })
  await add(marta, 'schoolClass', { member: leo, subject: 'Lengua', weekdays: [1, 2, 4], start: '10:00', end: '11:00' })
  await add(marta, 'schoolEvent', { title: 'Examen de Matemáticas', member: leo, kind: 'exam', date: day(3), time: '09:00' })
  await add(andres, 'schoolEvent', { title: 'Natación', member: leo, kind: 'extracurricular', date: day(-28), time: '17:30', repeat: 'weekly', until: day(180), place: 'Piscina municipal' })
  await add(marta, 'schoolEvent', { title: 'Reunión con la tutora', member: leo, kind: 'meeting', date: day(6), time: '16:00' })
  await add(marta, 'grant', { title: 'Ayuda para libros', member: leo, organism: 'Ayuntamiento', openDate: day(-10), deadline: day(12), status: 'preparing', requirements: ['Certificado de empadronamiento', 'Justificante de ingresos'] })
  await add(marta, 'milestone', { member: leo, title: 'Va solo al colegio', area: 'autonomy', achievedDate: day(-40) })
  await add(andres, 'milestone', { member: leo, title: 'Nadar cien metros', area: 'motor', expectedDate: day(45) })
  await add(marta, 'booking', { title: 'Excursión al museo de ciencias', member: leo, kind: 'trip', date: day(5), price: 1200, status: 'paid' })
  await add(marta, 'booking', { title: 'Comedor de diciembre', member: leo, kind: 'canteen', date: day(7), price: 9800, status: 'pending' })
}
