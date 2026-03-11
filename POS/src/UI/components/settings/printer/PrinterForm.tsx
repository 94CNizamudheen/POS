import { useState, useEffect } from "react";
import {
  Wifi, Monitor, Bluetooth, Usb, RefreshCw,
  CheckCircle, XCircle, Plus, Cpu,
} from "lucide-react";
import type { Printer, SystemPrinter } from "@/types/printer";
import { printerService } from "@/services/local/printer.local.service";
import { useNotification } from "@/context/NotificationContext";

type ConnType = "network" | "usb" | "bluetooth" | "system" | "builtin";

interface Props {
  editing: Printer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CONN_TYPES: Array<{ type: ConnType; label: string; icon: React.ReactNode; description: string }> = [
  { type: "network",   label: "Network",   icon: <Wifi className="w-4 h-4" />,      description: "Ethernet / Wi-Fi (IP)" },
  { type: "system",    label: "System",    icon: <Monitor className="w-4 h-4" />,   description: "OS printer driver"     },
  { type: "bluetooth", label: "Bluetooth", icon: <Bluetooth className="w-4 h-4" />, description: "Paired BT device"      },
  { type: "usb",       label: "USB",       icon: <Usb className="w-4 h-4" />,       description: "Direct USB"            },
  { type: "builtin",   label: "Built-in",  icon: <Cpu className="w-4 h-4" />,       description: "Device built-in"       },
];

const PAPER_SIZES = [
  { size: "58mm" as const, chars: 32, label: "58 mm" },
  { size: "80mm" as const, chars: 48, label: "80 mm" },
];

function newPrinter(): Printer {
  return {
    id: crypto.randomUUID(),
    name: "",
    printer_type: "network",
    ip_address: "",
    port: 9100,
    paper_width: "80mm",
    chars_per_line: 48,
    is_active: true,
  };
}

// Selector button: active vs idle state via CSS vars
const selectorActive = {
  borderColor: "var(--color-border-strong)",
  backgroundColor: "var(--color-brand-subtle)",
} as React.CSSProperties;

const selectorIdle = {
  borderColor: "var(--color-border-default)",
  backgroundColor: "var(--color-surface-raised)",
} as React.CSSProperties;

export default function PrinterForm({ editing, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<Printer>(editing ?? newPrinter());
  const [isNew] = useState(!editing?.created_at);
  const [saving, setSaving] = useState(false);

  const [systemPrinters, setSystemPrinters] = useState<SystemPrinter[]>([]);
  const [loadingSystem, setLoadingSystem] = useState(false);

  const [btPorts, setBtPorts] = useState<{ name: string; label: string; is_bluetooth: boolean }[]>([]);
  const [loadingBt, setLoadingBt] = useState(false);
  const [btTestStatus, setBtTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [btTestError, setBtTestError] = useState("");

  const { showNotification } = useNotification();

  useEffect(() => {
    setForm(editing ?? newPrinter());
    setBtTestStatus("idle");
  }, [editing]);

  const update = (patch: Partial<Printer>) => {
    if (patch.bluetooth_address && patch.bluetooth_address !== form.bluetooth_address) {
      setBtTestStatus("idle");
      setBtTestError("");
    }
    setForm((f) => ({ ...f, ...patch }));
  };

  const discoverSystem = async () => {
    setLoadingSystem(true);
    try {
      const discovered = await printerService.getSystemPrinters();
      const existing = await printerService.getAllPrinters();
      const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
      setSystemPrinters(discovered.filter((sp) => !existingNames.has(sp.name.toLowerCase())));
    } catch (e) {
      showNotification.error("Discovery failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoadingSystem(false);
    }
  };

  const addSystemPrinter = async (sp: SystemPrinter) => {
    try {
      await printerService.addSystemPrinterToApp(sp, (form.paper_width as "58mm" | "80mm") ?? "80mm");
      showNotification.success(`"${sp.name}" added!`);
      setSystemPrinters((prev) => prev.filter((p) => p.name !== sp.name));
      onSuccess();
    } catch (e) {
      showNotification.error("Failed: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const loadBtPorts = async () => {
    setLoadingBt(true);
    try {
      setBtPorts(await printerService.listBluetoothPorts());
    } finally {
      setLoadingBt(false);
    }
  };

  const testBt = () => {
    if (!form.bluetooth_address) return;
    setBtTestStatus("testing");
    setTimeout(() => {
      const result = printerService.testBluetoothConnection(form.bluetooth_address!);
      if (result.success) {
        setBtTestStatus("ok");
      } else {
        setBtTestStatus("fail");
        setBtTestError(result.error ?? "Connection failed");
      }
    }, 50);
  };

  const validate = (): string | null => {
    if (!form.name.trim() && form.printer_type !== "system") return "Printer name is required";
    if (form.printer_type === "network") {
      if (!form.ip_address?.trim()) return "IP address is required";
      if (!form.port || form.port <= 0) return "Valid port is required";
    }
    if (form.printer_type === "bluetooth" && !form.bluetooth_address?.trim()) {
      return "Bluetooth address is required";
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { showNotification.error(err); return; }

    setSaving(true);
    try {
      const all = await printerService.getAllPrinters();
      const others = all.filter((p) => p.id !== form.id);
      if (others.some((p) => p.name.toLowerCase().trim() === form.name.toLowerCase().trim())) {
        showNotification.error("A printer with this name already exists");
        return;
      }
      if (form.printer_type === "network") {
        if (others.some((p) => p.printer_type === "network" && p.ip_address === form.ip_address && p.port === form.port)) {
          showNotification.error("A printer with this IP and port already exists");
          return;
        }
      }
      await printerService.savePrinter(form);
      showNotification.success(isNew ? "Printer added!" : "Printer updated!");
      onSuccess();
    } catch {
      showNotification.error("Failed to save printer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Connection type ── */}
      <div>
        <p className="section-label mb-2">Connection Type</p>
        <div className="grid grid-cols-5 gap-2">
          {CONN_TYPES.map((ct) => {
            const isActive = form.printer_type === ct.type;
            return (
              <button
                key={ct.type}
                type="button"
                onClick={() => update({ printer_type: ct.type })}
                style={isActive ? selectorActive : selectorIdle}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all"
              >
                <span style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                  {ct.icon}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
                >
                  {ct.label}
                </span>
                <span className="text-[10px] text-center leading-tight text-muted">{ct.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-column fields ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Left column */}
        <div className="space-y-4">

          {/* Name */}
          {form.printer_type !== "system" && (
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Printer Station Name
              </label>
              <input
                type="text"
                placeholder="e.g. Kitchen Printer"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                className="input-field"
              />
            </div>
          )}

          {/* Network */}
          {form.printer_type === "network" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">IP Address</label>
                <input
                  type="text"
                  placeholder="192.168.1.100"
                  value={form.ip_address ?? ""}
                  onChange={(e) => update({ ip_address: e.target.value })}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">Port</label>
                <input
                  type="number"
                  placeholder="9100"
                  value={form.port ?? 9100}
                  onChange={(e) => update({ port: Number(e.target.value) })}
                  className="input-field font-mono"
                />
              </div>
            </>
          )}

          {/* Bluetooth */}
          {form.printer_type === "bluetooth" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-secondary">Bluetooth COM Port</label>
                  <button
                    type="button"
                    onClick={loadBtPorts}
                    disabled={loadingBt}
                    className="btn-ghost flex items-center gap-1 text-xs px-2 py-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingBt ? "animate-spin" : ""}`} />
                    Scan
                  </button>
                </div>

                {btPorts.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {btPorts.map((p) => {
                      const sel = form.bluetooth_address === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => update({ bluetooth_address: p.name, name: form.name || p.label })}
                          style={sel ? selectorActive : selectorIdle}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition text-left"
                        >
                          <span className="text-xs font-medium text-secondary">{p.label}</span>
                          <span className="text-xs font-mono text-muted">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="COM5 or 00:11:22:33:44:55"
                    value={form.bluetooth_address ?? ""}
                    onChange={(e) => update({ bluetooth_address: e.target.value })}
                    className="input-field font-mono"
                  />
                )}
              </div>

              {/* BT test */}
              {form.bluetooth_address && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={testBt}
                    disabled={btTestStatus === "testing"}
                    className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    {btTestStatus === "testing"
                      ? <RefreshCw className="w-3 h-3 animate-spin" />
                      : <Bluetooth className="w-3 h-3" />}
                    {btTestStatus === "testing" ? "Testing…" : "Test Connection"}
                  </button>
                  {btTestStatus === "ok" && (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle className="w-3.5 h-3.5" /> Connected
                    </span>
                  )}
                  {btTestStatus === "fail" && (
                    <span className="flex items-center gap-1 text-xs text-danger">
                      <XCircle className="w-3.5 h-3.5" /> {btTestError || "Failed"}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active toggle */}
          <div className="card-sm flex items-center justify-between p-3">
            <div>
              <p className="text-xs font-semibold text-primary">Active</p>
              <p className="text-xs text-muted">Print jobs will be sent to this printer</p>
            </div>
            <button
              type="button"
              onClick={() => update({ is_active: !form.is_active })}
              className={`toggle ${form.is_active ? "on" : ""}`}
              aria-label="Toggle active"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Paper size */}
          {form.printer_type !== "system" && (
            <div>
              <p className="section-label mb-2">Paper Size</p>
              <div className="grid grid-cols-2 gap-2">
                {PAPER_SIZES.map(({ size, chars, label }) => {
                  const sel = (form.paper_width ?? "80mm") === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => update({ paper_width: size, paper_size: size, chars_per_line: chars })}
                      style={sel ? selectorActive : selectorIdle}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all"
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: sel ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
                      >
                        {label}
                      </span>
                      <span className="text-xs text-muted">{chars} chars</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* System printer discovery */}
          {form.printer_type === "system" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="section-label">System Printers</p>
                <button
                  type="button"
                  onClick={discoverSystem}
                  disabled={loadingSystem}
                  className="btn-ghost flex items-center gap-1 text-xs px-2 py-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingSystem ? "animate-spin" : ""}`} />
                  {loadingSystem ? "Scanning…" : "Scan"}
                </button>
              </div>
              {systemPrinters.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {systemPrinters.map((sp) => (
                    <div key={sp.name} className="card-sm flex items-center justify-between p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary truncate">{sp.name}</p>
                        <p className="text-xs text-muted">
                          {sp.is_default && <span className="text-success mr-1">Default</span>}
                          {sp.driver_name ?? "System Driver"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addSystemPrinter(sp)}
                        className="btn-primary flex items-center gap-1 ml-2 px-2.5 py-1.5 text-xs shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted py-4 text-center">
                  {loadingSystem ? "Discovering…" : "Click Scan to find OS printers"}
                </p>
              )}
            </div>
          )}

          {/* Chars per line */}
          {form.printer_type !== "system" && (
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Characters Per Line{" "}
                <span className="font-normal text-muted">(override)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={20}
                  max={80}
                  value={form.chars_per_line ?? 48}
                  onChange={(e) => update({ chars_per_line: Number(e.target.value) })}
                  className="input-field w-20 text-center font-mono"
                  style={{ width: "5rem" }}
                />
                <span className="text-xs text-muted">Adjust if text is cut off</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action buttons ── */}
      {form.printer_type !== "system" && (
        <div className="flex gap-3 pt-2 border-t border-subtle">
          {!isNew && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-outline flex-1 py-2.5 text-sm"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            {saving ? "Saving…" : isNew ? "Add Printer" : "Update Printer"}
          </button>
        </div>
      )}
    </div>
  );
}
