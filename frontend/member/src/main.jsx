import React,{Suspense,lazy} from 'react'
import {createRoot} from 'react-dom/client'
import {LocaleProvider} from './core/LocaleProvider.jsx'
import MemberPaused from './features/MemberPaused.jsx'
import './core/styles.css'
// Retained Member workflows are available only to the explicit local regression build.
const App=import.meta.env.DEV&&import.meta.env.MODE==='member-regression'?lazy(()=>import('./features/App.jsx')):MemberPaused
createRoot(document.getElementById('root')).render(<React.StrictMode><LocaleProvider><Suspense fallback={<p role="status">Greenview Tour…</p>}><App/></Suspense></LocaleProvider></React.StrictMode>)
