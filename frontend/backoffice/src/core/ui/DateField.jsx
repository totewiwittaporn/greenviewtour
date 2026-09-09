import { FormField } from './FormField.jsx'
// Calendar presentation follows the user's browser/OS; stored values remain ISO dates.
export function DateField(props) { return <FormField {...props} type="date" /> }
