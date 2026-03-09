"use client";

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: string }> = {
  UPLOADED: {
    label: "Uploaded",
    style: "bg-amber-100 text-amber-800",
    icon: "⏳", // hourglass
  },
  TRANSCRIBING: {
    label: "Transcribing",
    style: "bg-blue-100 text-blue-800",
    icon: "🔄", // processing
  },
  ANALYZING: {
    label: "Analyzing",
    style: "bg-blue-100 text-blue-800",
    icon: "🔍", // analyzing
  },
  READY: {
    label: "Ready",
    style: "bg-emerald-100 text-emerald-800",
    icon: "✓",
  },
  PENDING: {
    label: "Pending",
    style: "bg-amber-100 text-amber-800",
    icon: "⏳",
  },
  PROCESSING: {
    label: "Rendering",
    style: "bg-blue-100 text-blue-800",
    icon: "🔄",
  },
  COMPLETED: {
    label: "Ready",
    style: "bg-emerald-100 text-emerald-800",
    icon: "✓",
  },
  ERROR: {
    label: "Error",
    style: "bg-red-100 text-red-800",
    icon: "✕",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    style: "bg-slate-100 text-slate-700",
    icon: "•",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.style}`}
    >
      <span aria-hidden="true" className="text-[10px] leading-none">{config.icon}</span>
      {config.label}
    </span>
  );
}
