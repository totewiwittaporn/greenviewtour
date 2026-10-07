import {createContext, useContext} from 'react'
export const CompanyContactContext = createContext(null)
export function useCompanyContact() { return useContext(CompanyContactContext) }
