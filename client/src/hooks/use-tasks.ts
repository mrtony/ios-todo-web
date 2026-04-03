import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Task {
  id: string;
  list_id: string;
  parent_id: string | null;
  title: string;
  notes: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
  priority: number;
  recurrence: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  tags?: { name: string; color: string }[];
}

interface TasksResponse {
  tasks: Task[];
  subtasks: Record<string, Task[]>;
}

export function useTasks(listId: string) {
  return useQuery<TasksResponse>({
    queryKey: ['tasks', listId],
    queryFn: () => api.get(`/lists/${listId}/tasks`).then((res) => res.data),
    enabled: !!listId,
  });
}

export function useSubtasks(parentId: string) {
  return useQuery<Task[]>({
    queryKey: ['subtasks', parentId],
    queryFn: () => api.get(`/tasks/${parentId}/subtasks`).then((res) => res.data),
    enabled: !!parentId,
  });
}

export function useCreateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      notes?: string;
      due_date?: string | null;
      priority?: number;
      flagged?: boolean;
    }) => api.post(`/lists/${listId}/tasks`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useCreateSubtask(parentId: string, listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.post(`/tasks/${parentId}/subtasks`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    },
  });
}

export function useUpdateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      notes?: string;
      due_date?: string | null;
      priority?: number;
      flagged?: boolean;
      recurrence?: string | null;
    }) => api.patch(`/tasks/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    },
  });
}

export function useDeleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useCompleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`).then((res) => res.data),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', listId] });
      const previous = queryClient.getQueryData<TasksResponse>(['tasks', listId]);

      queryClient.setQueryData<TasksResponse>(['tasks', listId], (old) => {
        if (!old) {
          return old;
        }
        const completedAt = new Date().toISOString();
        return {
          tasks: old.tasks.map((task) => (
            task.id === id ? { ...task, completed_at: completedAt } : task
          )),
          subtasks: Object.fromEntries(
            Object.entries(old.subtasks).map(([parentId, subtasks]) => [
              parentId,
              subtasks.map((task) => (
                task.id === id ? { ...task, completed_at: completedAt } : task
              )),
            ]),
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', listId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
    },
  });
}

export function useUncompleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/uncomplete`).then((res) => res.data),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', listId] });
      const previous = queryClient.getQueryData<TasksResponse>(['tasks', listId]);

      queryClient.setQueryData<TasksResponse>(['tasks', listId], (old) => {
        if (!old) {
          return old;
        }
        return {
          tasks: old.tasks.map((task) => (
            task.id === id ? { ...task, completed_at: null } : task
          )),
          subtasks: Object.fromEntries(
            Object.entries(old.subtasks).map(([parentId, subtasks]) => [
              parentId,
              subtasks.map((task) => (
                task.id === id ? { ...task, completed_at: null } : task
              )),
            ]),
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', listId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
    },
  });
}

export function useReorderTasks(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.patch(`/lists/${listId}/tasks/reorder`, { orderedIds }),
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', listId] });
      const previous = queryClient.getQueryData<TasksResponse>(['tasks', listId]);

      queryClient.setQueryData<TasksResponse>(['tasks', listId], (old) => {
        if (!old) {
          return old;
        }
        const map = new Map(old.tasks.map((task) => [task.id, task]));
        const reordered = orderedIds
          .map((id, index) => {
            const task = map.get(id);
            return task ? { ...task, sort_order: index } : null;
          })
          .filter(Boolean) as Task[];
        return { ...old, tasks: reordered };
      });

      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', listId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    },
  });
}
