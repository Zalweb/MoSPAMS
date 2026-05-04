import { useState, useCallback } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiGet } from '@/shared/lib/api';

export interface PaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta | null;
}

interface UsePaginatedFetchResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  meta: PaginationMeta | null;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  prependItem: (item: T) => void;
  updateItem: (id: string | number, idKey: keyof T, updated: T) => void;
  removeItem: (id: string | number, idKey: keyof T) => void;
}

export function usePaginatedFetch<T>(
  path: string,
  perPage = 25,
  extraParams: Record<string, string> = {},
): UsePaginatedFetchResult<T> {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Stable query key — React Query caches by key, so navigating back = instant
  const queryKey = ['paginated', path, page, perPage, extraParams] as const;

  const { data: response, isFetching, error: queryError, refetch: tqRefetch } = useQuery<PaginatedResponse<T>>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        ...extraParams,
      });
      return apiGet<PaginatedResponse<T>>(`${path}?${params.toString()}`);
    },
    placeholderData: keepPreviousData, // keeps previous page visible while next page loads
  });

  const data = response?.data ?? [];
  const meta = response?.meta ?? null;
  const loading = isFetching;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load data') : null;

  const refetch = useCallback(() => { void tqRefetch(); }, [tqRefetch]);

  // Optimistic helpers — mutate the cache directly, no refetch needed
  const prependItem = useCallback((item: T) => {
    queryClient.setQueryData<PaginatedResponse<T>>(queryKey, old =>
      old ? { ...old, data: [item, ...old.data] } : { data: [item], meta: null },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, JSON.stringify(queryKey)]);

  const updateItem = useCallback((id: string | number, idKey: keyof T, updated: T) => {
    queryClient.setQueryData<PaginatedResponse<T>>(queryKey, old =>
      old ? { ...old, data: old.data.map(item => (item[idKey] as unknown) === id ? updated : item) } : old,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, JSON.stringify(queryKey)]);

  const removeItem = useCallback((id: string | number, idKey: keyof T) => {
    queryClient.setQueryData<PaginatedResponse<T>>(queryKey, old =>
      old ? { ...old, data: old.data.filter(item => (item[idKey] as unknown) !== id) } : old,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, JSON.stringify(queryKey)]);

  return { data, loading, error, meta, page, setPage, refetch, prependItem, updateItem, removeItem };
}
