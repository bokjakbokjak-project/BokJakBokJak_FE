import { Navigate, Route, Routes } from 'react-router'
import MobileLayout from '../components/MobileLayout/MobileLayout'
import DemoNotice from '../components/onboarding/DemoNotice'
import OnboardingStepGuard from '../components/onboarding/OnboardingStepGuard'
import { isDemoMode } from '../lib/onboarding/demoMode'
import OnboardingProvider from '../lib/onboarding/OnboardingProvider'
import { ONBOARDING_ROUTES } from '../lib/onboarding/routes'
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage'
import CompletePage from '../pages/onboarding/CompletePage'
import DevPreviewPage from '../pages/onboarding/DevPreviewPage'
import DormitoryPage from '../pages/onboarding/DormitoryPage'
import LoginPage from '../pages/onboarding/LoginPage'
import PriorityPage from '../pages/onboarding/PriorityPage'
import ProfilePage from '../pages/onboarding/ProfilePage'
import SchoolInfoPage from '../pages/onboarding/SchoolInfoPage'

export default function AppRoutes() {
  return (
    <>
      {isDemoMode() && <DemoNotice />}
      <Routes>
        <Route element={<MobileLayout />}>
          <Route
            index
            element={<Navigate to={ONBOARDING_ROUTES.login} replace />}
          />
          <Route element={<OnboardingProvider />}>
            <Route path={ONBOARDING_ROUTES.login} element={<LoginPage />} />
            <Route
              path={ONBOARDING_ROUTES.school}
              element={<SchoolInfoPage />}
            />
            <Route
              path={ONBOARDING_ROUTES.profile}
              element={
                <OnboardingStepGuard route={ONBOARDING_ROUTES.profile}>
                  <ProfilePage />
                </OnboardingStepGuard>
              }
            />
            <Route
              path={ONBOARDING_ROUTES.dormitory}
              element={
                <OnboardingStepGuard route={ONBOARDING_ROUTES.dormitory}>
                  <DormitoryPage />
                </OnboardingStepGuard>
              }
            />
            <Route
              path={ONBOARDING_ROUTES.priority}
              element={
                <OnboardingStepGuard route={ONBOARDING_ROUTES.priority}>
                  <PriorityPage />
                </OnboardingStepGuard>
              }
            />
            <Route
              path={ONBOARDING_ROUTES.complete}
              element={
                <OnboardingStepGuard route={ONBOARDING_ROUTES.complete}>
                  <CompletePage />
                </OnboardingStepGuard>
              }
            />
            {import.meta.env.DEV && (
              <Route path="/dev/onboarding" element={<DevPreviewPage />} />
            )}
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
