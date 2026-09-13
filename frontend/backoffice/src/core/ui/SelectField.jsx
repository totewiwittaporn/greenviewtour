import { Children, isValidElement, useCallback, useId, useState } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
// Radix owns selection semantics; Backoffice Core owns the shared popup appearance.
const emptyValue = '__greenview_empty__'
export function SelectField({ label, error, hint, children, value, onChange, disabled, name, required }) {
  const id = useId(), [host, setHost] = useState(null), [keyboard, setKeyboard] = useState(false)
  const mount = useCallback(node => { if (node) setHost(node.closest('dialog') || document.body) }, [])
  const options = Children.toArray(children).filter(isValidElement).map(child => ({ value: String(child.props.value ?? child.props.children), label: child.props.children, disabled: child.props.disabled }))
  return <div className="form-field" ref={mount}><label htmlFor={id}>{label}</label><div className="field-control">
    <SelectPrimitive.Root value={value === '' ? emptyValue : value} onValueChange={next => onChange({ target: { value: next === emptyValue ? '' : next } })} disabled={disabled} name={name} required={required}>
      <SelectPrimitive.Trigger id={id} className="core-select-trigger" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} onPointerDown={() => setKeyboard(false)} onKeyDown={() => setKeyboard(true)}>
        <SelectPrimitive.Value /><SelectPrimitive.Icon aria-hidden="true">⌄</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={host}>
        <SelectPrimitive.Content className="core-dropdown core-select-popup" position="popper" sideOffset={6} align="start" collisionPadding={8} data-keyboard={keyboard || undefined} onKeyDown={() => setKeyboard(true)} onPointerMove={() => setKeyboard(false)} onEscapeKeyDown={event => event.stopPropagation()}>
          <SelectPrimitive.Viewport className="select-viewport">{options.map(option => <SelectPrimitive.Item className="core-select-option" key={option.value} value={option.value || emptyValue} disabled={option.disabled}>
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText><SelectPrimitive.ItemIndicator className="select-check" aria-hidden="true">✓</SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>)}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  </div><span id={`${id}-help`} className={`field-help ${error ? 'field-error' : ''}`}>{error || hint || '\u00a0'}</span></div>
}
