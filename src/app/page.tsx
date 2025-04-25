import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-6">MVPアプリケーション</h1>
      <p className="text-xl mb-10">変更容易性と拡張性を重視したアーキテクチャ</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">変更容易性</h2>
          <p>ドメインロジックを独立させ、変更の影響範囲を最小化</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">拡張性</h2>
          <p>段階的スケーリングが可能なCloudflareインフラストラクチャ</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-3">AI活用</h2>
          <p>Mastraフレームワークによる柔軟なAIエージェント構築</p>
        </div>
      </div>
      <div className="mt-10">
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          ダッシュボードへ
        </Link>
      </div>
    </main>
  );
}
