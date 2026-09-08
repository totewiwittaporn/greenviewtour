import { useEffect, useId, useRef } from 'react'
export function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null), trigger = useRef(document.activeElement), titleId = useId()
  useEffect(() => { const dialog = ref.current, previous = trigger.current; dialog.showModal(); return () => { dialog.close(); if (previous?.isConnected) previous.focus() } }, [])
  return <dialog ref={ref} className="core-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></header>
    <div className="dialog-content">{children}</div>
  </dialog>
}
