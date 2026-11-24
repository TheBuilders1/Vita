import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const types = 'feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert'
const pattern = new RegExp(`^(${types})(\\([\\w./-]+\\))?!?: \\S.{0,99}$`)

export function validSubject(s) {
  return /^(Merge |Revert "|fixup! |squash! )/.test(s) || pattern.test(s)
}

if (import.meta.main) {
  const [arg, range, extra] = process.argv.slice(2)
  if (!arg || extra || (arg === '--range' ? !range || range.startsWith('-') : range)) {
    console.error('Uso: node tools/commit-msg.mjs <archivo> | --range <base>..<head>')
    process.exitCode = 2
  } else {
    const messages = arg === '--range'
      ? execFileSync('git', ['log', '--format=%h %s', range, '--'], { encoding: 'utf8' }).split('\n').filter(Boolean)
      : ['nuevo ' + (readFileSync(arg, 'utf8').split('\n').find(line => line.trim() && !line.startsWith('#')) ?? '').trim()]
    const bad = messages.filter(line => !validSubject(line.slice(line.indexOf(' ') + 1)))
    if (bad.length) {
      console.error(['Usa el formato tipo(ámbito): descripción de 1 a 100 caracteres.', ...bad].join('\n'))
      process.exitCode = 1
    } else console.log(`${messages.length} mensaje(s) de commit válidos`)
  }
}
