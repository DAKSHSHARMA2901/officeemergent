import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Users, CheckSquare, Clock, AlertTriangle, TrendingUp, ArrowUpRight } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color, delay }) {
  return (
    <Card
      className={`glass-card stat-card animate-fade-in-up stagger-${delay}`}
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600" />
        </div>
        <p className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope' }}>{value}</p>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}

function PerformanceRow({ emp, index }) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-md hover:bg-white/5 transition-colors animate-fade-in-up stagger-${index + 1}`}
      data-testid={`performance-row-${emp.id}`}
    >
      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-400">
        {emp.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{emp.name}</p>
        <p className="text-xs text-zinc-500">{emp.completedTasks}/{emp.totalTasks} tasks</p>
      </div>
      <div className="w-24">
        <Progress value={emp.completionRate} className="h-1.5" />
      </div>
      <span className="text-xs font-mono text-zinc-400 w-12 text-right">{emp.completionRate}%</span>
    </div>
  );
}

function TaskStatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    review: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  const labels = { pending: 'Pending', in_progress: 'In Progress', review: 'Review', completed: 'Completed' };
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[status] || ''}`}>
      {labels[status] || status}
    </Badge>
  );
}

function PriorityDot({ priority }) {
  const colors = { critical: 'bg-red-500', high: 'bg-amber-500', medium: 'bg-blue-500', low: 'bg-emerald-500' };
  return <span className={`w-2 h-2 rounded-full inline-block ${colors[priority] || 'bg-zinc-500'}`} />;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/tasks'),
        ]);
        setStats(statsRes.data);
        setRecentTasks(tasksRes.data.slice(0, 6));
        if (user?.role !== 'employee') {
          const perfRes = await api.get('/dashboard/performance');
          setPerformance(perfRes.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-zinc-500">Loading dashboard...</div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white" style={{ fontFamily: 'Manrope' }}>
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Welcome back, <span className="text-zinc-300">{user?.name}</span>
        </p>
      </div>

      {/* Stats Grid */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-stats-grid">
          <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} color="bg-indigo-500/20 text-indigo-400" delay={1} />
          <StatCard label="Active Users" value={stats?.activeUsers || 0} icon={TrendingUp} color="bg-emerald-500/20 text-emerald-400" delay={2} />
          <StatCard label="Total Tasks" value={stats?.totalTasks || 0} icon={CheckSquare} color="bg-blue-500/20 text-blue-400" delay={3} />
          <StatCard label="Pending" value={stats?.pending || 0} icon={Clock} color="bg-amber-500/20 text-amber-400" delay={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="employee-stats-grid">
          <StatCard label="My Tasks" value={stats?.totalTasks || 0} icon={CheckSquare} color="bg-indigo-500/20 text-indigo-400" delay={1} />
          <StatCard label="Pending" value={stats?.pending || 0} icon={Clock} color="bg-amber-500/20 text-amber-400" delay={2} />
          <StatCard label="In Progress" value={stats?.inProgress || 0} icon={TrendingUp} color="bg-blue-500/20 text-blue-400" delay={3} />
          <StatCard label="Completed" value={stats?.completed || 0} icon={CheckSquare} color="bg-emerald-500/20 text-emerald-400" delay={4} />
        </div>
      )}

      {/* Task Status Distribution for Admin */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up stagger-5" data-testid="task-status-distribution">
          {[
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
            { label: 'Review', value: stats.review, color: 'text-purple-400' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-lg p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: 'Manrope' }}>{s.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`grid ${isAdmin ? 'lg:grid-cols-5' : 'grid-cols-1'} gap-6`}>
        {/* Recent Tasks */}
        <Card className="glass-card lg:col-span-3 animate-fade-in-up stagger-5" data-testid="recent-tasks-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white" style={{ fontFamily: 'Manrope' }}>
              {isAdmin ? 'Recent Tasks' : 'My Tasks'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No tasks found</p>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-white/5 transition-colors"
                  data-testid={`task-row-${task.id}`}
                >
                  <PriorityDot priority={task.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{task.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {task.assignedToName || 'Unassigned'}
                      {task.deadline && (
                        <> &middot; Due {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                      )}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Performance (Admin/Manager only) */}
        {isAdmin && (
          <Card className="glass-card lg:col-span-2 animate-fade-in-up stagger-6" data-testid="performance-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-white" style={{ fontFamily: 'Manrope' }}>
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {performance.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">No data</p>
              ) : (
                performance.map((emp, i) => <PerformanceRow key={emp.id} emp={emp} index={i} />)
              )}
            </CardContent>
          </Card>
        )}

        {/* Employee: Overdue Warning */}
        {!isAdmin && stats?.overdue > 0 && (
          <Card className="glass-card border-red-500/20 animate-fade-in-up stagger-6" data-testid="overdue-warning">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{stats.overdue} Overdue Task{stats.overdue > 1 ? 's' : ''}</p>
                <p className="text-xs text-zinc-500">Please update or complete these tasks</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
