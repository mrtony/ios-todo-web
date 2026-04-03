import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface List {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useLists() {
  return useQuery<List[]>({
    queryKey: ['lists'],
    queryFn: () => api.get('/lists').then((res) => res.data),
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string; icon?: string }) =>
      api.post('/lists', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string; icon?: string }) =>
      api.patch(`/lists/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useReorderLists() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.patch('/lists/reorder', { orderedIds }),
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] });
      const previous = queryClient.getQueryData<List[]>(['lists']);

      queryClient.setQueryData<List[]>(['lists'], (old) => {
        if (!old) {
          return old;
        }
        const map = new Map(old.map((list) => [list.id, list]));
        return orderedIds.map((id, index) => ({ ...map.get(id)!, sort_order: index }));
      });

      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['lists'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}
