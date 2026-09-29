import {translateLabel as bilingualLabel} from '../i18n/runtime.js'

export function FormSection({title,description,actions,children}){
 return <section className="core-form-section panel">
  <header><div><h2>{bilingualLabel(title)}</h2>{description&&<p>{description}</p>}</div>{actions&&<div className="core-form-section-actions">{actions}</div>}</header>
  <div className="core-form-section-body">{children}</div>
 </section>
}
export function FormGrid({children,columns=2}){return <div className="core-form-grid" data-columns={columns}>{children}</div>}
export function FormEmpty({children}){return <p className="core-form-empty">{children}</p>}