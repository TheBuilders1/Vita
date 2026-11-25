const entities = [
  ['correos', 'correos.es'], ['aeat', 'aeat.es', 'agenciatributaria.gob.es', 'agenciatributaria.es'],
  ['hacienda', 'hacienda.gob.es', 'agenciatributaria.gob.es'], ['seguridadsocial', 'seg-social.es', 'seg-social.gob.es'],
  ['dgt', 'dgt.es', 'dgt.gob.es'], ['amazon', 'amazon.es', 'amazon.com'], ['bbva', 'bbva.es', 'bbva.com'],
  ['santander', 'bancosantander.es', 'santander.com'], ['caixabank', 'caixabank.es'], ['sabadell', 'bancsabadell.com'],
  ['bankinter', 'bankinter.com'], ['unicaja', 'unicajabanco.es'], ['paypal', 'paypal.com'],
] as const

const countries = [
  ['34', 'España'], ['351', 'Portugal'], ['33', 'Francia'], ['44', 'Reino Unido'], ['49', 'Alemania'],
  ['39', 'Italia'], ['1', 'Estados Unidos, Canadá y otros territorios'], ['52', 'México'],
  ['54', 'Argentina'], ['57', 'Colombia'], ['51', 'Perú'],
] as const

function similar(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1 || b.length < 4) return false
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2))
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

const phoneFormats: Readonly<Record<string, RegExp>> = {
  '34': /^[6789]\d{8}$/, '33': /^[1-9]\d{8}$/, '351': /^\d{9}$/, '1': /^[2-9]\d{9}$/,
  '52': /^\d{10}$/, '57': /^\d{10}$/,
}

function phone(input: string) {
  const number = input.replace(/[\s().-]/g, '').replace(/^00/, '+')
  const international = number.startsWith('+')
  const country = international ? countries.find(([prefix]) => number.startsWith('+' + prefix)) : countries[0]
  const local = international && country ? number.slice(country[0].length + 1) : number
  const signals: string[] = []
  const format = country && phoneFormats[country[0]]
  if (format ? !format.test(local) : !/^\+?[1-9]\d{6,14}$/.test(number)) signals.push('El número no tiene el formato esperado. Revisa las cifras.')
  if (country?.[0] === '34' && /^(905|80[367])/.test(local)) signals.push('Es un número de tarificación especial. Llamar puede costar más.')
  return { channel: 'call' as const, signals, detail: country ? `Prefijo +${country[0]} (${country[1]}).` : 'El prefijo no está en nuestra lista.' }
}

export function checkContact(raw: string) {
  const input = raw.trim()
  const parts = input.split('.')
  const ipv4 = parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  if (!ipv4 && /^[+\d(][\d\s()+.-]*$/.test(input)) return phone(input)
  const address = input.match(/^(?:([^<>]*)<([^<>]+)>|([^\s<>:/?#]+@[^\s<>:/?#]+))$/)
  const email = address?.[2] ?? address?.[3]
  const channel = email ? 'email' : 'web'
  const signals: string[] = []
  const domain = email?.split('@')[1]
  const url = URL.parse(email ? 'https://' + (domain ?? '') : /^[a-z][a-z\d+.-]*:/i.test(input) ? input : 'https://' + input)
  const host = url?.hostname.toLowerCase().replace(/\.$/, '') ?? ''
  const labels = host.split('.')
  if (!url || !['http:', 'https:'].includes(url.protocol) || (!host.includes('.') && !host.startsWith('[')) ||
      (email && (!/^[^\s@<>]+@[^\s@<>/:?#]+$/.test(email) || !domain?.includes('.')))) {
    signals.push('No reconocemos el formato. Comprueba que has copiado la dirección completa.')
    return { channel, signals, detail: '' }
  }
  if (url.protocol === 'http:') signals.push('Empieza por http, sin la s. La conexión no está cifrada.')
  if (url.username || url.password) signals.push('El texto que aparece antes de la arroba puede ocultar la web de destino.')
  if (labels.some((label) => label.startsWith('xn--'))) signals.push('El dominio contiene letras codificadas que pueden parecerse a otras.')
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith('[')) signals.push('Usa una dirección IP en lugar del nombre de una web.')
  if (['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'cutt.ly', 'is.gd'].includes(host)) signals.push('Es un enlace acortado. Oculta la página a la que lleva.')
  if (['xyz', 'top', 'click', 'zip', 'mov', 'tk', 'work'].includes(labels.at(-1) ?? '')) signals.push('La terminación del dominio es poco habitual. Comprueba quién lo envía.')
  if (labels.length >= 5 && labels.slice(0, -2).some((label) => /^(cuenta|acceso|login|verificar|pago)$/.test(label))) {
    signals.push('Encadena varios subdominios con palabras de acceso o pago. Comprueba el nombre completo.')
  }
  const claimed = (address?.[1] ?? '') + ' ' + (email?.split('@')[0] ?? '')
  for (const [name, ...domains] of entities) {
    if (domains.some((d) => host === d || host.endsWith('.' + d))) continue
    const names = [name, ...domains.map((d) => d.split('.')[0]!)]
    const resembles = labels.some((label) => names.some((n) => label.replaceAll('-', '').includes(n.replaceAll('-', '')) || similar(label, n)))
    if (resembles || claimed.toLowerCase().replace(/[\s-]/g, '').includes(name)) {
      signals.push(`El nombre recuerda a ${name}, pero el dominio no coincide con el habitual (${domains[0]}).`)
      break
    }
  }
  const free = email && ['gmail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'yahoo.es', 'yahoo.com', 'icloud.com'].includes(host)
  if (free) signals.push('Es un correo gratuito que cualquiera puede abrir. Si dice venir de una entidad, comprueba el remitente.')
  return { channel, signals, detail: `Dominio que has copiado: ${host}.` }
}
