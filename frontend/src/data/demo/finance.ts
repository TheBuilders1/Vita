import { addMonths } from '@/utils/dates'
import type { DemoContext } from '.'

export async function financeDemo({ add, day, marta, andres, leo, pilar, today }: DemoContext) {
  const monthStart = `${today.slice(0, 7)}-01`
  // Los fijos empiezan dos meses antes: así el informe trimestral tiene un trimestre que contar.
  const since = addMonths(monthStart, -2)
  await add(marta, 'transaction', { kind: 'income', concept: 'Nómina de Marta', amount: 198000, category: 'salary', date: since, repeat: 'monthly' })
  await add(marta, 'transaction', { kind: 'income', concept: 'Nómina de Andrés', amount: 176000, category: 'salary', date: since, repeat: 'monthly' })
  await add(marta, 'transaction', { kind: 'expense', concept: 'Hipoteca', amount: 72000, category: 'home', date: since, repeat: 'monthly' })
  await add(marta, 'transaction', { kind: 'expense', concept: 'Compra semanal', amount: 11840, category: 'food', date: today })
  await add(marta, 'transaction', { kind: 'expense', concept: 'Luz y agua', amount: 13260, category: 'home', date: since, repeat: 'monthly' })
  await add(marta, 'transaction', { kind: 'expense', concept: 'Zapatillas de Leo', amount: 3990, category: 'clothing', date: today })
  for (const back of [1, 2]) {
    const month = addMonths(monthStart, -back)
    await add(marta, 'transaction', { kind: 'expense', concept: 'Compras del mes', amount: 48000 + back * 3500, category: 'food', date: month.replace(/-01$/, '-15') })
    await add(marta, 'transaction', { kind: 'expense', concept: 'Gasolina', amount: 9500, category: 'transport', date: month.replace(/-01$/, '-08') })
    await add(marta, 'transaction', { kind: 'expense', concept: back === 1 ? 'Cine y cena' : 'Excursión al río', amount: 6400 + back * 2000, category: 'leisure', date: month.replace(/-01$/, '-20') })
  }
  await add(marta, 'budget', { category: 'food', limit: 14000 })
  await add(marta, 'budget', { category: 'leisure', limit: 18000 })
  const trip = await add(marta, 'savingsGoal', { name: 'Vacaciones en la costa', target: 150000, deadline: day(200) })
  await add(marta, 'savingsContribution', { goal: trip, amount: 40000, date: day(-40), contributor: marta })
  await add(marta, 'savingsContribution', { goal: trip, amount: 22000, date: day(-8), contributor: andres })
  await add(marta, 'allowance', { member: leo, amount: 500, repeat: 'weekly', startDate: day(-21) })
  const bike = await add(marta, 'kidGoal', { member: leo, name: 'Casco nuevo para la bici', target: 3500 })
  await add(marta, 'kidMovement', { member: leo, concept: 'Paga', kind: 'income', amount: 500, date: day(-7) })
  await add(leo, 'kidMovement', { member: leo, concept: 'Para el casco', kind: 'saving', amount: 300, date: day(-6), goal: bike })
  await add(marta, 'document', { title: 'DNI de Marta', kind: 'id', member: marta, issueDate: day(-3640), expiryDate: day(18), location: 'Cajón del despacho' })
  await add(marta, 'document', { title: 'Pasaporte de Leo', kind: 'passport', member: leo, issueDate: day(-900), expiryDate: day(920) })
  await add(marta, 'document', { title: 'Tarjeta sanitaria de Pilar', kind: 'healthCard', member: pilar, location: 'Cartera de Pilar' })
  await add(andres, 'document', { title: 'Seguro del coche', kind: 'insurance', member: andres, issueDate: day(-320), expiryDate: day(45) })
}
