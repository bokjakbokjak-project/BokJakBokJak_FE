import logo from '../../assets/onboarding/logo.svg'

/**
 * The 복작복작 logo at the top left of the home and the roommate list. Both screens use the
 * 59x38.98 size at (24, 9) of their 56px header (Figma 779:3447, 1377:30960), so switching tabs does
 * not move or resize it. The parent header must be `relative`.
 */
export default function AppLogo() {
  return (
    <img
      src={logo}
      alt="복작복작"
      className="absolute top-[9px] left-6 h-[38.98px] w-[59px] max-w-none"
    />
  )
}
