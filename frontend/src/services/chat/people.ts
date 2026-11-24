import type { Member } from '@/types/family'
import { plain, without, type Phrase } from './when'

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Como palabra entera: «Leo» no está en «Leonardo». */
const word = (name: string) => `(?<![a-z0-9ñ])${escape(plain(name))}(?![a-z0-9ñ])`

export const mentioned = (text: string, members: readonly Member[]): Member[] => members.filter((m) => new RegExp(word(m.name)).test(text))

/** Nombres que comparten varias personas: no se elige por nadie. */
export const ambiguousNames = (found: readonly Member[]): string[] =>
  [...new Set(found.filter((m) => found.some((o) => o.id !== m.id && plain(o.name) === plain(m.name))).map((m) => m.name))]

export const withoutPerson = (text: Phrase, member: Member, prepositions: string): Phrase => without(text, new RegExp(`(?:\\b(?:${prepositions}) )${word(member.name)}`))
