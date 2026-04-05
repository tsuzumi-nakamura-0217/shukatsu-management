"use client";

import useSWR, { mutate as globalMutate } from "swr";
import type { Stats, Company, Task, Interview, ESDocument, AppConfig, SelfAnalysis, CompanyEvent } from "@/types";

const EMPTY_ARRAY: any[] = [];

// --- Stats ---
export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<Stats>("/api/stats");
  return { stats: data ?? null, error, isLoading, mutate };
}

// --- Companies ---
export function useCompanies() {
  const { data, error, isLoading, mutate } = useSWR<Company[]>("/api/companies");
  return { companies: data ?? (EMPTY_ARRAY as Company[]), error, isLoading, mutate };
}

// --- Config ---
export function useConfig() {
  const { data, error, isLoading } = useSWR<AppConfig>("/api/config");
  return { config: data ?? null, error, isLoading };
}

// --- Company Detail (unified) ---
interface CompanyDetailData {
  company: Company;
  tasks: Task[];
  interviews: Interview[];
  esDocs: ESDocument[];
  events: CompanyEvent[];
  config: AppConfig;
}

export function useCompanyDetail(slug: string) {
  const { data, error, isLoading, mutate } = useSWR<CompanyDetailData>(
    slug ? `/api/companies/${slug}/detail` : null
  );

  return {
    company: data?.company ?? null,
    tasks: data?.tasks ?? (EMPTY_ARRAY as Task[]),
    interviews: data?.interviews ?? (EMPTY_ARRAY as Interview[]),
    esDocs: data?.esDocs ?? (EMPTY_ARRAY as ESDocument[]),
    events: data?.events ?? (EMPTY_ARRAY as CompanyEvent[]),
    config: data?.config ?? null,
    error,
    isLoading,
    mutate,
    optimisticUpdate: (updater: (current: CompanyDetailData | undefined) => CompanyDetailData | undefined) => {
      mutate(updater, { revalidate: false });
    },
    revalidate: () => mutate(),
  };
}

// --- Tasks ---
export function useTasks() {
  const { data, error, isLoading, mutate } = useSWR<Task[]>("/api/tasks");
  return { tasks: data ?? (EMPTY_ARRAY as Task[]), error, isLoading, mutate };
}

// --- Self Analysis ---
export function useSelfAnalysis() {
  const { data, error, isLoading, mutate } = useSWR<SelfAnalysis[]>("/api/self-analysis");
  return { items: data ?? (EMPTY_ARRAY as SelfAnalysis[]), error, isLoading, mutate };
}

// --- ES Documents (All) ---
export function useAllESDocs() {
  const { data, error, isLoading, mutate } = useSWR<ESDocument[]>("/api/es");
  return { esDocs: data ?? (EMPTY_ARRAY as ESDocument[]), error, isLoading, mutate };
}

// --- Helpers for cross-key mutation ---
export function invalidateStats() {
  globalMutate("/api/stats");
}

export function invalidateCompanyDetail(slug: string) {
  globalMutate(`/api/companies/${slug}/detail`);
}

export function invalidateAllTasks() {
  globalMutate("/api/tasks");
}

export function invalidateCompanies() {
  globalMutate("/api/companies");
}
