import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getCompany, saveCompany, deleteCompany } from "@/lib/data/companies";
import type { Company } from "@/types";
import { withAuthenticatedUser } from "@/lib/auth-server";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const company = await getCompany(slug);
      if (!company) {
        return NextResponse.json(
          { error: "企業が見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json(company);
    } catch {
      return NextResponse.json(
        { error: "企業の取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const company = await getCompany(slug);
      if (!company) {
        return NextResponse.json(
          { error: "企業が見つかりません" },
          { status: 404 }
        );
      }

      const body: Partial<Company> = await request.json();

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

      const updated: Company = { ...company, ...body, slug };
      await saveCompany(updated);
      return NextResponse.json(updated);
    } catch {
      return NextResponse.json(
        { error: "企業の更新に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const deleted = await deleteCompany(slug);
      if (!deleted) {
        return NextResponse.json(
          { error: "企業が見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "企業の削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
