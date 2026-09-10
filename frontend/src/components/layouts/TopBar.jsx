// frontend/src/components/layouts/TopBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, Bell, ChevronDown, Loader2, Check, AlertCircle } from 'lucide-react'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useDisconnect, useReadContract, useSwitchChain } from 'wagmi'
import { formatUnits } from 'viem'
import NeonButton from '../ui/NeonButton'
import { analyticsAPI } from '../../api/analytics'
import { CHAIN_CONFIG, SUPPORTED_CHAINS } from '../../config/chains.config'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
]

function NetworkSwitcher({ chain, isConnected }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [switchError, setSwitchError] = useState('')
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const { switchChain, isPending } = useSwitchChain()

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 8, left: rect.left })
  }, [])

  useEffect(() => {
    if (!open) return
    updateCoords()
    window.addEventListener('scroll', updateCoords, true)
    window.addEventListener('resize', updateCoords)
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
  }, [open, updateCoords])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isConnected) {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold text-text-secondary tracking-widest uppercase px-2 py-1">
        <Radio size={12} className="text-primary-dark" />
        Disconnected
      </div>
    )
  }

  const handleSwitch = (chainId) => {
    setSwitchError('')
    switchChain(
      { chainId },
      {
        onError: (err) => {
          console.error('[NETWORK SWITCH ERROR]', err)
          setSwitchError(err?.shortMessage || err?.message || 'Switch failed — check wallet.')
        },
        onSuccess: () => {
          setOpen(false)
        },
      }
    )
  }

  return (
    <>
      <div className="relative hidden md:block">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-text-secondary tracking-widest uppercase cursor-pointer hover:text-primary-dark transition-colors px-2 py-1 rounded-lg hover:bg-accent-pink/30"
        >
          <Radio size={12} className="text-primary-dark" />
          {chain ? chain.name : 'Unknown Network'}
          <ChevronDown size={10} className={`text-text-dim transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
            className="w-60 rounded-xl border border-border bg-[var(--color-panel)] shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-text-dim border-b border-border">
              Switch Network
            </div>
            {SUPPORTED_CHAINS.map((c) => {
              const isCurrent = chain?.id === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={isCurrent || isPending}
                  onClick={() => handleSwitch(c.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-mono text-left transition-colors cursor-pointer disabled:cursor-default ${
                    isCurrent ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-accent-pink/30'
                  }`}
                >
                  <span>{c.name}</span>
                  {isCurrent && <Check size={12} />}
                  {isPending && !isCurrent && <Loader2 size={12} className="animate-spin" />}
                </button>
              )
            })}
            {switchError && (
              <div className="flex items-start gap-1.5 px-3 py-2.5 border-t border-border text-[10px] font-mono text-danger">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{switchError}</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

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
      <div className="flex items-center gap-4">
        <Link to="/" className="lg:hidden flex items-center gap-2.5 shrink-0">
          <img src="/logo/logo48.png" alt="Agentra" className="w-7 h-7 rounded-lg shadow-soft" />
          <span className="font-display font-bold text-sm tracking-wider text-text-primary uppercase">AGENTRA</span>
        </Link>

        <NetworkSwitcher chain={chain} isConnected={isConnected} />

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
                {Number(formatUnits(tokenBalance, 18)).toFixed(2)} chain
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