"use client";

import { useState } from 'react';
import { useTeam, useInviteUser, useUpdateUserRole, useUpdateUserStatus, useAgentPresence } from '@/features/team/api/team';
import { useCurrentUser } from '@/features/auth/api/me';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const PRESENCE_COLORS: Record<string, string> = {
    available: 'bg-green-400',
    busy: 'bg-yellow-400',
    away: 'bg-amber-400',
    offline: 'bg-slate-300',
};

function PresenceDot({ status }: { status?: string }) {
    const key = status ?? 'offline';
    return (
        <span
            className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRESENCE_COLORS[key] ?? 'bg-slate-300'}`}
            title={key.charAt(0).toUpperCase() + key.slice(1)}
        />
    );
}

function RoleBadge({ role }: { role: string }) {
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            {role}
        </span>
    );
}

export default function TeamPage() {
    const { data: me } = useCurrentUser();
    const { data: users = [], isLoading, error } = useTeam();
    const { data: presence = {} } = useAgentPresence(me?.workspace?.id ?? '');
    const inviteMutation = useInviteUser();
    const updateRoleMutation = useUpdateUserRole();
    const updateStatusMutation = useUpdateUserStatus();

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('agent');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const isAdmin = me?.role === 'admin';

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError(null);
        setInviteSuccess(false);
        try {
            await inviteMutation.mutateAsync({ email: inviteEmail, name: inviteName, role: inviteRole });
            setInviteEmail('');
            setInviteName('');
            setInviteRole('agent');
            setInviteSuccess(true);
        } catch (err: any) {
            setInviteError(err.message);
        }
    };

    // Sort: current user first, then admins, then agents
    const sorted = [...users].sort((a, b) => {
        if (a.id === me?.id) return -1;
        if (b.id === me?.id) return 1;
        const roleOrder = (r: string) => (r === 'admin' ? 0 : 1);
        return roleOrder(a.role.name) - roleOrder(b.role.name);
    });

    const meUser = sorted.find(u => u.id === me?.id);
    const admins = sorted.filter(u => u.role.name === 'admin' && u.id !== me?.id);
    const agents = sorted.filter(u => u.role.name !== 'admin' && u.id !== me?.id);

    const UserRow = ({ user }: { user: typeof users[0] }) => {
        const userPresence = presence[user.id];
        const isMe = user.id === me?.id;

        return (
            <tr className={`hover:bg-slate-50 transition-colors ${isMe ? 'bg-blue-50/50' : ''}`}>
                <td className="p-4">
                    <div className="flex items-center gap-3">
                        <PresenceDot status={userPresence} />
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {user.name}
                                {isMe && <span className="ml-2 text-xs text-blue-600 font-medium">(You)</span>}
                            </p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                    </div>
                </td>
                <td className="p-4">
                    {isAdmin && !isMe ? (
                        <select
                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            value={user.role.name}
                            onChange={(e) => updateRoleMutation.mutate({ id: user.id, role: e.target.value })}
                        >
                            <option value="admin">Admin</option>
                            <option value="agent">Agent</option>
                        </select>
                    ) : (
                        <RoleBadge role={user.role.name} />
                    )}
                </td>
                <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${userPresence === 'available' ? 'bg-green-100 text-green-700' : userPresence === 'busy' ? 'bg-yellow-100 text-yellow-700' : userPresence === 'away' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        <PresenceDot status={userPresence} />
                        {(userPresence ?? 'offline').charAt(0).toUpperCase() + (userPresence ?? 'offline').slice(1)}
                    </span>
                </td>
                <td className="p-4">
                    {isAdmin && !isMe ? (
                        <Button
                            variant={user.isActive ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                            className={user.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                        >
                            {user.isActive ? 'Disable' : 'Enable'}
                        </Button>
                    ) : (
                        <span className={`text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                            {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                    )}
                </td>
            </tr>
        );
    };

    const SectionHeader = ({ label }: { label: string }) => (
        <tr>
            <td colSpan={4} className="px-4 py-2 bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {label}
            </td>
        </tr>
    );

    return (
        <AuthenticatedLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team</h1>
                    <p className="text-slate-500 mt-1">Workspace members and their availability.</p>
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
                {/* Members Table */}
                <div className={`${isAdmin ? 'lg:col-span-2' : ''} card p-0 overflow-hidden`}>
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">Loading team members...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500">Failed to load team members.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <th className="p-4">Member</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Presence</th>
                                        <th className="p-4">{isAdmin ? 'Actions' : 'Status'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* You */}
                                    {meUser && (
                                        <>
                                            <SectionHeader label="You" />
                                            <UserRow user={meUser} />
                                        </>
                                    )}
                                    {/* Admins */}
                                    {admins.length > 0 && (
                                        <>
                                            <SectionHeader label="Admins" />
                                            {admins.map(u => <UserRow key={u.id} user={u} />)}
                                        </>
                                    )}
                                    {/* Agents */}
                                    {agents.length > 0 && (
                                        <>
                                            <SectionHeader label="Agents" />
                                            {agents.map(u => <UserRow key={u.id} user={u} />)}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Invite Panel (admin only) */}
                {isAdmin && (
                    <div className="card">
                        <h2 className="text-lg font-semibold text-slate-900 mb-1">Invite Member</h2>
                        <p className="text-sm text-slate-500 mb-4">Send an email invite to join your workspace.</p>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <Input value={inviteName} onChange={e => setInviteName(e.target.value)} required placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="jane@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value)}
                                >
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            {inviteError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{inviteError}</div>}
                            {inviteSuccess && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">✓ Invite sent successfully!</div>}
                            <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
                                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
