import { useRef } from 'react'
import { useNavigate } from 'react-router'

/** Navigates once per screen, so a double click cannot push the next step twice. */
export function useStepNavigation() {
  const navigate = useNavigate()
  const hasNavigated = useRef(false)

  return (path: string) => {
    if (hasNavigated.current) return
    hasNavigated.current = true
    navigate(path)
  }
}
