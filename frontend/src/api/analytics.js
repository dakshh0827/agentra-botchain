import api from './axios'
import { EXPLORER_CACHE_TTL_MS, ttlCached } from '../utils/ttlCache'

export const analyticsAPI = {
  getLeaderboard: (params) =>
    api.get('/leaderboard', {
      params: {
        ...(params || {}),
        _t: Date.now(),
      },
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }),

  getDashboard: (wallet) =>
    api.get('/analytics/dashboard', {
      params: {
        _t: Date.now(),
      },
      headers: {
        'x-wallet-address': wallet,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }),

  // Explorer / TopBar / Landing all hit this — 30s cache avoids refetch on every navigate.
  getGlobalStats: async () => {
    try {
      const data = await ttlCached(
        'analytics:global',
        async () => {
          const res = await api.get('/analytics/global')
          return res?.data ?? null
        },
        EXPLORER_CACHE_TTL_MS,
      )
      return { data }
    } catch (err) {
      // Don't leave callers unhandled — TopBar/Explorer expect .then/.catch.
      throw err
    }
  },

  getLeaderboardStats: () => api.get('/leaderboard/stats'),

  getTopAgents: (n = 10) => api.get(`/leaderboard/top/${n}`),

  getLeaderboardByCategory: (category) =>
    api.get(`/leaderboard/category/${category}`),

  getAgentRank: (id) => api.get(`/leaderboard/agent/${id}/rank`),

  recalculateScores: () => api.post('/leaderboard/recalculate'),
}
