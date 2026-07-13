"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (http, old browser) — select-and-copy still works.
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-ghost shrink-0" aria-live="polite">
      {copied ? "Copied ✓" : label}
    </button>
  );
}
