import { Navigate, Route, Routes } from 'react-router'
import MobileLayout from '../components/MobileLayout/MobileLayout'
import { CHAT_ROUTE_PATTERNS } from '../lib/chat/routes'
import { SHARE_ROUTE } from '../lib/share/profileShare'
import DemoNotice from '../components/onboarding/DemoNotice'
import OnboardingStepGuard from '../components/onboarding/OnboardingStepGuard'
import OnboardingSurface from '../components/onboarding/OnboardingSurface'
import { HOME_ROUTES } from '../lib/home/routes'
import { MY_ROUTES } from '../lib/my/routes'
import { isDemoMode } from '../lib/onboarding/demoMode'
import OnboardingProvider from '../lib/onboarding/OnboardingProvider'
import { ONBOARDING_ROUTES } from '../lib/onboarding/routes'
import HomePage from '../pages/home/HomePage'
import NotificationsPage from '../pages/home/NotificationsPage'
import EditNamePage from '../pages/my/EditNamePage'
import MyPage from '../pages/my/MyPage'
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage'
import ChatListPage from '../pages/chat/ChatListPage'
import ChatMenuPage from '../pages/chat/ChatMenuPage'
import ChatRoomPage from '../pages/chat/ChatRoomPage'
import CompletePage from '../pages/onboarding/CompletePage'
import DevPreviewPage from '../pages/onboarding/DevPreviewPage'
import DormitoryPage from '../pages/onboarding/DormitoryPage'
import LoginPage from '../pages/onboarding/LoginPage'
import PriorityPage from '../pages/onboarding/PriorityPage'
import ProfilePage from '../pages/onboarding/ProfilePage'
import SchoolInfoPage from '../pages/onboarding/SchoolInfoPage'
import QuestionPage from '../pages/question/QuestionPage'
import QuestionLoadingPage from '../pages/question/QuestionLoadingPage'
import QuestionProfilePage from '../pages/question/QuestionProfilePage'
import QuestionProvider from '../pages/question/QuestionProvider'
import { QUESTION_ROUTES } from '../pages/question/questionData'
import RoommateProvider from '../lib/roommate/RoommateProvider'
import { ROOMMATE_ROUTES } from '../lib/roommate/routes'
import DetailProfilePage from '../pages/roommate/DetailProfilePage'
import SharedProfilePage from '../pages/share/SharedProfilePage'
import MatchAnalysisPage from '../pages/roommate/MatchAnalysisPage'
import RoommateListPage from '../pages/roommate/RoommateListPage'

export default function AppRoutes() {
  return (
    <>
      {isDemoMode() && <DemoNotice />}
      <Routes>
        <Route element={<MobileLayout />}>
          {/* The login screen moved to `/`. Old `/login` links still land on it. */}
          <Route
            path="/login"
            element={<Navigate to={ONBOARDING_ROUTES.login} replace />}
          />
          {/* These stay mounted across the screens below, so moving between them keeps the
              onboarding answers, the survey answers, and the roommate list state. */}
          <Route element={<OnboardingProvider />}>
            <Route element={<QuestionProvider />}>
              <Route element={<RoommateProvider />}>
                <Route element={<OnboardingSurface />}>
                  <Route
                    path={ONBOARDING_ROUTES.login}
                    element={<LoginPage />}
                  />
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
                  <Route
                    path={QUESTION_ROUTES.survey}
                    element={<QuestionPage />}
                  />
                  <Route
                    path={QUESTION_ROUTES.loading}
                    element={<QuestionLoadingPage />}
                  />
                  <Route
                    path={QUESTION_ROUTES.profile}
                    element={<QuestionProfilePage />}
                  />
                  {import.meta.env.DEV && (
                    <Route
                      path="/dev/onboarding"
                      element={<DevPreviewPage />}
                    />
                  )}
                </Route>
                <Route path={HOME_ROUTES.home} element={<HomePage />} />
                <Route path={MY_ROUTES.my} element={<MyPage />} />
                <Route path={MY_ROUTES.editName} element={<EditNamePage />} />
                <Route
                  path={HOME_ROUTES.notifications}
                  element={<NotificationsPage />}
                />
                {import.meta.env.DEV && (
                  <>
                    <Route
                      path={HOME_ROUTES.previewMatched}
                      element={<HomePage matchStatus="matched" />}
                    />
                    <Route
                      path={HOME_ROUTES.previewTodayNotifications}
                      element={<NotificationsPage sample="withToday" />}
                    />
                  </>
                )}
                <Route
                  path={ROOMMATE_ROUTES.list}
                  element={<RoommateListPage />}
                />
                <Route
                  path={ROOMMATE_ROUTES.analysis(':candidateId')}
                  element={<MatchAnalysisPage />}
                />
                <Route
                  path={ROOMMATE_ROUTES.profile(':candidateId')}
                  element={<DetailProfilePage />}
                />
                {/* Inside the providers too, so a visit to the chat tab keeps the session state. */}
                <Route
                  path={CHAT_ROUTE_PATTERNS.list}
                  element={<ChatListPage />}
                />
                <Route
                  path={CHAT_ROUTE_PATTERNS.room}
                  element={<ChatRoomPage />}
                />
                <Route
                  path={CHAT_ROUTE_PATTERNS.menu}
                  element={<ChatMenuPage />}
                />
              </Route>
            </Route>
          </Route>
          {/* Opened by anyone with a share link, so it needs none of the session state. */}
          <Route path={SHARE_ROUTE} element={<SharedProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
