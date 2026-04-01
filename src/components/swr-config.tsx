"use client";

import { SWRConfig } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        dedupingInterval: 5000, // Dedupe identical requests within 5s
        revalidateOnFocus: false, // Don't refetch on window focus (we have our own sync)
        revalidateOnReconnect: true,
        errorRetryCount: 2,
        keepPreviousData: true, // Show stale data while revalidating
      }}
    >
      {children}
    </SWRConfig>
  );
}
