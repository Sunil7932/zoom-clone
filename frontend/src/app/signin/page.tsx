"use client";

import { Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "@/lib/identity";

/**
 * Minimal name-based sign-in. The app has no real auth (per the brief), so this
 * simply re-establishes a display name after the user signs out.
 */
export default function SignInPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    signIn(name.trim());
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] p-4 dark:bg-[#0f1115]">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zoom-blue text-white">
            <Video size={24} />
          </div>
          <h1 className="text-xl font-bold text-zoom-ink">
            Welcome to Zoom<span className="text-zoom-blue">Clone</span>
          </h1>
          <p className="mt-1 text-sm text-zoom-gray">Enter your name to continue.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-lg bg-zoom-blue py-3 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
