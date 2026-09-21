import { useEffect, useRef, useState } from 'react'

// Shared non-modal disclosure behavior for navigation and language choices.
export function useDisclosure() {
  const [open, setOpen] = useState(false)
  const container = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!open) return
    const outside = event => { if (!container.current?.contains(event.target)) setOpen(false) }
    const escape = event => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return { open, setOpen, container, trigger }
}
