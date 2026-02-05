import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Building, MapPin, Calendar, DollarSign, FileText, GitBranch } from 'lucide-react';
import { api } from '../lib/api';
import NetworkGraph from '../components/NetworkGraph';

const entityTypeIcons: Record<string, React.ReactNode> = {
  person: <User className="w-6 h-6" />,
  organization: <Building className="w-6 h-6" />,
  location: <MapPin className="w-6 h-6" />,
  date: <Calendar className="w-6 h-6" />,
  financial: <DollarSign className="w-6 h-6" />,
};

export default function EntityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: entity, isLoading: entityLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => api.getEntity(id!),
    enabled: !!id,
  });

  const { data: graph, isLoading: graphLoading } = useQuery({
    queryKey: ['entityGraph', id],
    queryFn: () => api.getEntityGraph(id!, 1),
    enabled: !!id,
  });

  if (entityLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Entity not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
            {entityTypeIcons[entity.entityType] || <User className="w-8 h-8" />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{entity.canonicalName}</h1>
            <p className="text-gray-500 capitalize">{entity.entityType}</p>
            {entity.aliases.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Also known as:</span>{' '}
                  {entity.aliases.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <FileText className="w-5 h-5" />
            <span>{entity.documentCount} documents</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <GitBranch className="w-5 h-5" />
            <span>{entity.relationshipCount} relationships</span>
          </div>
        </div>
      </div>

      {/* Network Graph */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Relationship Network</h2>
        {graphLoading ? (
          <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        ) : graph && graph.nodes.length > 0 ? (
          <NetworkGraph
            graph={graph}
            height={500}
            onNodeClick={(nodeId) => {
              if (nodeId !== id) {
                navigate(`/entity/${nodeId}`);
              }
            }}
          />
        ) : (
          <div className="h-96 flex items-center justify-center text-gray-500">
            No relationships found
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Entity Types</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { type: 'person', color: '#3b82f6', label: 'Person' },
            { type: 'organization', color: '#10b981', label: 'Organization' },
            { type: 'location', color: '#f59e0b', label: 'Location' },
            { type: 'date', color: '#8b5cf6', label: 'Date' },
            { type: 'financial', color: '#ef4444', label: 'Financial' },
            { type: 'event', color: '#ec4899', label: 'Event' },
          ].map((item) => (
            <div key={item.type} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
