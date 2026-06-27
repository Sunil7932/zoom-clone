"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Extract a meeting code from a raw ID or a pasted invite link. */
function parseCode(input: string): string | null {
  const trimmed = input.trim();
  // If it's a URL, take the last path segment.
  const fromUrl = trimmed.match(/meeting\/([0-9-]{8,})/);
  const candidate = fromUrl ? fromUrl[1] : trimmed;
  const digits = candidate.replace(/\D/g, "");
  if (digits.length !== 10) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 10)}`;
}

export function JoinModal({ open, onClose }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = parseCode(value);
    if (!code) {
      setError("Enter a valid 10-digit Meeting ID or invite link.");
      return;
    }
    setLoading(true);
    try {
      await api.getMeeting(code); // validate existence
      router.push(`/meeting/${code}`);
    } catch (err) {
      const e = err as { status?: number; message?: string };
      setError(
        e.status === 404
          ? "No meeting found with that ID."
          : e.status === 410
            ? "This meeting has already ended."
            : e.message || "Could not join the meeting.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setValue("");
        setError("");
        onClose();
      }}
      title="Join a meeting"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="join-id" className="mb-1 block text-sm font-medium text-gray-600">
            Meeting ID or invite link
          </label>
          <input
            id="join-id"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="123-4567-890"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zoom-blue py-3 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Join
        </button>
      </form>
    </Modal>
  );
}
