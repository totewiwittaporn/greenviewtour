import React from 'react'
import {createRoot} from 'react-dom/client'
import {LocaleProvider} from './core/LocaleProvider.jsx'
import App from './features/App.jsx'
import './core/styles.css'
createRoot(document.getElementById('root')).render(<React.StrictMode><LocaleProvider><App/></LocaleProvider></React.StrictMode>)
