import { useEffect } from 'react'

/**
 * Si desaparece lo que tenía el foco (una fila borrada, un botón ya pulsado, la pantalla anterior), el navegador lo
 * manda al principio de la página. Aquí pasa al contenedor más cercano que siga existiendo.
 */
export function useFocusGuard() {
  useEffect(() => {
    let path: Element[] = []
    const remember = (e: FocusEvent) => {
      path = []
      for (let node = e.target as Element | null; node && node !== document.body; node = node.parentElement) path.push(node)
    }
    const observer = new MutationObserver(() => {
      if (path[0]?.isConnected !== false || (document.activeElement ?? document.body) !== document.body) return
      // Fuera del contenido (avisos flotantes) no queda nada útil que enfocar.
      const target = path.find((node) => node.isConnected && node.closest('#contenido')) ?? document.getElementById('contenido')
      path = []
      if (target instanceof HTMLElement) focusContainer(target)
    })
    document.addEventListener('focusin', remember)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      document.removeEventListener('focusin', remember)
      observer.disconnect()
    }
  }, [])
}

function focusContainer(target: HTMLElement) {
  const temporary = !target.hasAttribute('tabindex')
  if (temporary) {
    target.tabIndex = -1
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
  }
  target.focus({ preventScroll: true })
}
