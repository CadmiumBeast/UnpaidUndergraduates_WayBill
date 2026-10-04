import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DemoPanel } from '@/components/domain/DemoPanel'
import { ROLE_HOME } from '@/domain/accounts'
import { DispatcherLayout } from '@/layouts/DispatcherLayout'
import { DriverLayout } from '@/layouts/DriverLayout'
import { LoaderLayout } from '@/layouts/LoaderLayout'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { RoleGuard } from '@/layouts/RoleGuard'
import { Activity } from '@/pages/dispatcher/Activity'
import { Deferrals } from '@/pages/dispatcher/Deferrals'
import { EndOfDay } from '@/pages/dispatcher/EndOfDay'
import { Fleet } from '@/pages/dispatcher/Fleet'
import { Orders } from '@/pages/dispatcher/Orders'
import { Outlook } from '@/pages/dispatcher/Outlook'
import { Overview } from '@/pages/dispatcher/Overview'
import { Planning } from '@/pages/dispatcher/Planning'
import { Runs } from '@/pages/dispatcher/Runs'
import { Team } from '@/pages/dispatcher/Team'
import { PreTrip } from '@/pages/driver/PreTrip'
import { Stop } from '@/pages/driver/Stop'
import { Summary } from '@/pages/driver/Summary'
import { Sync } from '@/pages/driver/Sync'
import { TripRoute } from '@/pages/driver/TripRoute'
import { DriverTrips } from '@/pages/driver/Trips'
import { LoaderVehicles } from '@/pages/loader/Vehicles'
import { TripLoad } from '@/pages/loader/TripLoad'
import { ManagerHome } from '@/pages/manager/Home'
import { History } from '@/pages/manager/History'
import { PlaceOrder } from '@/pages/manager/PlaceOrder'
import { Receive } from '@/pages/manager/Receive'
import { Track } from '@/pages/manager/Track'
import { Design } from '@/pages/shared/Design'
import { Login } from '@/pages/shared/Login'
import { Notices } from '@/pages/shared/Notices'
import { useStore } from '@/store/useStore'
import * as React from 'react'

function Home() {
  const session = useStore((s) => s.session)
  return <Navigate to={session ? ROLE_HOME[session.role] : '/login'} replace />
}

export default function App() {
  const session = useStore((s) => s.session)
  const refreshRemote = useStore((s) => s.refreshRemote)

  React.useEffect(() => {
    if (!session) return
    void refreshRemote()
    const timer = window.setInterval(() => void refreshRemote(), 4000)
    return () => window.clearInterval(timer)
  }, [session, refreshRemote])

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/design" element={<Design />} />

        <Route element={<RoleGuard role="dispatcher" />}>
          <Route path="/dispatcher" element={<DispatcherLayout />}>
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="planning" element={<Planning />} />
            <Route path="deferrals" element={<Deferrals />} />
            <Route path="runs" element={<Runs />} />
            <Route path="fleet" element={<Fleet />} />
            <Route path="endofday" element={<EndOfDay />} />
            <Route path="outlook" element={<Outlook />} />
            <Route path="team" element={<Team />} />
            <Route path="activity" element={<Activity />} />
            <Route path="notices" element={<Notices />} />
          </Route>
        </Route>

        <Route element={<RoleGuard role="loader" />}>
          <Route path="/loader" element={<LoaderLayout />}>
            <Route index element={<LoaderVehicles />} />
            <Route path="trip/:tripId" element={<TripLoad />} />
            <Route path="notices" element={<Notices />} />
          </Route>
        </Route>

        <Route element={<RoleGuard role="driver" />}>
          <Route path="/driver" element={<DriverLayout />}>
            <Route index element={<DriverTrips />} />
            <Route path="trip/:tripId" element={<TripRoute />} />
            <Route path="pretrip/:tripId" element={<PreTrip />} />
            <Route path="stop/:tripId/:orderId" element={<Stop />} />
            <Route path="summary/:tripId" element={<Summary />} />
            <Route path="sync" element={<Sync />} />
            <Route path="notices" element={<Notices />} />
          </Route>
        </Route>

        <Route element={<RoleGuard role="manager" />}>
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<ManagerHome />} />
            <Route path="order" element={<PlaceOrder />} />
            <Route path="track/:orderId" element={<Track />} />
            <Route path="receive/:orderId" element={<Receive />} />
            <Route path="history" element={<History />} />
            <Route path="notices" element={<Notices />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
      <DemoPanel />
      <Toaster position="top-center" closeButton toastOptions={{ style: { background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' } }} />
    </>
  )
}
