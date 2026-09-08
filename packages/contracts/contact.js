// Canonical storage is punctuation-free; formatting never changes a phone's country code.
export const contactValue = value => String(value ?? '').trim().replace(/[ ()-]/g, '')
export function formatTaxId(value) {
 const digits=contactValue(value)
 return /^\d{13}$/.test(digits)?digits.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/,'$1-$2-$3-$4-$5'):value||''
}
export function formatPhone(value) {
 const digits=contactValue(value)
 if(/^0\d{9}$/.test(digits))return digits.replace(/(\d{3})(\d{3})(\d{4})/,'$1-$2-$3')
 if(/^02\d{7}$/.test(digits))return digits.replace(/(\d{2})(\d{3})(\d{4})/,'$1-$2-$3')
 if(/^0\d{8}$/.test(digits))return digits.replace(/(\d{3})(\d{3})(\d{3})/,'$1-$2-$3')
 if(/^\+66[1-9]\d{7,8}$/.test(digits))return '+66-'+formatPhone('0'+digits.slice(3)).slice(1)
 return value||''
}
export function validateCompanyContact(input) {
 const errors={}
 if(input.taxId&&!/^\d{13}$/.test(contactValue(input.taxId)))errors.taxId='Enter a 13-digit tax ID.'
 if(input.phone&&!/^\+?\d{7,15}$/.test(contactValue(input.phone)))errors.phone='Enter 7–15 digits, with an optional + country code.'
 return errors
}
