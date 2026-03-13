import { NextRequest, NextResponse } from "next/server";
import { getAllCompanies, createCompany } from "@/lib/data";
import type { CompanyCreate } from "@/types";
import { withAuthenticatedUser } from "@/lib/auth-server";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const companies = await getAllCompanies();
      return NextResponse.json(companies);
    } catch {
      return NextResponse.json(
        { error: "企業一覧の取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async () => {
    try {
      const body: CompanyCreate = await request.json();
      if (!body.name?.trim()) {
        return NextResponse.json(
          { error: "企業名は必須です" },
          { status: 400 }
        );
      }

      if (body.url && !isValidHttpUrl(body.url)) {
        return NextResponse.json(
          { error: "企業URLの形式が正しくありません" },
          { status: 400 }
        );
      }

      if (body.mypageUrl && !isValidHttpUrl(body.mypageUrl)) {
        return NextResponse.json(
          { error: "マイページURLの形式が正しくありません" },
          { status: 400 }
        );
      }

      const company = await createCompany(body);
      return NextResponse.json(company, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "企業の作成に失敗しました" },
        { status: 500 }
      );
    }
  });
}
