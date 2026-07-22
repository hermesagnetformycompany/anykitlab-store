import {toDatabaseRole, type AdminRole, type AdminTeamMember} from './admin-auth';

const editableRoles = new Set<AdminRole>(['Catalog manager', 'Payment reviewer', 'Support']);
const editableStatuses = new Set<AdminTeamMember['status']>(['Active', 'Invited', 'Suspended']);

function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request body.');
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, maximum: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > maximum) throw new Error(`${label} is too long.`);
  return text;
}

function roleValue(value: unknown) {
  const role = requiredText(value, 'Role', 40) as AdminRole;
  if (!editableRoles.has(role)) throw new Error('Choose a valid staff role.');
  return role;
}

function emailValue(value: unknown) {
  const email = requiredText(value, 'Email address', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

export function parseTeamCreateInput(value: unknown) {
  const input = objectInput(value);
  const password = requiredText(input.temporaryPassword, 'Temporary password', 128);
  if (password.length < 8) throw new Error('Temporary password must contain at least 8 characters.');
  const role = roleValue(input.role);
  return {
    name: requiredText(input.name, 'Full name', 120),
    email: emailValue(input.email),
    temporaryPassword: password,
    role,
    databaseRole: toDatabaseRole(role),
  };
}

export function parseTeamUpdateInput(value: unknown) {
  const input = objectInput(value);
  const role = roleValue(input.role);
  const status = requiredText(input.status, 'Status', 20) as AdminTeamMember['status'];
  if (!editableStatuses.has(status)) throw new Error('Choose a valid team-member status.');
  return {
    name: requiredText(input.name, 'Full name', 120),
    role,
    databaseRole: toDatabaseRole(role),
    status,
    databaseStatus: status.toLowerCase() as 'active' | 'invited' | 'suspended',
  };
}
