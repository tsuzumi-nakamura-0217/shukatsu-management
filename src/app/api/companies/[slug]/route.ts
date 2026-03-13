import { NextRequest, NextResponse } from "next/server";
import { getCompany, saveCompany, deleteCompany } from "@/lib/data";
import type { Company } from "@/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
  } catch (error) {
    return NextResponse.json(
      { error: "企業の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
    const updated: Company = { ...company, ...body, slug };
    await saveCompany(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "企業の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
  } catch (error) {
    return NextResponse.json(
      { error: "企業の削除に失敗しました" },
      { status: 500 }
    );
  }
}
