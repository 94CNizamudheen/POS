import { useState } from "react";
import {
  Printer, Wifi, Usb, Bluetooth, Monitor, Cpu,
  Pencil, Trash2, CheckCircle, AlertCircle, RefreshCw,
} from "lucide-react";
import type { Printer as PrinterType } from "@/types/printer";
import { printerService } from "@/services/local/printer.local.service";
import { useNotification } from "@/context/NotificationContext";

interface Props {
  printer: PrinterType;
  reload: () => void;
  onEdit: (p: PrinterType) => void;
}

// Maps printer type → chip class + icon
const TYPE_META: Record<string, { icon: React.ReactNode; label: string; chip: string; accent: string }> = {
  network:   { icon: <Wifi className="w-4 h-4" />,      label: "Network",   chip: "chip chip-blue",   accent: "var(--chip-blue-border)"   },
  usb:       { icon: <Usb className="w-4 h-4" />,       label: "USB",       chip: "chip chip-orange", accent: "var(--chip-orange-border)" },
  bluetooth: { icon: <Bluetooth className="w-4 h-4" />, label: "Bluetooth", chip: "chip chip-indigo", accent: "var(--chip-indigo-border)" },
  system:    { icon: <Monitor className="w-4 h-4" />,   label: "System",    chip: "chip chip-gray",   accent: "var(--color-border-strong)" },
  builtin:   { icon: <Cpu className="w-4 h-4" />,       label: "Built-in",  chip: "chip chip-violet", accent: "var(--chip-violet-border)" },
};

export default function PrinterCard({ printer, reload, onEdit }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [testing, setTesting] = useState(false);
  const { showNotification } = useNotification();

  const meta = TYPE_META[printer.printer_type] ?? {
    icon: <Printer className="w-4 h-4" />,
    label: printer.printer_type,
    chip: "chip chip-gray",
    accent: "var(--color-border-default)",
  };

  function getConnectionInfo() {
    switch (printer.printer_type) {
      case "network":   return `${printer.ip_address ?? "—"}:${printer.port ?? 9100}`;
      case "builtin":   return "Built-in Thermal Printer";
      case "usb":       return "USB Printer";
      case "bluetooth": return printer.bluetooth_address ?? "Bluetooth Printer";
      case "system":    return "System Driver";
      default:          return printer.printer_type;
    }
  }

  async function testPrinter() {
    setTesting(true);
    try {
      await printerService.testPrinter(printer);
      showNotification.success("Test page sent!");
    } catch (e) {
      showNotification.error("Test failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTesting(false);
    }
  }

  async function deletePrinter() {
    await printerService.deletePrinter(printer.id);
    setShowConfirm(false);
    reload();
  }

  return (
    <div className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow">

      {/* Type accent bar */}
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: meta.accent }} />

      <div className="p-5 flex-1 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Icon badge using chip bg/text */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `var(--chip-${printer.printer_type === "network" ? "blue" : printer.printer_type === "usb" ? "orange" : printer.printer_type === "bluetooth" ? "indigo" : printer.printer_type === "builtin" ? "violet" : "gray"}-bg)`,
                color: `var(--chip-${printer.printer_type === "network" ? "blue" : printer.printer_type === "usb" ? "orange" : printer.printer_type === "bluetooth" ? "indigo" : printer.printer_type === "builtin" ? "violet" : "gray"}-text)`,
              }}
            >
              {meta.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{printer.name}</p>
              <p className="text-xs text-muted mt-0.5 break-all">{getConnectionInfo()}</p>
            </div>
          </div>

          {/* Active badge */}
          <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            printer.is_active
              ? "bg-success-subtle text-success"
              : "bg-surface-sunken text-muted"
          }`}>
            {printer.is_active
              ? <><CheckCircle className="w-3 h-3" /> Active</>
              : <><AlertCircle className="w-3 h-3" /> Inactive</>}
          </span>
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={meta.chip}>{meta.label}</span>

          {printer.paper_width && (
            <span className="chip chip-gray">{printer.paper_width}</span>
          )}
          {printer.chars_per_line && (
            <span className="chip chip-gray">{printer.chars_per_line} chars</span>
          )}
          {printer.print_templates && (() => {
            try {
              const tpls: string[] = JSON.parse(printer.print_templates);
              return tpls.map((t) => (
                <span key={t} className="chip chip-violet">{t}</span>
              ));
            } catch { return null; }
          })()}
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-subtle px-4 py-3 flex items-center gap-2">
        <button
          onClick={testPrinter}
          disabled={testing}
          className="btn-primary flex-1 flex items-center justify-center gap-1.5 py-2 text-xs"
        >
          {testing
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <Printer className="w-3.5 h-3.5" />}
          {testing ? "Sending…" : "Test Print"}
        </button>

        <button
          onClick={() => onEdit(printer)}
          className="btn-outline flex items-center justify-center gap-1.5 px-3 py-2 text-xs"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>

        <button
          onClick={() => setShowConfirm(true)}
          className="btn-ghost p-2 text-danger"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline delete confirm */}
      {showConfirm && (
        <div className="border-t border-danger bg-danger-subtle px-4 py-3">
          <p className="text-xs font-semibold text-danger mb-2">Delete "{printer.name}"?</p>
          <div className="flex gap-2">
            <button
              onClick={deletePrinter}
              className="btn-danger flex-1 py-1.5 text-xs"
            >
              Delete
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="btn-outline flex-1 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
