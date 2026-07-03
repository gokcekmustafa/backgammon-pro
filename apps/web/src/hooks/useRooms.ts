import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  openTableCount: number;
  sortOrder: number;
}

interface RoomsResponse {
  rooms: Room[];
}

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => api<RoomsResponse>('/api/rooms'),
    staleTime: 30000,
  });
}
