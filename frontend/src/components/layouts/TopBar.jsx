import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radio, Bell, ChevronDown, Loader2 } from 'lucide-react'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import NeonButton from '../ui/NeonButton'
import { analyticsAPI } from '../../api/analytics'
import { CHAIN_CONFIG } from '../../config/chains.config'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
]

export default function TopBar() {
  const { open } = useWeb3Modal()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (address) {
      localStorage.setItem('wallet-address', address.toLowerCase())
    } else {
      localStorage.removeItem('wallet-address')
    }
  }, [address])

  const currentNetwork = chain?.id ? CHAIN_CONFIG[chain.id] : null
  const tokenAddress = currentNetwork?.contracts?.AgentToken?.address
  const tokenAbi = currentNetwork?.contracts?.AgentToken?.abi || ERC20_ABI

  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  })

  useEffect(() => {
    setStatsLoading(true)
    analyticsAPI.getGlobalStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setStatsLoading(false))
  }, [])

  return (
    <header
      className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 border-b border-border"
      style={{ background: 'var(--color-panel)' }}
    >
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2.5 shrink-0">
          <img src="/logo/logo48.png" alt="Agentra" className="w-7 h-7 rounded-lg shadow-soft" />
          <span className="font-display font-bold text-sm tracking-wider text-text-primary uppercase">AGENTRA</span>
        </Link>

        {/* Network status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold text-text-secondary tracking-widest uppercase">
          <Radio size={12} className="text-primary-dark" />
          {isConnected && chain ? chain.name : 'Disconnected'}
        </div>

        {/* Agents live pill */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg-secondary text-xs font-mono font-bold text-text-primary tracking-widest uppercase shadow-soft"
        >
          {statsLoading ? (
            <Loader2 size={12} className="animate-spin text-primary" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
          )}
          {statsLoading ? 'Loading' : `${stats?.activeAgents ?? 0} Online`}
        </motion.div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-text-secondary hover:text-primary-dark hover:bg-accent-pink transition-all">
          <Bell size={18} />
        </button>

        {isConnected ? (
          <button
            onClick={() => disconnect()}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-primary-light bg-accent-pink/50 text-primary-dark hover:border-primary hover:bg-accent-pink transition-all shadow-soft cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
            <span className="text-xs font-mono font-bold tracking-tight">
              {`${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            {tokenBalance !== undefined && (
              <span className="hidden sm:inline text-xs font-mono font-bold text-text-primary pl-2.5 border-l border-primary/20">
                {Number(formatUnits(tokenBalance, 18)).toFixed(2)} 0G
              </span>
            )}
            <ChevronDown size={12} className="text-text-dim" />
          </button>
        ) : (
          <NeonButton size="sm" onClick={() => open()}>
            <span className="font-bold tracking-wide text-xs">Connect Wallet</span>
          </NeonButton>
        )}
      </div>
    </header>
  )
}