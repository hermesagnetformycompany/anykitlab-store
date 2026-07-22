export type AdminRole = 'Owner' | 'Catalog manager' | 'Payment reviewer' | 'Support';
export type DatabaseRole = 'owner' | 'catalog_manager' | 'payment_reviewer' | 'support';

export type AdminSession = {
  name: string;
  email: string;
  role: AdminRole;
};

export type AdminTeamMember = AdminSession & {
  id: string;
  loginId: string;
  temporaryPassword: string;
  status: 'Active' | 'Invited' | 'Suspended';
};

export const defaultAdminTeam: AdminTeamMember[] = [];

const roleAccess: Record<AdminRole, readonly string[]> = {
  Owner: ['Overview', 'Orders', 'Templates', 'Categories', 'Collections', 'Media', 'Customers', 'Team', 'Reports', 'Settings'],
  'Catalog manager': ['Overview', 'Templates', 'Categories', 'Collections', 'Media'],
  'Payment reviewer': ['Overview', 'Orders', 'Customers', 'Reports'],
  Support: ['Overview', 'Orders', 'Customers'],
};

const roleLabels: Record<DatabaseRole, AdminRole> = {
  owner: 'Owner',
  catalog_manager: 'Catalog manager',
  payment_reviewer: 'Payment reviewer',
  support: 'Support',
};

const databaseRoles: Record<AdminRole, DatabaseRole> = {
  Owner: 'owner',
  'Catalog manager': 'catalog_manager',
  'Payment reviewer': 'payment_reviewer',
  Support: 'support',
};

export const canAccessAdminTab = (role: AdminRole, tab: string) => roleAccess[role].includes(tab);
export const canManageOrderStatus = (role: AdminRole) => role === 'Owner' || role === 'Payment reviewer';
export const toAdminRole = (role: string): AdminRole | null => role in roleLabels ? roleLabels[role as DatabaseRole] : null;
export const toDatabaseRole = (role: AdminRole): DatabaseRole => databaseRoles[role];

export const ownerSession: AdminSession = {name: 'AnyKit Lab Owner', email: '', role: 'Owner'};

export function readAdminSession(): AdminSession {
  if (typeof window === 'undefined') return ownerSession;
  try {
    const stored = sessionStorage.getItem('ak-admin-session');
    return stored ? JSON.parse(stored) as AdminSession : ownerSession;
  } catch {
    return ownerSession;
  }
}
