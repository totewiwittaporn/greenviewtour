import {useLocale} from '../../core/useLocale.js'
import {tourDirectPrice} from './tourPresentation.js'

export default function DirectPriceTable({tour}){
 const {locale,money,t}=useLocale(),english=locale==='en'
 const price=tourDirectPrice(tour)
 const display=value=>value==null?t('สอบถามราคา'):money(value)
 return <div className="tour-direct-prices">
  <h3>{english?'Prices per person':'ราคาต่อคน'}</h3>
  <div className="tour-price-table-scroll"><table>
   <caption>{english?'THB per person':'บาทต่อคน'}</caption>
   <thead><tr><th scope="col">{t('ผู้ใหญ่')}</th><th scope="col">{t('เด็ก')}</th></tr></thead>
   <tbody><tr><td>{display(price.adultPrice)}</td><td>{display(price.childPrice)}</td></tr></tbody>
  </table></div>
 </div>
}
