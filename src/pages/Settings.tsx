import Tabs from '../components/Tabs'
import AdminConsole from '../settings/AdminConsole'
import TechnicalConsole from '../settings/TechnicalConsole'
import { RBACAdminPanel } from '../components'
import { getRole, RANK } from '../rbac/roles'
import { usePermissions } from '../rbac/dynamicGuard'

export default function Settings() {
  const role = getRole()
  const { hasPermission } = usePermissions()
  const isAdmin = RANK[role] >= RANK.BUSINESS_OWNER
  const isTech = RANK[role] >= RANK.BUSINESS_OWNER
  const canManageRoles = hasPermission('settings.role_management')

  const tabs = [
    { id: 'admin', label: 'Admin Console', content: isAdmin ? <AdminConsole /> : <Blocked label="Admin" /> },
    { id: 'rbac', label: 'Roles & Permissions', content: canManageRoles ? <RBACAdminPanel /> : <Blocked label="Role Management" /> },
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
    <div role="note" className="rounded border p-3 bg-surface-secondary text-secondary">
      This section requires <strong>{label}</strong> role.
    </div>
  )
}