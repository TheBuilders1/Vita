import { useState } from 'react'
import { cx } from '@/utils/cx'

interface AvatarProps { readonly name: string; readonly photo?: string; readonly size?: 'sm' | 'md' }

export function Avatar({ name, photo, size = 'md' }: AvatarProps) {
  const [failedPhoto, setFailedPhoto] = useState<string>()
  const words = name.normalize().match(/\p{L}+/gu) ?? []
  const initials = [...words.slice(0, 2).map((word) => [...word][0]).join('').toLocaleUpperCase('es')].slice(0, 2).join('')
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center overflow-hidden bg-beige leading-none font-bold text-tinta', size === 'sm' ? 'size-7 text-xs' : 'size-14 text-lg')}>
      {photo && photo !== failedPhoto ? <img src={photo} alt="" className="absolute inset-0 size-full object-cover" onError={() => setFailedPhoto(photo)} /> : initials || '·'}
    </span>
  )
}
