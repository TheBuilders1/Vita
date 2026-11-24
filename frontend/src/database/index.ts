import { VitaDb } from './db'
import { createRepositories } from './repositories'

/** Instancia única de la aplicación. Los tests crean las suyas. */
export const db = new VitaDb()
export const repositories = createRepositories(db)
