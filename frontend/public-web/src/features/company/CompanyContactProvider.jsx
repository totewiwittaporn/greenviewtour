import {useCallback, useEffect, useId, useRef, useState} from 'react'
import {Button, Dialog} from '../../core/ui/Controls.jsx'
import {useLocale} from '../../core/useLocale.js'
import {CompanyContactContext} from './useCompanyContact.js'
import {inquiryMessage} from './inquiry.js'
import ContactLinks from './ContactLinks.jsx'
import './contact.css'
export default function CompanyContactProvider({children}) {
  const {t, locale} = useLocale()
  const [state, setState] = useState({loading: true})
  const [attempt, setAttempt] = useState(0)
  const [inquiry, setInquiry] = useState(null)
  const [copy, setCopy] = useState('')
  const messageRef = useRef(null), messageId = useId()
  const refresh = useCallback(() => setAttempt(value => value + 1), [])
  const openContact = useCallback((value = {}) => { setInquiry(value); setCopy(''); refresh() }, [refresh])
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => { setState({error: true}); controller.abort() }, 15000)
    setState({loading: true})
    fetch('/api/public/company', {signal: controller.signal, cache: 'no-store'})
      .then(async response => { if (!response.ok) throw Error(); return response.json() })
      .then(data => { if (!controller.signal.aborted) setState({company: data.company}) })
      .catch(() => { if (!controller.signal.aborted) setState({error: true}) })
      .finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort() }
  }, [attempt])
  const message = inquiryMessage(inquiry || {}, locale)
  async function copyMessage() {
    setCopy('busy')
    try { await navigator.clipboard.writeText(message); setCopy('done') }
    catch { setCopy('failed'); messageRef.current?.focus(); messageRef.current?.select() }
  }
  return <CompanyContactContext.Provider value={{state, refresh, openContact}}>{children}
    {inquiry !== null && <Dialog title={t('ติดต่อทีมงาน')} closeLabel={t('ปิดหน้าต่างติดต่อ')} onClose={() => setInquiry(null)}>
      <div className="contact-inquiry">
        <p>{t('เลือกช่องทางติดต่อและส่งข้อความสอบถามให้ทีมงาน')}</p>
        {state.loading ? <p role="status">{t('กำลังโหลดข้อมูลบริษัท…')}</p> : state.error ? <div><p role="alert">{t('ยังโหลดข้อมูลบริษัทไม่ได้')}</p><Button onClick={refresh}>{t('ลองอีกครั้ง')}</Button></div> : <>
          <ContactLinks company={state.company}/>
          {!['phone', 'email', 'lineId', 'instagramUrl'].some(key => state.company?.[key]) && <p>{t('ข้อมูลติดต่อจะอัปเดตเร็ว ๆ นี้')}</p>}
        </>}
        <label htmlFor={messageId}>{t('ข้อความสอบถาม')}</label>
        <textarea id={messageId} ref={messageRef} readOnly value={message} rows={8}/>
        <Button disabled={copy === 'busy'} onClick={copyMessage}>{t('คัดลอกข้อความสอบถาม')}</Button>
        <p role="status">{copy === 'done' ? t('คัดลอกแล้ว นำไปวางในแชตกับทีมงานได้เลย') : copy === 'failed' ? t('คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกข้อความที่เลือกไว้ด้วยตนเอง') : t('การสอบถามยังไม่ใช่การยืนยันการจอง')}</p>
      </div>
    </Dialog>}
  </CompanyContactContext.Provider>
}
