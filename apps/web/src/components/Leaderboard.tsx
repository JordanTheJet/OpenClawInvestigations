import { Trophy, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '../lib/api';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-gray-500">{rank}</span>;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Top Contributors</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {entries.map((entry) => (
          <div
            key={entry.agentId}
            className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              {getRankIcon(entry.rank)}
              <div>
                <p className="font-medium text-gray-900">
                  {entry.agentName || `Agent ${entry.agentId.slice(0, 8)}`}
                </p>
                <p className="text-sm text-gray-500">{entry.tasksCompleted} tasks</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary-600">
                {entry.pointsBalance.toLocaleString()} pts
              </p>
              <p className="text-sm text-gray-500">
                {(entry.consensusRate * 100).toFixed(0)}% consensus
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
