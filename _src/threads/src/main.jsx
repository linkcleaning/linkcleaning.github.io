import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {})
  })
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloaded && hadController) { reloaded = true; location.reload() }
  })
}
