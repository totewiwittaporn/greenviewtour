import { useId, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Native dialogs own focus/inertness; Core owns scroll order across their top layers.
const dialogs = []
function syncScrollOwner() {
  document.documentElement.toggleAttribute('data-core-modal-open', dialogs.length > 0)
  for (const dialog of dialogs) dialog.toggleAttribute('data-core-modal-top', dialog === dialogs.at(-1))
}
export function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null), titleId = useId()
  useLayoutEffect(() => {
    const dialog = ref.current, previous = document.activeElement
    dialogs.push(dialog)
    syncScrollOwner()
    dialog.showModal()
    return () => {
      const wasTop = dialogs.at(-1) === dialog
      const index = dialogs.indexOf(dialog)
      if (index !== -1) dialogs.splice(index, 1)
      dialog.close()
      dialog.removeAttribute('data-core-modal-top')
      syncScrollOwner()
      if (wasTop && previous?.isConnected && (!dialogs.length || dialogs.at(-1).contains(previous))) previous.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(<dialog ref={ref} className="core-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy && dialogs.at(-1) === ref.current) onClose() }}>
    <header className="dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></header>
    <div className="dialog-content">{children}</div>
  </dialog>, document.body)
}
