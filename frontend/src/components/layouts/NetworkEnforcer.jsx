import React from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { SUPPORTED_CHAINS } from '../../config/chains.config'
import NeonButton from '../ui/NeonButton'


export default function NetworkEnforcer({ children }) {
  const { chain, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  const isUnsupported = isConnected && chain && !SUPPORTED_CHAINS.find((c) => c.id === chain.id)
  const targetChain = SUPPORTED_CHAINS[0]

  return (
    <>
      {children}
      {isUnsupported && targetChain ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-md px-4">
          <div className="rounded-2xl border border-border bg-panel p-8 max-w-md w-full shadow-lg flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mb-4 border border-red-500/40">
              <span className="text-red-600 text-xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-display font-bold text-text-primary mb-2">
              Unsupported Network
            </h2>
            <p className="text-text-secondary text-sm mb-6">
              Your wallet is on an unsupported chain. Switch to{' '}
              <span className="font-semibold text-text-primary">{targetChain.name}</span>{' '}
              to keep using Agentra.
            </p>
            <NeonButton
              onClick={() => switchChain({ chainId: targetChain.id })}
              loading={isPending}
              className="w-full justify-center"
            >
              Switch to {targetChain.name}
            </NeonButton>
          </div>
        </div>
      ) : null}
    </>
  )
}
