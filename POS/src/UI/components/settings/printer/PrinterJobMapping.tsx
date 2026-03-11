import { useMemo, useState } from "react";
import { Save, CheckSquare, Square } from "lucide-react";
import type { Printer, PrintTemplate } from "@/types/printer";
import { printerService } from "@/services/local/printer.local.service";
import { useNotification } from "@/context/NotificationContext";

interface Props {
  printers: Printer[];
  reload: () => void;
}

// Template → chip CSS vars key + description
const TEMPLATE_META: Record<string, { chipKey: string; description: string }> = {
  POS:         { chipKey: "blue",   description: "Customer receipt with totals & payment" },
  KOT:         { chipKey: "orange", description: "Kitchen order slip with items"          },
  OPEN_TICKET: { chipKey: "violet", description: "Hold order slip for pickup"             },
};

export default function PrinterJobMapping({ printers, reload }: Props) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState<string | null>(null);

  const availableTemplates = useMemo(
    () => printerService.getAvailableTemplateDefinitions(),
    [],
  );

  const [mappings, setMappings] = useState<Record<string, PrintTemplate[]>>(() => {
    const init: Record<string, PrintTemplate[]> = {};
    printers.forEach((p) => { init[p.id] = printerService.getTemplatesForPrinter(p); });
    return init;
  });

  const toggle = (printerId: string, tpl: PrintTemplate) => {
    setMappings((prev) => {
      const cur = prev[printerId] ?? [];
      return {
        ...prev,
        [printerId]: cur.includes(tpl) ? cur.filter((t) => t !== tpl) : [...cur, tpl],
      };
    });
  };

  const save = async (printerId: string) => {
    const printer = printers.find((p) => p.id === printerId);
    if (!printer) return;
    setSaving(printerId);
    try {
      await printerService.savePrinter({
        ...printer,
        print_templates: JSON.stringify(mappings[printerId] ?? []),
      });
      reload();
      showNotification.success("Template mapping saved");
    } catch (e) {
      showNotification.error("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(null);
    }
  };

  const toggleActive = async (printer: Printer) => {
    try {
      await printerService.setPrinterActive(printer.id, !printer.is_active);
      reload();
    } catch (e) {
      showNotification.error("Failed: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  if (printers.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-sm font-medium">No printers configured yet.</p>
        <p className="text-xs text-muted">Add a printer first, then assign templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted max-w-2xl leading-relaxed">
        Assign print templates to each printer. A single printer can handle multiple
        templates — e.g. both POS receipts and KOT slips.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {printers.map((printer) => {
          const selected = mappings[printer.id] ?? [];
          const isSaving = saving === printer.id;

          return (
            <div key={printer.id} className="card flex flex-col overflow-hidden">

              {/* Card header */}
              <div className="px-4 pt-4 pb-3 border-b border-subtle">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{printer.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {printer.printer_type.toUpperCase()}
                      {printer.paper_width ? ` · ${printer.paper_width}` : ""}
                    </p>
                  </div>

                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => toggleActive(printer)}
                    className={`toggle shrink-0 ${printer.is_active ? "on" : ""}`}
                    title={printer.is_active ? "Deactivate" : "Activate"}
                  />
                </div>
              </div>

              {/* Template checkboxes */}
              <div className="px-4 py-3 flex-1 space-y-2">
                {availableTemplates.map((tpl) => {
                  const isChecked = selected.includes(tpl.type);
                  const meta = TEMPLATE_META[tpl.type];
                  const ck = meta?.chipKey ?? "gray";

                  return (
                    <button
                      key={tpl.type}
                      type="button"
                      onClick={() => toggle(printer.id, tpl.type)}
                      style={isChecked ? {
                        backgroundColor: `var(--chip-${ck}-bg)`,
                        borderColor:     `var(--chip-${ck}-border)`,
                        color:           `var(--chip-${ck}-text)`,
                      } : {
                        backgroundColor: "var(--color-surface-sunken)",
                        borderColor:     "var(--color-border-subtle)",
                        color:           "var(--color-text-secondary)",
                      }}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left"
                    >
                      <span className="mt-0.5 shrink-0" style={{ opacity: isChecked ? 1 : 0.35 }}>
                        {isChecked
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{tpl.name}</p>
                        <p
                          className="text-xs mt-0.5 leading-tight"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {meta?.description ?? ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Save */}
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => save(printer.id)}
                  disabled={isSaving}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving…" : "Save Mapping"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
