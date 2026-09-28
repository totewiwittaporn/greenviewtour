import {useLayoutEffect} from 'react'
import {useMemberNavigation} from './member-navigation-context.js'

export default function LeaveGuard({dirty}) {
 const {guards} = useMemberNavigation()
 useLayoutEffect(() => {
  if (!dirty) return
  const token = {}
  const registrations = guards.current
  registrations.add(token)
  return () => {registrations.delete(token)}
 }, [dirty, guards])
 return null
}
