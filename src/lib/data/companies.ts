import { supabase } from "../supabase";
import { encryptCompanyPassword, decryptCompanyPassword } from "../company-credentials";
import { generateSlug } from "./utils";
import { getConfig } from "./config";
import type { Company, CompanyCreate } from "@/types";

export function rowToCompany(row: Record<string, unknown>): Company {
  let decryptedPassword = "";
  try {
    decryptedPassword = decryptCompanyPassword(
      (row.password_encrypted as string) || ""
    );
  } catch {
    decryptedPassword = "";
  }

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    industry: (row.industry as string) || "",
    url: (row.url as string) || "",
    mypageUrl: (row.mypage_url as string) || "",
    loginId: (row.login_id as string) || "",
    password: decryptedPassword,
    location: (row.location as string) || "",
    status: (row.status as string) || "未応募",
    priority: (row.priority as number) || 3,
    stages: (row.stages as string[]) || [],
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
    memo: (row.memo as string) || "",
    expectedResultPeriod: (row.expected_result_period as string) || "",
  };
}

export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("priority", { ascending: false });

  if (error || !data) return [];
  return data.map(rowToCompany);
}

export async function getCompany(slug: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return rowToCompany(data);
}

export async function createCompany(input: CompanyCreate): Promise<Company> {
  const config = await getConfig();
  let slug = generateSlug(input.name);

  // Ensure unique slug
  const { data: existing } = await supabase
    .from("companies")
    .select("slug")
    .eq("slug", slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const row = {
    slug,
    name: input.name,
    industry: input.industry || "",
    url: input.url || "",
    mypage_url: input.mypageUrl || "",
    login_id: input.loginId || "",
    password_encrypted: encryptCompanyPassword(input.password || ""),
    location: input.location || "",
    status: input.status || "未応募",
    priority: input.priority || 3,
    stages: input.stages || config.defaultStages,
    memo: "",
    expected_result_period: input.expectedResultPeriod || "",
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create company: ${error?.message}`);
  }

  return rowToCompany(data);
}

export async function saveCompany(company: Company): Promise<void> {
  await supabase
    .from("companies")
    .update({
      name: company.name,
      industry: company.industry,
      url: company.url,
      mypage_url: company.mypageUrl,
      login_id: company.loginId,
      password_encrypted: encryptCompanyPassword(company.password),
      location: company.location,
      status: company.status,
      priority: company.priority,
      stages: company.stages,
      memo: company.memo,
      expected_result_period: company.expectedResultPeriod || "",
      updated_at: new Date().toISOString(),
    })
    .eq("slug", company.slug);
}

export async function deleteCompany(slug: string): Promise<boolean> {
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("slug", slug);

  return !error;
}
