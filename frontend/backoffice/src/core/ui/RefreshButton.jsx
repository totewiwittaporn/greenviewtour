import {Button} from './Button.jsx'
import {Icon} from './Icon.jsx'
export function RefreshButton({label='Refresh',onClick,...props}){
 return <Button {...props} onClick={onClick}><Icon name="refresh"/>{label}</Button>
}
