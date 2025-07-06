import Link from "next/link";
import Header from "@/components/auth/Header";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Unauthorized Access
          </h2>
          <p className="text-gray-600 mb-8">
            You don&apos;t have permission to access this page. This area is
            restricted to administrators only.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
