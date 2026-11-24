import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { useFile } from '@/hooks/useFile'
import { getModule, getRecordType } from '@/modules/registry'
import { filesOf } from '@/services/integrity'
import { recordLines } from '@/services/share'
import { recordTitle, titleContext } from '@/services/titles'
import type { FamilyRecord } from '@/types/records'

/** La ficha en papel: los datos, las fotos y el nombre de lo que no se puede imprimir aquí. */
export function PrintableRecord({ record }: { record: FamilyRecord }) {
  const { members, records } = useHome()
  const context = titleContext(members, records)
  return (
    <>
      <h1>{recordTitle(record, context)}</h1>
      <p>{getRecordType(record.typeId).name}, en {getModule(record.moduleId).name}</p>
      <dl>
        {recordLines(record, context).map(({ label, text }) => <div key={label} style={{ marginTop: '4mm' }}><dt><strong>{label}</strong></dt><dd style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{text}</dd></div>)}
      </dl>
      {filesOf(record.typeId, record.data).map((id) => <PrintableFile key={id} id={id} />)}
    </>
  )
}

function PrintableFile({ id }: { id: string }) {
  const { file, url } = useFile(id)
  const [failed, setFailed] = useState(false)
  if (file === null) return null
  if (!file || !url) return <span data-pending="" />
  if (failed) return <p style={{ marginTop: '4mm' }}>Esta foto no se ha podido imprimir: {file.name}</p>
  if (!file.mime.startsWith('image/')) return <p style={{ marginTop: '4mm' }}>Archivo aparte: {file.name}</p>
  return <img src={url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '220mm', marginTop: '6mm' }} onError={() => setFailed(true)} />
}
