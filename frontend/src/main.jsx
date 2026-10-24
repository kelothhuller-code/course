import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './LandingPage.css'
import App from './App.jsx'
import './styles/perf.css' // last: cheaper effects on phones / reduced motion
import { loadHomeData } from './utils/homeData'

// Start the homepage data request right away (in parallel with the JS that renders the page)
if (window.location.pathname === '/') loadHomeData()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
