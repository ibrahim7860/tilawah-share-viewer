import React from 'react'
import ReactDOM from 'react-dom/client'
// UI chrome font (app parity: Be Vietnam Pro 400/600/700), self-hosted —
// no external font CDN requests. Quran glyph fonts load per-page elsewhere.
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
