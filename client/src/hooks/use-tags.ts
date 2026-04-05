import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  task_count: number;
}

interface Task {
  id: string;
  list_id: string;
  title: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
  sort_order: number;
}

export function useTaskTags(taskId: string) {
  return useQuery<Tag[]>({
    queryKey: ['taskTags', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/tags`).then((res) => res.data),
    enabled: !!taskId,
  });
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then((res) => res.data),
  });
}

export function useTagsWithCounts() {
  return useQuery<TagWithCount[]>({
    queryKey: ['tags-with-counts'],
    queryFn: () => api.get('/tags/with-counts').then((res) => res.data),
  });
}

export function useTasksByTag(tagId: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks-by-tag', tagId],
    queryFn: () => api.get(`/tags/${tagId}/tasks`).then((res) => res.data),
    enabled: !!tagId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post('/tags', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch(`/tags/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
    },
  });
}

export function useAddTagToTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.post(`/tasks/${taskId}/tags`, { tagId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskTags', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tag', variables.tagId] });
    },
  });
}

export function useRemoveTagFromTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.delete(`/tasks/${taskId}/tags/${tagId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskTags', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tag', variables.tagId] });
    },
  });
}
