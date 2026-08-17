"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTeam, useInviteUser, useUpdateUserRole, useUpdateUserStatus, useAgentPresence } from '@/features/team/api/team';
import { useCurrentUser } from '@/features/auth/api/me';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient, getErrorMessage } from '@/lib/api-client';

const PRESENCE_COLORS: Record<string, string> = {
    available: 'bg-green-400',
    busy: 'bg-yellow-400',
    away: 'bg-amber-400',
    offline: 'bg-slate-300',
};

interface PermissionItem {
    id: string;
    key: string;
    description: string | null;
}

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
    const queryClient = useQueryClient();
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

    // Permission Management State
    const [isDefaultModalOpen, setIsDefaultModalOpen] = useState(false);
    const [selectedUserForPerms, setSelectedUserForPerms] = useState<{ id: string; name: string } | null>(null);
    const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

    const isAdmin = me?.role === 'admin';

    // Fetch all available system permissions
    const { data: allPermissions = [] } = useQuery<PermissionItem[]>({
        queryKey: ['all-permissions'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/permissions');
            return res.data.permissions;
        },
        enabled: isAdmin,
    });

    // Fetch workspace default agent permissions
    const { data: workspaceDefaults = [], refetch: refetchDefaults } = useQuery<PermissionItem[]>({
        queryKey: ['workspace-default-permissions'],
        queryFn: async () => {
            const res = await apiClient.get('/api/v1/permissions/workspace/defaults');
            return res.data.defaults;
        },
        enabled: isAdmin,
    });

    // Fetch user permission overrides when user modal opens
    const { data: userPermDetails, refetch: refetchUserPerms } = useQuery<{
        hasCustomOverrides: boolean;
        effectivePermissions: string[];
        customPermissions: string[];
    }>({
        queryKey: ['user-permissions', selectedUserForPerms?.id],
        queryFn: async () => {
            if (!selectedUserForPerms) return { hasCustomOverrides: false, effectivePermissions: [], customPermissions: [] };
            const res = await apiClient.get(`/api/v1/permissions/users/${selectedUserForPerms.id}`);
            return res.data;
        },
        enabled: !!selectedUserForPerms && isAdmin,
    });

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
            setInviteError(getErrorMessage(err, 'Failed to send invite'));
        }
    };

    // Save Workspace Defaults
    const saveDefaultsMutation = useMutation({
        mutationFn: async (keys: string[]) => {
            const res = await apiClient.put('/api/v1/permissions/workspace/defaults', { permissionKeys: keys });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace-default-permissions'] });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setPermissionMessage('Workspace default agent permissions updated!');
            setTimeout(() => setPermissionMessage(null), 3000);
            setIsDefaultModalOpen(false);
        },
        onError: (err: any) => {
            setPermissionMessage(getErrorMessage(err, 'Failed to update workspace default permissions'));
        }
    });

    // Save Custom User Permissions
    const saveUserPermsMutation = useMutation({
        mutationFn: async ({ userId, keys }: { userId: string; keys: string[] }) => {
            const res = await apiClient.put(`/api/v1/permissions/users/${userId}`, { permissionKeys: keys });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUserForPerms?.id] });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setPermissionMessage('User permissions updated!');
            setTimeout(() => setPermissionMessage(null), 3000);
            setSelectedUserForPerms(null);
        },
        onError: (err: any) => {
            setPermissionMessage(getErrorMessage(err, 'Failed to update user permissions'));
        }
    });

    // Reset User Permissions to Defaults
    const resetUserPermsMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await apiClient.delete(`/api/v1/permissions/users/${userId}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUserForPerms?.id] });
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setPermissionMessage('User permissions reset to workspace defaults!');
            setTimeout(() => setPermissionMessage(null), 3000);
            setSelectedUserForPerms(null);
        },
        onError: (err: any) => {
            setPermissionMessage(getErrorMessage(err, 'Failed to reset user permissions'));
        }
    });

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
                    <div className="flex items-center gap-2">
                        {isAdmin && user.role.name !== 'admin' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUserForPerms({ id: user.id, name: user.name })}
                                className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                                🔑 Permissions
                            </Button>
                        )}
                        {isAdmin && !isMe ? (
                            <Button
                                variant={user.isActive ? 'ghost' : 'outline'}
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                                className={user.isActive ? 'text-red-500 hover:text-red-700 hover:bg-red-50 text-xs' : 'text-green-600 hover:text-green-700 hover:bg-green-50 text-xs'}
                            >
                                {user.isActive ? 'Disable' : 'Enable'}
                            </Button>
                        ) : (
                            <span className={`text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                {user.isActive ? 'Active' : 'Disabled'}
                            </span>
                        )}
                    </div>
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
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team & Permissions</h1>
                    <p className="text-slate-500 mt-1">Manage workspace agents, roles, availability, and fine-grained access rules.</p>
                </div>
                {isAdmin && (
                    <Button variant="outline" onClick={() => setIsDefaultModalOpen(true)} className="flex items-center gap-2">
                        ⚙️ Default Agent Permissions
                    </Button>
                )}
            </div>

            {permissionMessage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm font-medium">
                    {permissionMessage}
                </div>
            )}

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

            {/* Modal: Workspace Default Agent Permissions */}
            {isDefaultModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Workspace Default Agent Permissions</h2>
                        <p className="text-xs text-slate-500 mb-4">Select default permissions automatically assigned to agents in this workspace.</p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const selected = formData.getAll('permissions') as string[];
                                saveDefaultsMutation.mutate(selected);
                            }}
                        >
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 mb-6 border border-slate-200 rounded-xl p-3 bg-slate-50">
                                {allPermissions.map((perm) => {
                                    const isChecked = workspaceDefaults.some((d) => d.key === perm.key);
                                    return (
                                        <label key={perm.id} className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-blue-50/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                name="permissions"
                                                value={perm.key}
                                                defaultChecked={isChecked}
                                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 font-mono">{perm.key}</p>
                                                {perm.description && <p className="text-xs text-slate-500">{perm.description}</p>}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" type="button" onClick={() => setIsDefaultModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={saveDefaultsMutation.isPending}>
                                    {saveDefaultsMutation.isPending ? 'Saving...' : 'Save Workspace Defaults'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Individual User Custom Permissions */}
            {selectedUserForPerms && userPermDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Custom Permissions: {selectedUserForPerms.name}</h2>
                                <p className="text-xs text-slate-500">Configure custom permission overrides for this agent.</p>
                            </div>
                            {userPermDetails.hasCustomOverrides && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                    Custom Overrides Active
                                </span>
                            )}
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const selected = formData.getAll('permissions') as string[];
                                saveUserPermsMutation.mutate({ userId: selectedUserForPerms.id, keys: selected });
                            }}
                        >
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 mb-6 border border-slate-200 rounded-xl p-3 bg-slate-50">
                                {allPermissions.map((perm) => {
                                    const isChecked = userPermDetails.effectivePermissions.includes(perm.key);
                                    return (
                                        <label key={perm.id} className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-indigo-50/50 transition-colors">
                                            <input
                                                type="checkbox"
                                                name="permissions"
                                                value={perm.key}
                                                defaultChecked={isChecked}
                                                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 font-mono">{perm.key}</p>
                                                {perm.description && <p className="text-xs text-slate-500">{perm.description}</p>}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2 justify-between items-center">
                                {userPermDetails.hasCustomOverrides ? (
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => resetUserPermsMutation.mutate(selectedUserForPerms.id)}
                                        disabled={resetUserPermsMutation.isPending}
                                        className="text-xs text-slate-600 hover:bg-slate-100"
                                    >
                                        Reset to Workspace Defaults
                                    </Button>
                                ) : <div />}

                                <div className="flex gap-2">
                                    <Button variant="outline" type="button" onClick={() => setSelectedUserForPerms(null)}>Cancel</Button>
                                    <Button type="submit" disabled={saveUserPermsMutation.isPending}>
                                        {saveUserPermsMutation.isPending ? 'Saving...' : 'Save Agent Permissions'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
