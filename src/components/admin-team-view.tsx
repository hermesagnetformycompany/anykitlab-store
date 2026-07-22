'use client';

import {Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, X} from 'lucide-react';
import type {FormEvent} from 'react';
import type {AdminRole, AdminTeamMember} from '@/lib/admin-auth';

function scope(role: AdminRole) {
  if (role === 'Owner') return 'Full administration';
  if (role === 'Catalog manager') return 'Templates, categories, collections and media';
  if (role === 'Payment reviewer') return 'Orders, payments, customers and reports';
  return 'Orders and customers';
}

export function AdminTeamView({
  team,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  busy,
  editing,
  onAdd,
  onEdit,
  onClose,
  onSave,
  onToggle,
  onRemove,
}: {
  team: AdminTeamMember[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  busy: boolean;
  editing: AdminTeamMember | 'new' | null;
  onAdd: () => void;
  onEdit: (member: AdminTeamMember) => void;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onToggle: (member: AdminTeamMember) => Promise<void>;
  onRemove: (member: AdminTeamMember) => Promise<void>;
}) {
  const filtered = team.filter(member => {
    const matchesQuery = `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'All statuses' || member.status === statusFilter);
  });

  return (
    <>
      <section className="admin-panel">
        <header><div><h2>Team and permissions</h2><p>Invite staff, assign the minimum access they need, and suspend access immediately.</p></div><button type="button" onClick={onAdd}><Plus aria-hidden="true" />Add team member</button></header>
        <div className="admin-toolbar"><label><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search team" aria-label="Search team" /></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter team by status"><option>All statuses</option><option>Active</option><option>Invited</option><option>Suspended</option></select></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Team member</th><th>Role</th><th>Access scope</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(member => <tr key={member.id}><td><b>{member.name}</b><small>{member.email}</small></td><td>{member.role}</td><td>{scope(member.role)}</td><td><span className={`admin-status ${member.status.toLowerCase()}`}>{member.status}</span></td><td><div className="row-actions">{member.role !== 'Owner' && <><button type="button" disabled={busy} onClick={() => onEdit(member)} aria-label={`Edit ${member.name}`} title={`Edit ${member.name}`}><Pencil aria-hidden="true" /></button><button type="button" disabled={busy} onClick={() => void onToggle(member)}>{member.status === 'Active' ? 'Suspend' : 'Activate'}</button><button className="danger" type="button" disabled={busy || member.status === 'Suspended'} aria-label={`Remove access for ${member.name}`} title={`Remove access for ${member.name}`} onClick={() => void onRemove(member)}><Trash2 aria-hidden="true" /></button></>}</div></td></tr>)}</tbody></table></div>
        {!filtered.length && <div className="admin-empty"><UserCog aria-hidden="true" /><h3>No matching team members</h3><p>Change the search or filter, or invite a new staff member.</p></div>}
      </section>
      {editing && <TeamEditor member={editing === 'new' ? null : editing} busy={busy} onClose={onClose} onSave={onSave} />}
    </>
  );
}

function TeamEditor({member, busy, onClose, onSave}: {member: AdminTeamMember | null; busy: boolean; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => Promise<void>}) {
  return <div className="admin-drawer-backdrop" role="presentation"><section className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="team-editor-title"><header><div><span>TEAM ACCESS</span><h2 id="team-editor-title">{member ? 'Edit team member' : 'Add team member'}</h2><p>{member ? 'Update role and access status.' : 'Create a secure staff login with scoped permissions.'}</p></div><button type="button" onClick={onClose} aria-label="Close team editor"><X aria-hidden="true" /></button></header><form className="template-editor-form" onSubmit={event => void onSave(event)}>
    <label className="wide">Full name<input required name="name" defaultValue={member?.name} placeholder="e.g. Priya Sharma" /></label>
    <label className="wide">Email address<input required name="email" type="email" defaultValue={member?.email} disabled={Boolean(member)} placeholder="priya@company.com" /><small>This email is the administrator sign-in ID.</small></label>
    {!member && <label className="wide">Temporary password<input required name="temporaryPassword" type="password" minLength={8} autoComplete="new-password" placeholder="Minimum 8 characters" /><small>Share it securely. The password is never stored in the admin interface.</small></label>}
    <label>Role<select name="role" defaultValue={member?.role || 'Catalog manager'}><option>Catalog manager</option><option>Payment reviewer</option><option>Support</option></select></label>
    {member && <label>Status<select name="status" defaultValue={member.status}><option>Active</option><option>Invited</option><option>Suspended</option></select></label>}
    <div className="admin-role-note wide"><ShieldCheck aria-hidden="true" /><div><b>Least-privilege access</b><p>Catalog managers cannot verify payments. Payment reviewers cannot change products or media. Support remains read-only for customer orders.</p></div></div>
    <footer><button type="button" onClick={onClose}>Cancel</button><button className="admin-primary" type="submit" disabled={busy}>{member ? 'Save team member' : 'Create invitation'}</button></footer>
  </form></section></div>;
}
