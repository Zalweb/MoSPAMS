import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // data stays fresh 30 s — no redundant refetches on tab focus
      gcTime: 5 * 60_000,       // keep unused cache 5 min
      retry: 1,                 // one retry on network error
      refetchOnWindowFocus: false,
    },
  },
});
