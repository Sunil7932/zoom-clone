"use client";

import { Mic, Video } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getDisplayName, getJoinPrefs, setDisplayName, setJoinPrefs } from "@/lib/identity";

interface Props {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}

/** Settings: edit display name and default join preferences. */
export function SettingsModal({ open, currentName, onClose, onSaved }: Props) {
  const [name, setName] = useState(getDisplayName() || currentName);
  const prefs = getJoinPrefs();
  const [mic, setMic] = useState(prefs.mic);
  const [cam, setCam] = useState(prefs.cam);

  const save = () => {
    if (name.trim()) setDisplayName(name);
    setJoinPrefs({ mic, cam });
    onSaved(name.trim() || currentName);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <label htmlFor="set-name" className="mb-1 block text-sm font-medium text-gray-600">
            Display name
          </label>
          <input
            id="set-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
          />
          <p className="mt-1 text-xs text-zoom-gray">
            Used across the app and pre-filled when you join meetings.
          </p>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-600">When joining a meeting</p>
          <Toggle
            icon={<Mic size={16} />}
            label="Turn on microphone"
            checked={mic}
            onChange={() => setMic((v) => !v)}
          />
          <Toggle
            icon={<Video size={16} />}
            label="Turn on camera"
            checked={cam}
            onChange={() => setCam((v) => !v)}
          />
        </div>

        <button
          onClick={save}
          className="w-full rounded-lg bg-zoom-blue py-3 text-sm font-semibold text-white transition hover:bg-zoom-blue-dark"
        >
          Save changes
        </button>
      </div>
    </Modal>
  );
}

function Toggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center justify-between rounded-lg px-1 py-2.5 text-left"
    >
      <span className="flex items-center gap-2 text-sm text-zoom-ink">
        <span className="text-gray-500">{icon}</span>
        {label}
      </span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-zoom-blue" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
