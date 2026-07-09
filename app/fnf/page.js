'use client'

import { useEffect, useRef } from 'react'

/**
 * Rota de PREVIEW isolada (/fnf) — carrega o formulário FNF (modal) e já
 * ABRE ele automaticamente, para você ver como fica ao clicar no botão do
 * site. Reaproveita /form-se.html (markup + <style>) e /form-se.js (script).
 */
export default function FnfPreview() {
  const hostRef = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    fetch('/form-se.html')
      .then((r) => r.text())
      .then((html) => {
        if (hostRef.current) hostRef.current.innerHTML = html // markup + <style>
        const s = document.createElement('script')
        s.src = '/form-se.js'
        s.defer = true
        s.onload = () => {
          // Abre o modal automaticamente no preview.
          if (typeof window.abrirFormularioWebinar === 'function') {
            window.abrirFormularioWebinar()
          }
        }
        document.body.appendChild(s)
      })
      .catch(() => {})
  }, [])

  return <div ref={hostRef} />
}
