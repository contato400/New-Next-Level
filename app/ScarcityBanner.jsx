'use client'

import { useEffect } from 'react'

/**
 * Banner de escassez (topbar de vagas) + notificações de prova social.
 * Injeta o markup + <style> de /banner-se.html e carrega /banner-se.js
 * (mesma origem → permitido pela CSP). Renderizado no layout, global à página.
 */
export default function ScarcityBanner() {
  useEffect(() => {
    if (window.__seBannerInit) return
    window.__seBannerInit = true

    fetch('/banner-se.html')
      .then((r) => r.text())
      .then((html) => {
        const host = document.getElementById('se-banner-host')
        if (host) host.innerHTML = html // topbar + notificação + <style>
        const s = document.createElement('script')
        s.src = '/banner-se.js' // 'self' — permitido pelo script-src
        s.defer = true
        document.body.appendChild(s)
      })
      .catch(() => {})
  }, [])

  return <div id="se-banner-host" />
}
