import {useEffect} from 'react'
import {useLocale} from '../../core/useLocale.js'

export default function NotFound(){
  const {locale}=useLocale()
  const english=locale==='en'
  const title=english?'Page not found':'ไม่พบหน้าที่คุณต้องการ'
  useEffect(()=>{
    document.title=title+' | Greenview Tour'
    const meta=document.createElement('meta')
    meta.name='robots';meta.content='noindex'
    document.head.append(meta)
    return()=>meta.remove()
  },[title])
  return <main id="content" className="editorial-page"><div className="editorial-container">
    <p className="section-eyebrow">404</p><h1>{title}</h1>
    <p>{english?'This page is unavailable. Explore our tours or travel information instead.':'หน้านี้ไม่มีอยู่หรือไม่เปิดเผยแพร่ คุณสามารถดูโปรแกรมทัวร์หรือข้อมูลการเดินทางได้'}</p>
    <nav aria-label={english?'Continue exploring':'เลือกหน้าที่ต้องการ'} className="editorial-related"><div>
      <a href="/">{english?'Home':'หน้าแรก'}</a>
      <a href="/tours">{english?'Tours':'โปรแกรมทัวร์'}</a>
      <a href="/information">{english?'Travel information':'ข้อมูลการท่องเที่ยว'}</a>
    </div></nav>
  </div></main>
}
