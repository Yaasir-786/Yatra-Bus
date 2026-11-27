import Link from 'next/link';
import { ArrowLeft, Bus } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Bus className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The route or page you requested could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
