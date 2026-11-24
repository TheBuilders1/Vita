import { toastStore } from '@/store'

const HOUR = 60 * 60 * 1000
let reloading = false

function offerUpdate(worker: ServiceWorker) {
  const apply = () => {
    reloading = true
    worker.postMessage('update', [])
  }
  toastStore.getState().show('Hay una versión nueva de Vita. Al actualizar se recarga la página.', 'success', { label: 'Actualizar', run: apply })
}

/** Permite abrir Vita sin conexión e instalarla. Solo en la versión publicada y con dirección segura. */
export async function setupOffline(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) {
    // Si en esta dirección se abrió antes una versión publicada, taparía lo que se está desarrollando.
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister()
    return
  }
  // Solo se recarga la pestaña en la que se ha pedido: en otra podría haber algo a medio escribir.
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) window.location.reload() })
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
  const remind = () => { if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting) }
  remind()
  registration.addEventListener('updatefound', () => { registration.installing?.addEventListener('statechange', remind) })
  // El aviso se puede pasar por alto: se repite al volver a la pestaña mientras siga pendiente.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') remind() })
  // Puede quedarse abierta días.
  setInterval(() => { registration.update().then(remind).catch(() => undefined) }, 6 * HOUR)
}
