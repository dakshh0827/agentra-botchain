import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/web3.js' // <-- Add this
import NetworkEnforcer from './components/layouts/NetworkEnforcer.jsx' // <-- Add this
import { warmBackend } from './api/warmup.js'
import './index.css'
import App from './App.jsx'

// Kick the API awake before anything asks it for data. Fire-and-forget on purpose —
// rendering must not wait on it, and a failure here is not the page's problem.
warmBackend()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <NetworkEnforcer>
          <App />
        </NetworkEnforcer>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)


