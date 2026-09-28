import {useLocale} from '../../core/i18n/locale.jsx'
export default function BookingCommission({booking}) {
 const {locale}=useLocale(),th=locale==='th',snapshot=booking?.commissionSnapshot
 const copy=(en,thai)=>th?thai:en
 const money=value=>value==null?copy('Not configured','ยังไม่ได้กำหนด'):new Intl.NumberFormat(th?'th-TH':'en-GB',{style:'currency',currency:'THB'}).format(Number(value))
 const status=!snapshot?copy('No recorded commission conditions','ยังไม่มีเงื่อนไขค่าคอมที่บันทึกไว้'):snapshot.status==='NO_COMMISSION'?copy('No commission','ไม่มีค่าคอมมิชชั่น'):snapshot.status==='RATE_NOT_CONFIGURED'?copy('Commission eligible — rate not configured','มีสิทธิ์ค่าคอม — ยังไม่ได้กำหนดอัตรา'):copy('Estimated commission','ค่าคอมมิชชั่นโดยประมาณ')
 const beneficiary=snapshot?.beneficiaryId?(booking?.commissionBeneficiary?.displayName||booking?.commissionBeneficiary?.name||copy('Recorded Booking staff member','พนักงาน Booking ที่บันทึกไว้')):copy('Not assigned','ยังไม่ได้กำหนด')
 return <section className="panel booking-commission" aria-label={copy('Booking staff commission','ค่าคอมมิชชั่นพนักงาน Booking')}>
  <h3>{copy('Booking staff commission','ค่าคอมมิชชั่นพนักงาน Booking')}</h3><p><strong>{status}</strong></p>
  {snapshot&&<dl className="catalog-details">
   <div><dt>{copy('Amount','จำนวนเงิน')}</dt><dd>{money(snapshot.amount)}</dd></div>
   <div><dt>{copy('Per adult','ต่อผู้ใหญ่')}</dt><dd>{money(snapshot.adultRate)}</dd></div>
   <div><dt>{copy('Per child','ต่อเด็ก')}</dt><dd>{money(snapshot.childRate)}</dd></div>
   <div><dt>{copy('Commission beneficiary','ผู้ได้รับค่าคอมมิชชั่น')}</dt><dd>{beneficiary}</dd></div>
  </dl>}
  <p>{copy('Saved conditions apply to this booking. Agent or tour program marked no commission overrides eligibility. This is an estimate, not a payment record.','ใช้เงื่อนไขที่บันทึกไว้ใน Booking นี้ หาก Agent หรือโปรแกรมทัวร์ระบุไม่มีค่าคอม ให้ไม่มีค่าคอม ยอดนี้เป็นยอดประมาณการ ยังไม่ใช่รายการจ่ายเงิน')}</p>
 </section>
}
