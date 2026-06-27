"use client";

import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { meetingLink } from "@/lib/config";
import type { Meeting } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function ScheduleModal({ open, onClose, onScheduled }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDate(defaultDate());
    setTime("10:00");
    setDuration(30);
    setError("");
    setCreated(null);
    setCopied(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Please add a meeting title.");
      return;
    }
    // Combine local date + time into an ISO timestamp.
    const start = new Date(`${date}T${time}`);
    if (isNaN(start.getTime())) {
      setError("Please pick a valid date and time.");
      return;
    }
    setLoading(true);
    try {
      const meeting = await api.schedule({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_start: start.toISOString(),
        duration_minutes: duration,
      });
      setCreated(meeting);
      onScheduled();
    } catch (err) {
      setError((err as Error).message || "Could not schedule the meeting.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* blocked */
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Schedule a meeting" maxWidth="max-w-lg">
      {created ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Meeting scheduled! It now appears in your Upcoming list.
          </div>
          <div>
            <p className="text-sm text-zoom-gray">Meeting ID</p>
            <p className="font-mono text-lg font-semibold text-zoom-ink">{created.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={meetingLink(created.code, created.invite_link)}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
            <button
              onClick={() => copy(meetingLink(created.code, created.invite_link))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={close}
            className="w-full rounded-lg bg-zoom-blue py-3 text-sm font-semibold text-white hover:bg-zoom-blue-dark"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly team sync"
              className={inputCls}
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Agenda, links, notes…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Time">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Duration">
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
            >
              {[15, 30, 45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </select>
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zoom-blue py-3 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Schedule Meeting
          </button>
        </form>
      )}
    </Modal>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
