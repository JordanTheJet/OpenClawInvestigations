import { Flame } from 'lucide-react';

interface SpiceRatingProps {
  rating: number | null;
  showLabel?: boolean;
}

export default function SpiceRating({ rating, showLabel = false }: SpiceRatingProps) {
  if (rating === null) {
    return <span className="text-gray-400 text-sm">--</span>;
  }

  const getColor = (r: number) => {
    switch (r) {
      case 1:
        return 'text-green-500';
      case 2:
        return 'text-lime-500';
      case 3:
        return 'text-yellow-500';
      case 4:
        return 'text-orange-500';
      case 5:
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getLabel = (r: number) => {
    switch (r) {
      case 1:
        return 'Routine';
      case 2:
        return 'Notable';
      case 3:
        return 'Interesting';
      case 4:
        return 'Significant';
      case 5:
        return 'Major';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Flame
          key={i}
          className={`w-4 h-4 ${i < rating ? getColor(rating) : 'text-gray-200'}`}
          fill={i < rating ? 'currentColor' : 'none'}
        />
      ))}
      {showLabel && <span className={`ml-1 text-sm ${getColor(rating)}`}>{getLabel(rating)}</span>}
    </div>
  );
}
