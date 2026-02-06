import { useQuery } from '@tanstack/react-query';
import { FileText, Users, GitBranch, Activity, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import StatsCard from '../components/StatsCard';
import Leaderboard from '../components/Leaderboard';

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">Failed to load statistics</div>
    );
  }

  const processingPercent =
    stats.totalDocuments > 0
      ? ((stats.documentsProcessed / stats.totalDocuments) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Processing Statistics</h1>
        <p className="text-gray-600 mt-1">Real-time overview of the OpenClaw Investigations analysis pipeline</p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Documents Processed</span>
              <span className="font-medium">
                {stats.documentsProcessed.toLocaleString()} / {stats.totalDocuments.toLocaleString()}{' '}
                ({processingPercent}%)
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${processingPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Document Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Documents"
            value={stats.totalDocuments}
            icon={<FileText className="w-6 h-6" />}
          />
          <StatsCard
            title="Processed"
            value={stats.documentsProcessed}
            icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          />
          <StatsCard
            title="Pending"
            value={stats.documentsPending}
            icon={<Clock className="w-6 h-6 text-yellow-500" />}
          />
          <StatsCard
            title="Failed"
            value={stats.documentsFailed}
            icon={<XCircle className="w-6 h-6 text-red-500" />}
          />
        </div>
      </div>

      {/* Task Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Tasks"
            value={stats.totalTasks}
            icon={<Activity className="w-6 h-6" />}
          />
          <StatsCard
            title="Completed"
            value={stats.tasksCompleted}
            icon={<CheckCircle className="w-6 h-6 text-green-500" />}
          />
          <StatsCard
            title="In Progress"
            value={stats.tasksInProgress}
            icon={<Clock className="w-6 h-6 text-yellow-500" />}
          />
        </div>
      </div>

      {/* Entity & Agent Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Knowledge Graph</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatsCard
              title="Entities"
              value={stats.totalEntities}
              icon={<Users className="w-6 h-6" />}
            />
            <StatsCard
              title="Relationships"
              value={stats.totalRelationships}
              icon={<GitBranch className="w-6 h-6" />}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agents</h2>
          <div className="grid grid-cols-2 gap-4">
            <StatsCard title="Total Agents" value={stats.totalAgents} />
            <StatsCard title="Active Agents" value={stats.activeAgents} />
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h2>
        <Leaderboard entries={stats.leaderboard} />
      </div>
    </div>
  );
}
