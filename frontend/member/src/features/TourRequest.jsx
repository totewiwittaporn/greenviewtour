import { useLocale, t as msg, formatNumber, formatMoney } from "../core/locale.js";import LeaveGuard from '../core/LeaveGuard.jsx';
import { useEffect, useRef, useState } from 'react';
import { Button, Field, Select, Notice } from '../core/ui.jsx';
import { api, errorText } from '../core/api.js';
const money = formatMoney;
export default function TourRequest({ tour, customer }) {useLocale();
  const params = new URLSearchParams(location.search);
  const [date, setDate] = useState(''),[adults, setAdults] = useState('1'),[children, setChildren] = useState('0'),[promotionId, setPromotion] = useState(params.get('promotion') || '');
  const [optionalIds, setOptionalIds] = useState([]),[name, setName] = useState(customer?.displayName || ''),[phone, setPhone] = useState(customer?.phone || '');
  const [allergyStatus, setAllergyStatus] = useState(''),[allergies, setAllergies] = useState(''),[quote, setQuote] = useState(null),[quoteError, setQuoteError] = useState(''),[quoteBusy, setQuoteBusy] = useState(false);
  const [busy, setBusy] = useState(false),[notice, setNotice] = useState(''),[sent, setSent] = useState(false),[accepted, setAccepted] = useState(false),request = useRef(null),lock = useRef(false);
  const selectionKey = JSON.stringify({ date, adults, children, promotionId, optionalIds });
  useEffect(() => {
    setQuote(null);setAccepted(false);setQuoteError('');setQuoteBusy(false);
    if (!date || !Number.isInteger(Number(adults)) || Number(adults) < 1 || !Number.isInteger(Number(children)) || Number(children) < 0) return;
    const c = new AbortController();setQuoteBusy(true);
    const p = new URLSearchParams({ tourId: tour.id, serviceDate: date, adults, children, promotionId });for (const id of optionalIds) p.append('optionalId', id);
    api('/api/public/quote?' + p, undefined, c.signal).then((r) => {if (!c.signal.aborted) {setQuote({ ...r, selectionKey });setQuoteBusy(false);}}).catch((e) => {if (!c.signal.aborted) {setQuoteError(errorText(e));setQuoteBusy(false);}});
    return () => c.abort();
  }, [tour.id, date, adults, children, promotionId, optionalIds, selectionKey]);
  async function send(e) {
    e.preventDefault();if (lock.current) return;
    if (!quote || quote.selectionKey !== selectionKey || !accepted || !name.trim() || !phone.trim() || !allergyStatus || allergyStatus === 'HAS' && !allergies.trim()) {setNotice(msg("ตรวจราคา กรอกข้อมูลติดต่อและการแพ้อาหาร แล้วเลือกยืนยันเงื่อนไขก่อนส่งคำขอ"));return;}
    const values = { tourId: tour.id, serviceDate: date, adults: Number(adults), children: Number(children), promotionId: promotionId || null, optionalIds, name, phone, allergyStatus, allergies, quoteKey: quote.quoteKey };
    const signature = JSON.stringify(values);if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    lock.current = true;setBusy(true);setNotice('');
    try {await api('/api/member/requests', { ...values, id: request.current.id });setSent(true);setNotice(msg("ส่งคำขอแล้ว ดูสถานะได้ในทริปของฉัน"));}
    catch (e) {setNotice(errorText(e));} finally {setBusy(false);lock.current = false;}
  }
  if (!customer) return <a href={'/login?next=' + encodeURIComponent(location.pathname + location.search)}>{msg("เข้าสู่ระบบเพื่อส่งคำขอจอง")}</a>;
  return <section className="panel"><LeaveGuard dirty={!sent && Boolean(date)} /><h2>{msg("เลือกวันและส่งคำขอจอง")}</h2><p>{tour.demoCheckoutEnabled ? msg("DEMO · ส่งคำขอแล้วไปที่ทริปของฉัน เพื่อจำลองชำระ ยืนยัน Booking และดูข้อความ LINE โดยไม่ใช้เงินจริง") : msg("ทีมงานจะตรวจสอบที่ว่างก่อนยืนยัน กรุณารอการยืนยันก่อนชำระเงิน")}</p><form noValidate onSubmit={send}>
 <div className="fields"><Field label={msg("วันเดินทาง")} type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={sent || busy} /><Field label={msg("ผู้ใหญ่")} type="number" min={1} max={100} value={adults} onChange={(e) => setAdults(e.target.value)} disabled={sent || busy} /><Field label={msg("เด็ก")} type="number" min={0} max={99} value={children} onChange={(e) => setChildren(e.target.value)} disabled={sent || busy} /></div>
 <Select label={msg("ราคา / โปรโมชั่น")} value={promotionId} onChange={(e) => setPromotion(e.target.value)} disabled={sent || busy}><option value="">{msg("ราคาปกติ")}</option>{tour.promotions.map((p) => <option key={p.id} value={p.id} disabled={p.remaining === 0}>{p.name} {p.remaining === 0 ? msg("(สิทธิ์เต็มแล้ว)") : ''}</option>)}</Select>
 {tour.components?.length > 0 && <fieldset><legend>{msg("บริการซื้อเพิ่ม")}</legend>{tour.components.map((c) => <label className="check" key={c.id}><input type="checkbox" checked={optionalIds.includes(c.id)} disabled={sent || busy} onChange={(e) => setOptionalIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id))} />{c.resource.name}</label>)}<p>{msg("จำนวนและยอดบริการคำนวณตามผู้เดินทางและวันใช้บริการด้านล่าง")}</p></fieldset>}
 <section aria-live="polite" className="quote-panel">{quoteBusy ? <p>{msg("กำลังตรวจสอบราคา…")}</p> : quoteError ? <Notice error>{quoteError}</Notice> : quote ? <><h3>{msg("ยอดตามคำขอ")} {money(quote.packageTotal)}</h3><p>{msg("ผู้ใหญ่")} {formatNumber(adults)} × {money(quote.adultPrice)}{Number(children) > 0 ? ` · ${msg("เด็ก")} ${formatNumber(children)} × ${money(quote.childPrice)}` : ''}</p>{quote.components.filter((c) => c.selected && !c.included).map((c) => <p key={c.componentId}>{c.name} · {formatNumber(c.quantity)} × {money(c.unitPrice)}</p>)}{quote.promotion && <p>{quote.promotion.name} · {quote.promotion.terms}</p>}<p>{quote.terms.fees}</p><p>{quote.terms.cancellationTerms}</p><p>{msg("ราคานี้ยังไม่กันที่นั่ง จนกว่าทีมงานจะตรวจและยืนยันคำขอ")}</p></> : <p>{msg("เลือกวันและจำนวนผู้เดินทางเพื่อตรวจสอบราคา")}</p>}</section>
 <Field label={msg("ชื่อผู้ติดต่อ")} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} disabled={sent || busy} /><Field label={msg("โทรศัพท์")} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} disabled={sent || busy} />
 <Select label={msg("การแพ้อาหารของผู้เดินทาง")} value={allergyStatus} onChange={(e) => setAllergyStatus(e.target.value)} disabled={sent || busy}><option value="">{msg("กรุณาเลือก")}</option><option value="NONE">{msg("ไม่มีผู้เดินทางแพ้อาหาร")}</option><option value="HAS">{msg("มีผู้เดินทางแพ้อาหาร")}</option></Select>{allergyStatus === 'HAS' && <Field label={msg("อาหารที่แพ้และผู้เดินทางที่เกี่ยวข้อง")} value={allergies} onChange={(e) => setAllergies(e.target.value)} maxLength={2000} disabled={sent || busy} />}
 <label className="check"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={!quote || sent || busy} />{msg("ฉันตรวจวันเดินทาง ราคา และเงื่อนไขที่แสดงแล้ว")}</label>
 <Notice>{notice}</Notice><Button type="submit" disabled={busy || sent || !quote || quoteBusy} busy={busy}>{msg("ส่งคำขอจอง")}</Button>{sent && <a href="/">{msg("ดูทริปของฉัน →")}</a>}
 </form></section>;
}
