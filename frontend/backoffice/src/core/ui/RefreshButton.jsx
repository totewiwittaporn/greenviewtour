import {useLocale} from '../i18n/locale.jsx'
import {Button} from './Button.jsx'
import {Icon} from './Icon.jsx'
export function RefreshButton({label='Refresh',onClick,...props}){
 const {t}=useLocale()
 return <Button {...props} onClick={onClick}><Icon name="refresh"/>{t(label)}</Button>
}
