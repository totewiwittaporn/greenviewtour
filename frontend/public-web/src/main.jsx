import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './core/ui/styles.css'
import {LocaleProvider} from './core/Locale.jsx'
import App from './app/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LocaleProvider><App /></LocaleProvider>
  </StrictMode>,
)
