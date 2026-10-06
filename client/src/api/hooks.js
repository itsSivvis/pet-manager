import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from './client.js';

export const usePets = (archived = false) =>
  useQuery({ queryKey: ['pets', { archived }], queryFn: () => get(`/pets?archived=${archived}`) });

export const usePet = (id) =>
  useQuery({ queryKey: ['pet', String(id)], queryFn: () => get(`/pets/${id}`) });

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => get('/dashboard') });

export const useCatalog = (kind) =>
  useQuery({
    queryKey: ['catalog', kind],
    queryFn: () => get(`/catalog/${kind}`),
    staleTime: 60_000,
  });

/** List + create/update/delete for a pet sub-resource, e.g. 'medications'. */
export function usePetResource(petId, resource) {
  const queryClient = useQueryClient();
  const base = `/pets/${petId}/${resource}`;
  const key = ['pet', String(petId), resource];
  const list = useQuery({ queryKey: key, queryFn: () => get(base) });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['pets'] });
  };
  const create = useMutation({ mutationFn: (data) => post(base, data), onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, ...data }) => patch(`${base}/${id}`, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id) => del(`${base}/${id}`), onSuccess: invalidate });
  return { list, create, update, remove, invalidate, base };
}
