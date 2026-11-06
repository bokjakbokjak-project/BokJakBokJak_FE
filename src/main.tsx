import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/latin-500.css'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './styles/global.css'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
