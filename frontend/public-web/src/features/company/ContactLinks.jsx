import {safeLineId, safeInstagramUrl} from '../../../../../packages/contracts/contact.js'
export default function ContactLinks({company}) {
  if (!company) return null
  const line = safeLineId(company.lineId)
  const instagram = safeInstagramUrl(company.instagramUrl)
  return <div className="home-contact-links">
    {company.phone && <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>}
    {line && <a href={`https://line.me/R/ti/p/${encodeURIComponent(line)}`} target="_blank" rel="noopener noreferrer">LINE {line}</a>}
    {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
    {company.email && <a href={`mailto:${company.email}`}>{company.email}</a>}
  </div>
}
