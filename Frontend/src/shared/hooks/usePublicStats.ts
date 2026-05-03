import { useEffect, useState } from 'react';

export interface DayRevenue {
  date: string;
  amount: number;
}

export interface DayJobs {
  date: string;
  count: number;
}

export interface ServiceTypeStats {
  name: string;
  count: number;
  revenue: number;
}

export interface PublicStats {
  summary: {
    total_jobs_completed: number;
    total_customers: number;
    total_revenue: number;
    total_parts: number;
    active_services: number;
  };
  charts: {
    revenue_by_day: DayRevenue[];
    jobs_by_day: DayJobs[];
    service_status: {
      pending: number;
      ongoing: number;
      completed: number;
    };
    payment_methods: {
      cash: number;
      gcash: number;
    };
    top_service_types: ServiceTypeStats[];
  };
}

export function usePublicStats() {
  const [data, setData] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.VITE_API_BASE_URL ?? '';

    fetch(`${base}/api/stats`, {
      headers: {
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Stats fetch failed');
        return response.json() as Promise<PublicStats>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
