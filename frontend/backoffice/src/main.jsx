import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './core/ui/styles.css'
import App from './app/App.jsx'
import {LocaleProvider} from './core/i18n/locale.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider><App /></LocaleProvider>
  </StrictMode>,
)
