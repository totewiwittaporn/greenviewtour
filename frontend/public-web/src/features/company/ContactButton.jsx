import {Button} from '../../core/ui/Controls.jsx'
import {useLocale} from '../../core/useLocale.js'
import {useCompanyContact} from './useCompanyContact.js'
export default function ContactButton({inquiry, children, ...props}) {
  const {t} = useLocale()
  const {openContact} = useCompanyContact()
  return <Button {...props} onClick={() => openContact(inquiry)}>{children || t('ติดต่อทีมงาน')}</Button>
}
