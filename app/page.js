'use client'

import { useEffect, useState, useRef } from 'react'
import FormSE from './FormSE'

export default function Home() {
  const [html, setHtml] = useState('')
  const containerRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    fetch('/content.html')
      .then(res => res.text())
      .then(data => {
        const bodyMatch = data.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        if (bodyMatch) {
          setHtml(bodyMatch[1])
        } else {
          setHtml(data)
        }
      })
  }, [])

  useEffect(() => {
    if (html && containerRef.current && !initialized.current) {
      initialized.current = true

      // Religa os CTAs da página para abrir o NOVO formulário em etapas (FormSE),
      // via window.abrirFormularioWebinar(), em vez do antigo #formModal.
      setTimeout(() => {
        const buttons = document.querySelectorAll('a.elementor-button')
        buttons.forEach(btn => {
          btn.onclick = function(e) {
            e.preventDefault()
            e.stopPropagation()
            if (typeof window.abrirFormularioWebinar === 'function') {
              window.abrirFormularioWebinar()
            }
            return false
          }
        })
      }, 500)
    }
  }, [html])

  return (
    <>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
      <FormSE />
    </>
  )
}
