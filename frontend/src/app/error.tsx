"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary (Next.js App Router). Catches render/runtime errors
 * in any page and shows a recovery UI instead of a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where you'd report to Sentry/your logger.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] p-4">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle size={26} />
        </div>
        <h1 className="text-lg font-semibold text-zoom-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-zoom-gray">
          An unexpected error occurred. You can try again, or head back to the
          dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-zoom-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
