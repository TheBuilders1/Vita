import test from 'node:test'
import assert from 'node:assert/strict'
import { validSubject } from './commit-msg.mjs'

test('asuntos convencionales, automáticos y límites', () => {
  for (const type of 'feat fix docs style refactor perf test build ci chore revert'.split(' ')) assert.ok(validSubject(type + ': cambio'))
  for (const subject of ['fix(api/v1)!: cambio', 'Merge rama', 'Revert "cambio"', 'fixup! cambio', 'squash! cambio', 'feat: ' + 'a'.repeat(100)]) assert.ok(validSubject(subject))
  for (const subject of ['', 'cambio', 'feat:', 'feat:  cambio', 'fix(): cambio', 'feat: ' + 'a'.repeat(101)]) assert.equal(validSubject(subject), false)
})

test('el hook lee el primer asunto tras comentarios y líneas vacías', async () => {
  const { spawnSync } = await import('node:child_process')
  const { fileURLToPath } = await import('node:url')
  const cli = fileURLToPath(new URL('./commit-msg.mjs', import.meta.url))
  for (const [input, status] of [['# nota\n\nfeat: cambio\n\ncuerpo', 0], ['asunto libre', 1], ['# vacío', 1]]) {
    assert.equal(spawnSync('sh', ['-c', 'printf "%s" "$1" | "$2" "$3" /dev/stdin', 'sh', input, process.execPath, cli]).status, status)
  }
})
