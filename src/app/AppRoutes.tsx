import { Route, Routes } from 'react-router'
import MobileLayout from '../components/MobileLayout/MobileLayout'
import HomePage from '../pages/HomePage/HomePage'
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MobileLayout />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
