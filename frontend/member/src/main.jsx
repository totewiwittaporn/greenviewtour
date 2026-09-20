import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './features/App.jsx'
import './core/styles.css'
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
