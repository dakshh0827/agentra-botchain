import axios from 'axios'

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 600000, // 10 minutes for Hugging Face model execution
  headers: {
    'Content-Type': 'application/json',
  },
})

export function extractWalletFromStorage() {
  const direct = localStorage.getItem('wallet-address')
  if (/^0x[a-fA-F0-9]{40}$/.test(direct || '')) {
    return direct.toLowerCase()
  }

  try {
    const authStoreRaw = localStorage.getItem('auth-store')
    if (authStoreRaw) {
      const authStore = JSON.parse(authStoreRaw)
      const authWallet = authStore?.state?.walletAddress
      if (/^0x[a-fA-F0-9]{40}$/.test(authWallet || '')) {
        return authWallet.toLowerCase()
      }
    }
  } catch {
    // Ignore malformed local storage values.
  }

  try {
    const wagmiStoreRaw = localStorage.getItem('wagmi.store')
    if (wagmiStoreRaw) {
      // wagmi persists a complex serialized state; grab the first address-shaped value.
      const match = wagmiStoreRaw.match(/0x[a-fA-F0-9]{40}/)
      if (match?.[0]) {
        return match[0].toLowerCase()
      }
    }
  } catch {
    // Ignore malformed local storage values.
  }

  return null
}

// ─────────────────────────────────────────────
// REQUEST INTERCEPTOR (WALLET + AUTH)
// ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const wallet = extractWalletFromStorage()

  // Respect per-request wallet headers (e.g. dashboard fetches bound to current wagmi account).
  if (wallet && !config.headers['x-wallet-address']) {
    config.headers['x-wallet-address'] = wallet
  }

  return config
})

// ─────────────────────────────────────────────
// RESPONSE INTERCEPTOR (ERROR HANDLING)
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message

    console.error('API Error:', message)

    return Promise.reject(error)
  }
)

export default api
