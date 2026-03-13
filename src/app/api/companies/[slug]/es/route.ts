import { NextRequest, NextResponse } from "next/server";
import { getESDocuments, saveESDocument, deleteESDocument } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const docs = getESDocuments(slug);
    return NextResponse.json(docs);
  } catch (error) {
    return NextResponse.json(
      { error: "ESドキュメントの取得に失敗しました" },
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
    const { filename, title, content } = await request.json();
    if (!filename || !title) {
      return NextResponse.json(
        { error: "ファイル名とタイトルは必須です" },
        { status: 400 }
      );
    }
    const doc = saveESDocument(slug, filename, title, content || "");
    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "ESドキュメントの作成に失敗しました" },
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
    const { filename, title, content } = await request.json();
    const doc = saveESDocument(slug, filename, title, content);
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json(
      { error: "ESドキュメントの更新に失敗しました" },
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
    const { filename } = await request.json();
    const deleted = deleteESDocument(slug, filename);
    if (!deleted) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "ESドキュメントの削除に失敗しました" },
      { status: 500 }
    );
  }
}
