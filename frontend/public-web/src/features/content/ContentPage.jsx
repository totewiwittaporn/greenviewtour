import {useLayoutEffect} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {publicInfoRoutes} from '../../core/publicRoutes.js'
import CompanyLocation from '../company/CompanyLocation.jsx'
import {contentPages, editorialCopy} from './pages.js'
import './content.css'

export default function ContentPage({pathname, hash = ''}) {
  const {locale} = useLocale()
  const language = locale === 'en' ? 'en' : 'th'
  const page = contentPages[pathname]
  const meta = publicInfoRoutes[pathname]
  const copy = key => editorialCopy[key][language]
  useLayoutEffect(() => {
    if (!page?.faq || !hash) return
    let id
    try { id = decodeURIComponent(hash.slice(1)) } catch { return }
    const target = document.getElementById(id)
    if (target?.tagName === 'DETAILS') target.open = true
  }, [page?.faq, hash])
  if (!page || !meta) return null
  const paragraphs = section => section.paragraphs[language].map((text, index) => <p key={index}>{text}</p>)
  return <main id="content" className="editorial-page">
    <div className="editorial-container editorial-hero">
      <div className="editorial-intro"><nav className="editorial-breadcrumb" aria-label={copy('guide')}><a href="/">{copy('home')}</a><span aria-hidden="true">/</span><span>{meta.title[language]}</span></nav><p className="section-eyebrow">GREENVIEW TOUR</p><h1>{meta.title[language]}</h1><p className="editorial-lead">{meta.description[language]}</p><a href="/tours" className="public-button">{copy('tours')} <span aria-hidden="true">→</span></a></div>
      <figure><img src={`/images/home/${page.image}`} alt={copy('photo')} width="1448" height="1086" fetchPriority="high"/><figcaption>{copy('photo')}</figcaption></figure>
    </div>
    <div className="editorial-container editorial-layout">
      <aside className="editorial-sidebar"><nav aria-labelledby="editorial-contents"><h2 id="editorial-contents">{copy('contents')}</h2>{page.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title[language]}</a>)}{page.contact && <a href="#company">{publicInfoRoutes['/contact-us'].title[language]}</a>}</nav></aside>
      <article className="editorial-body" aria-label={meta.title[language]}>
        <p className="editorial-reviewed">{page.reviewed?.[language]||copy('updated')}</p>
        {page.sections.map(section => page.faq
          ? <details className="editorial-faq" id={section.id} key={section.id}><summary>{section.title[language]}</summary><div>{paragraphs(section)}</div></details>
          : <section id={section.id} key={section.id}><h2>{section.title[language]}</h2>{paragraphs(section)}</section>)}
        <p className="editorial-notice">{copy('notice')}</p>
        {page.source && <p className="editorial-source"><a href={page.source} target="_blank" rel="noreferrer">{copy('source')} ↗</a></p>}
        <a className="home-text-link editorial-home-link" href={`/#${page.homeAnchor}`}>{copy('overview')} <span aria-hidden="true">↗</span></a>
      </article>
    </div>
    {page.contact && <CompanyLocation/>}
    <nav className="editorial-container editorial-related" aria-labelledby="editorial-related"><h2 id="editorial-related">{copy('related')}</h2><div>{Object.entries(publicInfoRoutes).filter(([path]) => path !== pathname).map(([path, info]) => <a key={path} href={path}><span>{info.title[language]}</span><span aria-hidden="true">→</span></a>)}</div></nav>
  </main>
}
