import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/latin-500.css'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './styles/global.css'
import App from './app/App'
import { readQaFlagFromUrl } from './lib/qa/qaMode'

// `?qa=1` in any address turns on the QA tools for this tab (src/lib/qa/qaMode.ts).
readQaFlagFromUrl(window.location.search)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
