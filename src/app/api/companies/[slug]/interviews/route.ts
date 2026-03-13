import { NextRequest, NextResponse } from "next/server";
import {
  getInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
} from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const interviews = await getInterviews(slug);
    return NextResponse.json(interviews);
  } catch (error) {
    return NextResponse.json(
      { error: "面接記録の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    if (!body.type || !body.date) {
      return NextResponse.json(
        { error: "面接タイプと日付は必須です" },
        { status: 400 }
      );
    }
    const interview = await createInterview(slug, body);
    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "面接記録の作成に失敗しました" },
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
    const body = await request.json();
    const { id, ...updates } = body;
    const interview = await updateInterview(slug, id, updates);
    if (!interview) {
      return NextResponse.json(
        { error: "面接記録が見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json(interview);
  } catch (error) {
    return NextResponse.json(
      { error: "面接記録の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { id } = await request.json();
    const deleted = await deleteInterview(slug, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "面接記録が見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "面接記録の削除に失敗しました" },
      { status: 500 }
    );
  }
}
