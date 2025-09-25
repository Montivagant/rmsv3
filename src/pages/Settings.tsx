import Tabs from '../components/Tabs'
import { RBACAdminPanel } from '../components'
import { usePermissions } from '../rbac/dynamicGuard'

export default function Settings() {
  const { hasPermission } = usePermissions()
  const canManageRoles = hasPermission('settings.role_management')

  const tabs = [
    { id: 'rbac', label: 'Roles & Permissions', content: canManageRoles ? <RBACAdminPanel /> : <Blocked label="Role Management" /> },
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