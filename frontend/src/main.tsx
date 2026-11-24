import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { setupOffline } from '@/app/offline'
import '@/styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Falta el elemento #root en index.html')
createRoot(root).render(<StrictMode><App /></StrictMode>)
setupOffline().catch((error: unknown) => console.error('Vita no se podrá abrir sin conexión', error))
