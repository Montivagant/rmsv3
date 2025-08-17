import Tabs from '../components/Tabs'
import AdminConsole from '../settings/AdminConsole'
import TechnicalConsole from '../settings/TechnicalConsole'
import { getRole, RANK } from '../rbac/roles'

export default function Settings() {
  const role = getRole()
  const isAdmin = RANK[role] >= RANK.ADMIN
  const isTech = RANK[role] >= RANK.TECH_ADMIN

  const tabs = [
    { id: 'admin', label: 'Admin Console', content: isAdmin ? <AdminConsole /> : <Blocked label="Admin" /> },
    { id: 'tech', label: 'Technical Console', content: isTech ? <TechnicalConsole /> : <Blocked label="Technical Admin" /> },
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Settings</h2>
      <Tabs tabs={tabs} ariaLabel="Settings Sections" />
    </div>
  )
}

function Blocked({ label }: { label: string }) {
  return (
    <div role="note" className="rounded border p-3 bg-gray-50 text-gray-700">
      This section requires <strong>{label}</strong> role.
    </div>
  )
}