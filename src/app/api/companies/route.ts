import { NextRequest, NextResponse } from "next/server";
import { getAllCompanies, createCompany } from "@/lib/data";
import type { CompanyCreate } from "@/types";

export async function GET() {
  try {
    const companies = getAllCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    return NextResponse.json(
      { error: "企業一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CompanyCreate = await request.json();
    if (!body.name) {
      return NextResponse.json(
        { error: "企業名は必須です" },
        { status: 400 }
      );
    }
    const company = createCompany(body);
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "企業の作成に失敗しました" },
      { status: 500 }
    );
  }
}
