import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, User, Building, MapPin, Calendar, DollarSign } from 'lucide-react';
import { api } from '../lib/api';
import SearchBar from '../components/SearchBar';
import SpiceRating from '../components/SpiceRating';

const entityTypeIcons: Record<string, React.ReactNode> = {
  person: <User className="w-4 h-4" />,
  organization: <Building className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  financial: <DollarSign className="w-4 h-4" />,
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<'all' | 'documents' | 'entities'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', query, tab],
    queryFn: () => api.search(query, tab, 20, 0),
    enabled: query.length > 0,
  });

  useEffect(() => {
    if (initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    setSearchParams({ q: newQuery });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto">
        <SearchBar defaultValue={query} onSearch={handleSearch} />
      </div>

      {query && (
        <>
          {/* Tabs */}
          <div className="flex space-x-1 border-b border-gray-200">
            {(['all', 'documents', 'entities'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {data && t === 'documents' && ` (${data.totalDocuments})`}
                {data && t === 'entities' && ` (${data.totalEntities})`}
              </button>
            ))}
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              Error loading results. Please try again.
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Documents */}
              {(tab === 'all' || tab === 'documents') && data.documents.length > 0 && (
                <div className="space-y-3">
                  {tab === 'all' && (
                    <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
                  )}
                  {data.documents.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/document/${doc.id}`}
                      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {doc.fileName || `Document ${doc.id.slice(0, 8)}`}
                            </p>
                            {doc.tldr && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{doc.tldr}</p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              Source: {doc.source} · Type: {doc.fileType}
                            </p>
                          </div>
                        </div>
                        <SpiceRating rating={doc.spiceRating} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Entities */}
              {(tab === 'all' || tab === 'entities') && data.entities.length > 0 && (
                <div className="space-y-3">
                  {tab === 'all' && (
                    <h2 className="text-lg font-semibold text-gray-900">Entities</h2>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.entities.map((entity) => (
                      <Link
                        key={entity.id}
                        to={`/entity/${entity.id}`}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                            {entityTypeIcons[entity.entityType] || <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{entity.canonicalName}</p>
                            <p className="text-sm text-gray-500 capitalize">{entity.entityType}</p>
                          </div>
                        </div>
                        {entity.aliases.length > 0 && (
                          <p className="mt-2 text-xs text-gray-500">
                            Also known as: {entity.aliases.slice(0, 3).join(', ')}
                            {entity.aliases.length > 3 && ` +${entity.aliases.length - 3} more`}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {data.documents.length === 0 && data.entities.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No results found for "{query}"
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
