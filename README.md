# 🎓 就活マネージャー

就職活動を一元管理するためのローカルWebアプリケーションです。  
データはすべてMarkdown/JSONファイルとして保存されるため、**Gitでバージョン管理**できます。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)

---

## ✨ 機能一覧

### 📊 ダッシュボード
- 応募状況の統計（ステータス別円グラフ・月別棒グラフ）
- 直近の締切・面接スケジュール
- リマインダー通知（期限超過・3日以内の締切）

### 🏢 企業管理
- 企業情報の登録・編集・削除
- Notion風の詳細ページ（選考パイプライン表示）
- ステータス管理（興味あり → 応募準備中 → 応募済 → 選考中 → 内定 / 不採用 / 辞退）
- タグによる分類・フィルタリング
- 企業ごとのES・面接記録・タスク・メモ管理

### ✅ タスク管理
- 全企業横断のタスク一覧
- カテゴリ・優先度・ステータスでフィルタリング
- 企業別の絞り込み
- Notionデータベースとの同期

### 📅 カレンダー
- 面接（青）・締切（赤）・ES提出（黄）を色分け表示
- 月表示 / 週表示の切り替え

### 📝 自己分析
- ガクチカ・強み・弱みのテンプレート
- カスタムノートの追加
- Markdownによるリッチな記述

### 📄 ESテンプレート
- ES・志望動機のテンプレート管理
- テンプレートの作成・編集・プレビュー・コピー

### ⚙️ 設定
- Notion API連携の設定・接続テスト
- 選考ステージのカスタマイズ
- タグの管理（名前・色）
- タスクカテゴリの管理

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | [Next.js](https://nextjs.org/) 16 (App Router) |
| 言語 | TypeScript 5 |
| スタイリング | TailwindCSS 4 + [shadcn/ui](https://ui.shadcn.com/) |
| カレンダー | [FullCalendar](https://fullcalendar.io/) |
| グラフ | [Recharts](https://recharts.org/) |
| Markdown | [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) + gray-matter |
| 外部連携 | [Notion API](https://developers.notion.com/) |
| データ保存 | ファイルシステム（Markdown / JSON） |

---

## 📁 プロジェクト構成

```
shukatsu-management/
├── data/                          # データ保存ディレクトリ（Git管理可能）
│   ├── companies/                 # 企業データ（Markdown + YAML frontmatter）
│   │   └── {slug}/
│   │       ├── index.md           # 企業情報
│   │       ├── es/                # ES書類
│   │       └── interviews/        # 面接記録
│   ├── self-analysis/             # 自己分析ノート
│   ├── templates/                 # ESテンプレート
│   ├── tasks.json                 # タスクデータ
│   └── config.json                # アプリ設定
├── src/
│   ├── app/                       # ページ・APIルート
│   │   ├── page.tsx               # ダッシュボード
│   │   ├── companies/             # 企業一覧・詳細
│   │   ├── tasks/                 # タスク管理
│   │   ├── calendar/              # カレンダー
│   │   ├── self-analysis/         # 自己分析
│   │   ├── templates/             # テンプレート管理
│   │   ├── settings/              # 設定
│   │   └── api/                   # APIエンドポイント
│   │       ├── companies/         # 企業 CRUD
│   │       ├── tasks/             # タスク CRUD
│   │       ├── calendar/          # カレンダーイベント
│   │       ├── stats/             # 統計データ
│   │       ├── self-analysis/     # 自己分析 CRUD
│   │       ├── templates/         # テンプレート CRUD
│   │       ├── config/            # 設定 CRUD
│   │       └── notion/            # Notion連携
│   ├── components/                # 共通UIコンポーネント
│   │   ├── ui/                    # shadcn/ui コンポーネント
│   │   ├── sidebar.tsx            # サイドバーナビゲーション
│   │   ├── badges.tsx             # ステータス・優先度バッジ
│   │   ├── markdown-editor.tsx    # Markdownエディタ
│   │   └── reminder-banner.tsx    # リマインダーバナー
│   ├── lib/                       # ユーティリティ
│   │   ├── data.ts                # データ操作（ファイルI/O）
│   │   ├── notion.ts              # Notion API連携
│   │   └── utils.ts               # 汎用ユーティリティ
│   └── types/
│       └── index.ts               # TypeScript型定義
├── package.json
└── tsconfig.json
```

---

## 🚀 セットアップ

### 必要環境

- **Node.js** 18 以上
- **npm** (Node.js に同梱)

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd shukatsu-management

# 依存パッケージをインストール
npm install
```

### 起動

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド済みアプリを起動
npm run start
```

---

## 🔗 Notion連携（オプション）

タスクをNotionデータベースに同期する機能を利用できます。

### 1. Notionインテグレーションの作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「新しいインテグレーション」を作成
3. APIキー（Internal Integration Secret）をコピー

### 2. Notionデータベースの準備

以下のプロパティを持つデータベースを作成してください：

| プロパティ名 | 型 | 説明 |
|-------------|------|------|
| タスク名 | タイトル | タスクの名前 |
| 企業名 | テキスト | 関連する企業名 |
| カテゴリ | セレクト | タスクのカテゴリ |
| 優先度 | セレクト | high / medium / low |
| 完了 | チェックボックス | 完了状態 |
| 締切 | 日付 | 締切日 |
| メモ | テキスト | メモ |

### 3. アプリで設定

1. データベースのURLからデータベースIDを取得
   - URL: `https://www.notion.so/{データベースID}?v=...`
2. データベースにインテグレーションを接続（データベースの「...」→「接続」→ 作成したインテグレーションを選択）
3. アプリの **設定** ページでAPIキーとデータベースIDを入力
4. 「接続テスト」ボタンで動作確認

---

## 📝 データ管理

### ファイル形式

- **企業データ**: Markdown + YAML frontmatter
- **タスク**: JSON
- **自己分析**: Markdown + YAML frontmatter
- **テンプレート**: Markdown + YAML frontmatter
- **設定**: JSON

### 企業データの例

```markdown
---
name: "〇〇株式会社"
industry: "IT"
status: "選考中"
stage: "一次面接"
url: "https://example.com"
tags: ["IT", "ベンチャー"]
priority: "high"
createdAt: "2026-03-01T00:00:00.000Z"
updatedAt: "2026-03-02T00:00:00.000Z"
---

## メモ

- 説明会参加済み
- 事業内容に興味あり
```

### Git管理

`data/` ディレクトリ全体をGitで管理することで、就活データの変更履歴を残せます。

```bash
git add data/
git commit -m "〇〇株式会社を追加"
```

---

## 📜 利用可能なスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動（ホットリロード対応） |
| `npm run build` | プロダクションビルドを実行 |
| `npm run start` | ビルド済みアプリを起動 |
| `npm run lint` | ESLintによるコードチェック |

---

## ⚠️ 注意事項

- このアプリは**ローカル環境専用**です。デプロイは想定していません。
- データはすべて `data/` ディレクトリにファイルとして保存されます。
- データベースは使用していないため、`data/` ディレクトリのバックアップ・Git管理を推奨します。
- Notion連携はオプション機能です。Notionを使用しなくてもすべての基本機能は利用可能です。

---

## 📄 ライセンス

MIT
