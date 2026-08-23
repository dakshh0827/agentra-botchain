import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import RouteErrorBoundary from '../ui/RouteErrorBoundary'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text-primary">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-bg">
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  )
}
