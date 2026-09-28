import { createContext, useContext } from 'react'
export const LocaleContext = createContext(null)
export function useLocale() { return useContext(LocaleContext) }
