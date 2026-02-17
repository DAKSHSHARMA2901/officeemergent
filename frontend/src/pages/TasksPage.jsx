import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Plus, Search, Filter, MoreVertical, Trash2, Edit2, CalendarIcon, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { value: 'review', label: 'Review', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', dot: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-blue-500' },
  { value: 'high', label: 'High', dot: 'bg-amber-500' },
  { value: 'critical', label: 'Critical', dot: 'bg-red-500' },
];

const STATUS_FLOW = { pending: 'in_progress', in_progress: 'review', review: 'completed' };

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '', deadline: '' });

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!isAdminOrManager) return;
    try {
      const res = await api.get('/users');
      setEmployees(res.data.filter(u => u.isActive));
    } catch {
      // ignore
    }
  }, [isAdminOrManager]);

  useEffect(() => { fetchTasks(); fetchEmployees(); }, [fetchTasks, fetchEmployees]);

  const filtered = tasks.filter(t => {
    const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedToName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleCreate = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    try {
      const payload = { ...form };
      if (deadline) payload.deadline = deadline.toISOString();
      if (!payload.assignedTo) delete payload.assignedTo;
      await api.post('/tasks', payload);
      toast.success('Task created');
      setCreateOpen(false);
      setForm({ title: '', description: '', priority: 'medium', assignedTo: '', deadline: '' });
      setDeadline(null);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleUpdate = async () => {
    if (!editTask) return;
    try {
      const payload = { title: form.title, description: form.description, priority: form.priority };
      if (form.assignedTo) payload.assignedTo = form.assignedTo;
      if (deadline) payload.deadline = deadline.toISOString();
      await api.put(`/tasks/${editTask.id}`, payload);
      toast.success('Task updated');
      setEditTask(null);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const openEditDialog = (t) => {
    setForm({ title: t.title, description: t.description || '', priority: t.priority, assignedTo: t.assignedTo || '', deadline: t.deadline || '' });
    setDeadline(t.deadline ? new Date(t.deadline) : null);
    setEditTask(t);
  };

  const getStatusObj = (val) => STATUS_OPTIONS.find(s => s.value === val);
  const getPriorityObj = (val) => PRIORITY_OPTIONS.find(p => p.value === val);

  const TaskFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-zinc-400">Title</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="bg-white/5 border-white/10 text-white"
          placeholder="Task title"
          data-testid="task-title-input"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-400">Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="bg-white/5 border-white/10 text-white min-h-[80px]"
          placeholder="Describe the task..."
          data-testid="task-description-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-zinc-400">Priority</Label>
          <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val })}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="task-priority-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1e] border-white/10">
              {PRIORITY_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400">Deadline</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left bg-white/5 border-white/10 text-white hover:bg-white/10"
                data-testid="task-deadline-picker"
              >
                <CalendarIcon className="w-4 h-4 mr-2 text-zinc-500" />
                {deadline ? format(deadline, 'MMM dd, yyyy') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#1a1a1e] border-white/10" align="start">
              <Calendar
                mode="single"
                selected={deadline}
                onSelect={setDeadline}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {isAdminOrManager && (
        <div className="space-y-2">
          <Label className="text-zinc-400">Assign To</Label>
          <Select value={form.assignedTo} onValueChange={(val) => setForm({ ...form, assignedTo: val })}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="task-assign-select">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1e] border-white/10">
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <div data-testid="tasks-page" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Manrope' }}>
            Tasks
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{tasks.length} total tasks</p>
        </div>
        {isAdminOrManager && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="create-task-btn">
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121214] border-white/10 max-w-lg" data-testid="create-task-dialog">
              <DialogHeader>
                <DialogTitle className="text-white" style={{ fontFamily: 'Manrope' }}>Create Task</DialogTitle>
              </DialogHeader>
              <TaskFormFields />
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" className="text-zinc-400">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="create-task-submit">
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up stagger-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
            data-testid="search-tasks-input"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white" data-testid="filter-status">
            <Filter className="w-3.5 h-3.5 mr-2 text-zinc-500" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-white/10">
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white" data-testid="filter-priority">
            <Filter className="w-3.5 h-3.5 mr-2 text-zinc-500" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-white/10">
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-zinc-500">Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <p className="text-zinc-500">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="tasks-grid">
          {filtered.map((task, i) => {
            const statusObj = getStatusObj(task.status);
            const priorityObj = getPriorityObj(task.priority);
            const nextStatus = STATUS_FLOW[task.status];
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

            return (
              <Card
                key={task.id}
                className={`glass-card stat-card animate-fade-in-up ${isOverdue ? 'border-red-500/30' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
                data-testid={`task-card-${task.id}`}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-sm font-semibold text-white truncate">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    {(isAdminOrManager || task.assignedTo === user?.id) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white h-7 w-7" data-testid={`task-actions-${task.id}`}>
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a1e] border-white/10">
                          {nextStatus && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(task.id, nextStatus)}
                                className="text-zinc-300 focus:text-white focus:bg-white/10"
                                data-testid={`advance-status-${task.id}`}
                              >
                                <ArrowRight className="w-3.5 h-3.5 mr-2" />
                                Move to {nextStatus.replace('_', ' ')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                            </>
                          )}
                          {isAdminOrManager && (
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(task)} className="text-zinc-300 focus:text-white focus:bg-white/10">
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {/* Employee can update status via dropdown */}
                          {!isAdminOrManager && task.status !== 'completed' && (
                            STATUS_OPTIONS.filter(s => s.value !== task.status).map(s => (
                              <DropdownMenuItem
                                key={s.value}
                                onClick={() => handleStatusChange(task.id, s.value)}
                                className="text-zinc-300 focus:text-white focus:bg-white/10"
                              >
                                Update to {s.label}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusObj && (
                      <Badge variant="outline" className={`text-[10px] ${statusObj.color}`} data-testid={`task-status-badge-${task.id}`}>
                        {statusObj.label}
                      </Badge>
                    )}
                    {priorityObj && (
                      <Badge variant="outline" className="text-[10px] bg-white/5 text-zinc-400 border-white/10">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${priorityObj.dot}`} />
                        {priorityObj.label}
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-400 border-red-500/20">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{task.assignedToName || 'Unassigned'}</span>
                    {task.deadline && (
                      <span className={isOverdue ? 'text-red-400' : ''}>
                        Due {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {isAdminOrManager && (
        <Dialog open={!!editTask} onOpenChange={(open) => !open && setEditTask(null)}>
          <DialogContent className="bg-[#121214] border-white/10 max-w-lg" data-testid="edit-task-dialog">
            <DialogHeader>
              <DialogTitle className="text-white" style={{ fontFamily: 'Manrope' }}>Edit Task</DialogTitle>
            </DialogHeader>
            <TaskFormFields />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="text-zinc-400">Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="edit-task-submit">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
