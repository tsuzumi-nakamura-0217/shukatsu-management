import { NextRequest, NextResponse } from "next/server";
import { getESDocuments, saveESDocument, deleteESDocument } from "@/lib/data/es";
import { withAuthenticatedUser } from "@/lib/auth-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const docs = await getESDocuments(slug);
      return NextResponse.json(docs);
    } catch {
      return NextResponse.json(
        { error: "ESドキュメントの取得に失敗しました" },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withAuthenticatedUser(request, async () => {
    try {
      const { slug } = await params;
      const { title, content } = await request.json();
      if (!title) {
        return NextResponse.json(
          { error: "タイトルは必須です" },
          { status: 400 }
        );
      }
      const doc = await saveESDocument(slug, null, title, content || "");
      return NextResponse.json(doc, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "ESドキュメントの作成に失敗しました" },
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
      const { id, title, content } = await request.json();
      const doc = await saveESDocument(slug, id, title, content);
      return NextResponse.json(doc);
    } catch {
      return NextResponse.json(
        { error: "ESドキュメントの更新に失敗しました" },
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
      const { id } = await request.json();
      const deleted = await deleteESDocument(slug, id);
      if (!deleted) {
        return NextResponse.json(
          { error: "ファイルが見つかりません" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "ESドキュメントの削除に失敗しました" },
        { status: 500 }
      );
    }
  });
}
