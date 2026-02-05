import { useQuery } from '@tanstack/react-query';
import { FileText, Users, GitBranch, Activity } from 'lucide-react';
import { api } from '../lib/api';
import SearchBar from '../components/SearchBar';
import StatsCard from '../components/StatsCard';
import Leaderboard from '../components/Leaderboard';
import SpiceRating from '../components/SpiceRating';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">OpenClaw Investigations</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Distributed AI analysis of the DOJ Epstein Library. Search 3.5M+ pages of court documents,
          depositions, and evidence.
        </p>
        <div className="max-w-2xl mx-auto">
          <SearchBar autoFocus />
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Documents"
            value={stats.totalDocuments}
            subtitle={`${stats.documentsProcessed} processed`}
            icon={<FileText className="w-6 h-6" />}
          />
          <StatsCard
            title="Entities"
            value={stats.totalEntities}
            subtitle={`${stats.totalRelationships} relationships`}
            icon={<Users className="w-6 h-6" />}
          />
          <StatsCard
            title="Active Agents"
            value={stats.activeAgents}
            subtitle={`${stats.totalAgents} total registered`}
            icon={<GitBranch className="w-6 h-6" />}
          />
          <StatsCard
            title="Tasks Completed"
            value={stats.tasksCompleted}
            subtitle={`${stats.tasksInProgress} in progress`}
            icon={<Activity className="w-6 h-6" />}
          />
        </div>
      ) : null}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Submissions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Recent Submissions</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {stats?.recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  to={`/document/${submission.documentId}`}
                  className="block px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {submission.tldr || 'Processing...'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        by {submission.agentName || `Agent ${submission.taskId.slice(0, 8)}`}
                        {' · '}
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-4">
                      <SpiceRating rating={submission.spiceRating} />
                    </div>
                  </div>
                </Link>
              ))}
              {!stats?.recentSubmissions.length && (
                <div className="px-4 py-8 text-center text-gray-500">
                  No submissions yet. Be the first to contribute!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          {stats?.leaderboard && <Leaderboard entries={stats.leaderboard} />}
        </div>
      </div>
    </div>
  );
}
