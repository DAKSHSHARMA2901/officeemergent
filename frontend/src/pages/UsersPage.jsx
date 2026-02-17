import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, MoreVertical, Trash2, Edit2, ShieldCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('All fields required'); return; }
    try {
      await api.post('/auth/register', form);
      toast.success('User created');
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', role: 'employee' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await api.put(`/users/${editUser.id}`, { name: form.name, email: form.email, role: form.role });
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const res = await api.put(`/users/${userId}/toggle-active`);
      toast.success(res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to toggle');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/users/${userId}/role`, { role });
      toast.success(`Role updated to ${role}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setEditUser(u);
  };

  const roleBadge = {
    admin: 'bg-red-500/15 text-red-400 border-red-500/20',
    manager: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    employee: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  };

  return (
    <div data-testid="users-page" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Manrope' }}>
            User Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{users.length} total users</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="create-user-btn">
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121214] border-white/10" data-testid="create-user-dialog">
            <DialogHeader>
              <DialogTitle className="text-white" style={{ fontFamily: 'Manrope' }}>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Full name"
                  data-testid="create-user-name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="email@company.com"
                  data-testid="create-user-email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Min 6 characters"
                  data-testid="create-user-password"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Role</Label>
                <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="create-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/10">
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="text-zinc-400">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="create-user-submit">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm animate-fade-in-up stagger-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
          data-testid="search-users-input"
        />
      </div>

      {/* Table */}
      <Card className="glass-card animate-fade-in-up stagger-2" data-testid="users-table-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">User</TableHead>
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Role</TableHead>
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-zinc-500 text-xs uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/5 transition-colors" data-testid={`user-row-${u.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-400">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{u.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select defaultValue={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                        <SelectTrigger className="w-28 h-7 bg-transparent border-white/10 text-xs" data-testid={`role-select-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1e] border-white/10">
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => handleToggleActive(u.id)}
                          data-testid={`toggle-active-${u.id}`}
                        />
                        <Badge variant="outline" className={u.isActive ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]' : 'bg-red-500/15 text-red-400 border-red-500/20 text-[10px]'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" data-testid={`user-actions-${u.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a1e] border-white/10">
                          <DropdownMenuItem onClick={() => openEdit(u)} className="text-zinc-300 focus:text-white focus:bg-white/10">
                            <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(u.id)} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="bg-[#121214] border-white/10" data-testid="edit-user-dialog">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'Manrope' }}>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                data-testid="edit-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                data-testid="edit-user-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Role</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1e] border-white/10">
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="text-zinc-400">Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="edit-user-submit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
