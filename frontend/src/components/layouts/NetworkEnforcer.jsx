import { useAccount, useSwitchChain } from 'wagmi'
import { SUPPORTED_CHAINS } from '../../config/chains.config'

export default function NetworkEnforcer({ children }) {
  const { chain, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()

  // Allow access if disconnected, OR if the current chain is in our supported list
  const isSupportedChain = !isConnected || SUPPORTED_CHAINS.some(c => c.id === chain?.id)

  if (!isSupportedChain) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Unsupported Network</h2>
        <p className="text-text-secondary mb-6">
          Your wallet is on an unsupported chain. Please switch to a supported network to use Agentra.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {SUPPORTED_CHAINS.map((c) => (
            <button
              key={c.id}
              onClick={() => switchChain?.({ chainId: c.id })}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Switch to {c.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return <>{children}</>
}