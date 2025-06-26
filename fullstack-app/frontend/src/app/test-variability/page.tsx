import VariabilityChartTest from '@/components/charts/VariabilityChartTest';

export default function TestVariabilityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-800 text-white">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">VariabilityChart Test</h1>
          <p className="text-slate-300 mt-2">Testing the D3.js-based box plot component</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <VariabilityChartTest />
      </main>
    </div>
  );
}