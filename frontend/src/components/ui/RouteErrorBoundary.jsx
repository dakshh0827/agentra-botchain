import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Catches render errors so a bad agent row cannot wipe the whole app shell.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('RouteErrorBoundary:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || 'Something went wrong'
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-6 py-12 bg-bg text-text-primary">
          <div className="max-w-md w-full rounded-xl border border-border bg-panel p-6 shadow-sm text-center">
            <p className="text-xs uppercase tracking-wide text-text-dim font-semibold mb-2">
              Page error
            </p>
            <h2 className="font-display font-bold text-xl mb-2">Couldn’t render this view</h2>
            <p className="text-sm text-text-secondary mb-4 break-words">{message}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                className="btn-primary px-4 py-2 rounded-lg text-sm"
                onClick={() => {
                  this.setState({ error: null })
                  window.location.reload()
                }}
              >
                Reload
              </button>
              <Link
                to="/explorer"
                className="px-4 py-2 rounded-lg text-sm border border-border bg-bg hover:bg-bg-secondary"
                onClick={() => this.setState({ error: null })}
              >
                Back to Explorer
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
