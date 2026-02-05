import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ExternalLink,
  User,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
} from 'lucide-react';
import { api } from '../lib/api';
import SpiceRating from '../components/SpiceRating';

const entityTypeIcons: Record<string, React.ReactNode> = {
  person: <User className="w-4 h-4" />,
  organization: <Building className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  financial: <DollarSign className="w-4 h-4" />,
};

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  const { document: doc, summary, entities } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {doc.fileName || `Document ${doc.id.slice(0, 8)}`}
              </h1>
              <p className="text-gray-500 capitalize">
                {doc.source} · {doc.fileType}
                {doc.pageCount && ` · ${doc.pageCount} pages`}
              </p>
            </div>
          </div>
          {summary?.spiceRating && <SpiceRating rating={summary.spiceRating} showLabel />}
        </div>

        {/* Metadata */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-medium capitalize">{doc.processingStatus}</p>
          </div>
          {doc.fileSizeBytes && (
            <div>
              <p className="text-gray-500">Size</p>
              <p className="font-medium">
                {(doc.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
          {summary?.credibilityScore && (
            <div>
              <p className="text-gray-500">Credibility</p>
              <p className="font-medium">{(summary.credibilityScore * 100).toFixed(0)}%</p>
            </div>
          )}
          {summary?.documentType && (
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium capitalize">{summary.documentType}</p>
            </div>
          )}
        </div>

        {doc.sourceUrl && (
          <a
            href={doc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center space-x-1 text-primary-600 hover:text-primary-700"
          >
            <span>View original source</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>

          {summary.tldr && (
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-primary-800 font-medium">{summary.tldr}</p>
            </div>
          )}

          {summary.detailedSummary && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Detailed Summary</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{summary.detailedSummary}</p>
            </div>
          )}

          {summary.significance && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Significance</h3>
              <p className="text-gray-600">{summary.significance}</p>
            </div>
          )}

          {summary.keyTopics && summary.keyTopics.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Key Topics</h3>
              <div className="flex flex-wrap gap-2">
                {summary.keyTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-gray-100 text-gray-700"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.dateRange && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Date Range</h3>
              <p className="text-gray-600">{summary.dateRange}</p>
            </div>
          )}
        </div>
      )}

      {/* Entities */}
      {entities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mentioned Entities ({entities.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {entities.map((entity) => (
              <Link
                key={entity.id}
                to={`/entity/${entity.id}`}
                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                  {entityTypeIcons[entity.type] || <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{entity.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {entity.type}
                    {entity.role && ` · ${entity.role}`}
                  </p>
                </div>
                {entity.confidence && (
                  <span className="text-xs text-gray-400">
                    {(entity.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
