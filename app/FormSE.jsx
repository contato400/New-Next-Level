'use client'

import { useEffect } from 'react'

/**
 * Formulário em etapas (modal claro) — substitui o antigo #formModal
 * (embed LeadConnector). Injeta o markup + <style> de /form-se.html e carrega
 * /form-se.js (mesma origem → permitido pela CSP), que expõe
 * `window.abrirFormularioWebinar()`. Os CTAs da página chamam essa função.
 */
export default function FormSE() {
  useEffect(() => {
    // Guard contra dupla execução (reactStrictMode) — evita listeners duplicados.
    if (window.__seFormInit) return
    window.__seFormInit = true

    fetch('/form-se.html')
      .then((r) => r.text())
      .then((html) => {
        const host = document.getElementById('se-form-host')
        if (host) host.innerHTML = html // markup + <style>
        const s = document.createElement('script')
        s.src = '/form-se.js' // 'self' — permitido pelo script-src
        s.defer = true
        document.body.appendChild(s)
      })
      .catch(() => {})
  }, [])

  return <div id="se-form-host" />
}
