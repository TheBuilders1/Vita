const quantities: Readonly<Record<string, number>> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 }

export function parseShopping(text: string) {
  return text.split(/[,;\n]|\s+y\s+/i).map((part) => part.trim().replace(/[.!?]+$/, '').trim()).filter(Boolean).map((name) => {
    const match = /^(\d+|un|una|dos|tres|cuatro|cinco)\s+(?:(kilos?|gramos?|litros?|paquetes?|botellas?)\s+de\s+)?(.+)$/i.exec(name)
    if (!match) return { name }
    const [, amount, unit, product] = match
    return { name: product!, quantity: quantities[amount!.toLowerCase()] ?? Number(amount), ...(unit && { unit }) }
  })
}
