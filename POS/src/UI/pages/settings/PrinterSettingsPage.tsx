import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Plus,
  LayoutTemplate,
  List,
  RefreshCw,
  Usb,
  Bug,
  Cpu,
} from "lucide-react";
import type {
  Printer as PrinterType,
  BuiltinPrinterDetection,
} from "@/types/printer";
import { printerService } from "@/services/local/printer.local.service";
import { useNotification } from "@/context/NotificationContext";
import { usePlatform } from "@/hooks/usePlatform";
import PrinterCard from "@/UI/components/settings/printer/PrinterCard";
import PrinterForm from "@/UI/components/settings/printer/PrinterForm";
import PrinterJobMapping from "@/UI/components/settings/printer/PrinterJobMapping";

type Tab = "list" | "add" | "templates";

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "list", label: "Printers", icon: <List className="w-4 h-4" /> },
  { id: "add", label: "Add / Edit", icon: <Plus className="w-4 h-4" /> },
  {
    id: "templates",
    label: "Print Templates",
    icon: <LayoutTemplate className="w-4 h-4" />,
  },
];

export default function PrinterSettingsPage() {
  const navigate = useNavigate();
  const { isAndroid } = usePlatform();
  const { showNotification } = useNotification();

  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("list");
  const [editing, setEditing] = useState<PrinterType | null>(null);

  // USB scan (Android only)
  const [scanningUsb, setScanningUsb] = useState(false);

  // Diagnostics panel (Android only)
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    bridgeAvailable: boolean;
    isAvailable: boolean;
    detection: BuiltinPrinterDetection | null;
    usbDevices: { count: number; devices: unknown[]; error?: string } | null;
    serialPorts: { count: number; ports: string[]; error?: string } | null;
    error: string | null;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setPrinters(await printerService.getAllPrinters());
    } finally {
      setLoading(false);
    }
  };

  // On mount: auto-setup built-in printer (Android/embedded) + load list
  useEffect(() => {
    (async () => {
      try {
        await printerService.autoSetupBuiltinPrinter();
      } catch {
        // Non-critical on desktop Tauri
      }
      await load();
    })();

    const handler = () => load();
    window.addEventListener("usb-printer-added", handler);
    return () => window.removeEventListener("usb-printer-added", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Manually scan for a connected USB printer (Android) */
  const scanUsbPrinter = async () => {
    setScanningUsb(true);
    try {
      const existing = await printerService.getAllPrinters();
      if (
        existing.some(
          (p) => p.printer_type === "builtin" || p.printer_type === "usb",
        )
      ) {
        showNotification.info("USB printer already configured");
        await load();
        return;
      }

      let usbInfo = printerService.listUsbDevices();
      for (let i = 0; i < 2 && (usbInfo?.count ?? 0) === 0; i++) {
        await new Promise((r) => setTimeout(r, 600));
        usbInfo = printerService.listUsbDevices();
      }
      const usbCount = usbInfo?.count ?? 0;

      const detection = printerService.detectBuiltinPrinter();
      if (detection?.type !== "usb_builtin") {
        runDiagnostics();
        setShowDebug(true);
        showNotification.error(
          usbCount === 0
            ? "Printer not detected via USB. Try: (1) Use a powered USB hub — printers need 500 mA+. (2) Confirm USB interface is Standard. (3) Reconnect cable then tap Scan USB again."
            : `Seen ${usbCount} USB device(s) but none matched a printer. Check diagnostics for VID/PID.`,
        );
        return;
      }

      try {
        await printerService.requestBuiltinPrinterPermission();
      } catch {
        showNotification.error("USB permission denied");
        return;
      }

      const printer = await printerService.autoSetupBuiltinPrinter();
      if (printer) {
        const alreadyExisted = printers.some((p) => p.id === printer.id);
        showNotification.success(
          alreadyExisted
            ? "USB printer detected. It will be used automatically when connected."
            : `USB printer added: ${printer.name}`,
        );
        await load();
      }
    } catch (e) {
      showNotification.error(
        "Scan failed: " + (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setScanningUsb(false);
    }
  };

  const runDiagnostics = () => {
    try {
      setDebugInfo({
        bridgeAvailable:
          typeof window !== "undefined" && !!window.BuiltinPrinter,
        isAvailable: printerService.isBuiltinPrinterAvailable(),
        detection: printerService.detectBuiltinPrinter(),
        usbDevices: printerService.listUsbDevices(),
        serialPorts: printerService.listSerialPorts(),
        error: null,
      });
    } catch (e) {
      setDebugInfo({
        bridgeAvailable: false,
        isAvailable: false,
        detection: null,
        usbDevices: null,
        serialPorts: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const forceAddBuiltinPrinter = async () => {
    try {
      const existing = await printerService.getAllPrinters();
      if (existing.some((p) => p.printer_type === "builtin")) {
        showNotification.error("A built-in printer is already configured");
        return;
      }
      await printerService.savePrinter({
        id: `builtin-${Date.now()}`,
        name: "Built-in Printer (Manual)",
        printer_type: "builtin",
        is_active: true,
      });
      showNotification.info("Built-in printer added manually!");
      await load();
    } catch (e) {
      showNotification.error(
        "Failed to add: " + (e instanceof Error ? e.message : String(e)),
      );
    }
  };

  function openEdit(printer: PrinterType) {
    setEditing(printer);
    setTab("add");
  }
  function handleFormSuccess() {
    setEditing(null);
    load();
    setTab("list");
  }
  function handleFormClose() {
    setEditing(null);
    setTab("list");
  }
  function switchTab(t: Tab) {
    if (t !== "add") setEditing(null);
    setTab(t);
  }

  return (
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="btn-back shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Printers</h1>
          <p className="page-subtitle">Manage receipt and kitchen printers</p>
        </div>
        {tab === "list" && (
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition font-medium"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`tab-item ${tab === t.id ? "active" : ""}`}
          >
            {t.icon}
            {t.label}
            {t.id === "list" && printers.length > 0 && (
              <span className="chip chip-gray ml-1">{printers.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-primary">
                Configured Printers
              </h2>
              {isAndroid && (
                <button
                  onClick={scanUsbPrinter}
                  disabled={scanningUsb}
                  className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5"
                >
                  <Usb
                    className={`w-3.5 h-3.5 ${scanningUsb ? "animate-pulse" : ""}`}
                  />
                  {scanningUsb ? "Scanning…" : "Scan USB"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-disabled">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : printers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Printer className="w-6 h-6 text-muted" />
                </div>
                <p className="text-sm font-semibold text-secondary">
                  No printers configured
                </p>
                <p className="text-xs text-muted">
                  Add a printer to get started
                </p>
                <button
                  onClick={() => setTab("add")}
                  className="btn-primary flex items-center gap-2 px-4 py-2 text-sm mt-2"
                >
                  <Plus className="w-4 h-4" /> Add Printer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {printers.map((p) => (
                  <PrinterCard
                    key={p.id}
                    printer={p}
                    reload={load}
                    onEdit={openEdit}
                  />
                ))}
                <button
                  onClick={() => setTab("add")}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-subtle hover:border-default text-muted hover:text-secondary transition-all min-h-40"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-semibold">Add Printer</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Android: Built-in Printer Diagnostics ── */}
          {isAndroid && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Bug className="w-4 h-4 text-info" />
                  Built-in Printer Diagnostics
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={runDiagnostics}
                    className="btn-outline flex items-center gap-1 text-xs px-2.5 py-1.5"
                  >
                    <RefreshCw className="w-3 h-3" /> Run
                  </button>
                  <button
                    onClick={() => setShowDebug((v) => !v)}
                    className="btn-ghost text-xs px-2.5 py-1.5"
                  >
                    {showDebug ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {!debugInfo && (
                <p className="text-xs text-muted">
                  Click "Run" to check built-in printer status
                </p>
              )}

              {debugInfo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`status-dot ${debugInfo.bridgeAvailable ? "online" : "offline"}`}
                    />
                    <span className="text-xs text-secondary">
                      JS Bridge:{" "}
                      {debugInfo.bridgeAvailable
                        ? "Available"
                        : "Not Available"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`status-dot ${debugInfo.isAvailable ? "online" : "offline"}`}
                    />
                    <span className="text-xs text-secondary">
                      Printer:{" "}
                      {debugInfo.isAvailable ? "Detected" : "Not Detected"}
                    </span>
                  </div>

                  {showDebug && (
                    <div className="mt-2 space-y-2">
                      {debugInfo.detection && (
                        <div>
                          <p className="text-xs font-semibold text-secondary mb-1">
                            Detection Result:
                          </p>
                          <pre className="card-sm p-2 text-xs font-mono overflow-auto max-h-32 text-primary">
                            {JSON.stringify(debugInfo.detection, null, 2)}
                          </pre>
                        </div>
                      )}
                      {debugInfo.usbDevices && (
                        <div>
                          <p className="text-xs font-semibold text-secondary mb-1">
                            USB Devices: {debugInfo.usbDevices.count}
                          </p>
                          <pre className="card-sm p-2 text-xs font-mono overflow-auto max-h-32 text-primary">
                            {JSON.stringify(debugInfo.usbDevices, null, 2)}
                          </pre>
                        </div>
                      )}
                      {debugInfo.serialPorts && (
                        <div>
                          <p className="text-xs font-semibold text-secondary mb-1">
                            Serial Ports: {debugInfo.serialPorts.count}
                          </p>
                          <pre className="card-sm p-2 text-xs font-mono overflow-auto max-h-32 text-primary">
                            {JSON.stringify(debugInfo.serialPorts, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {debugInfo.error && (
                    <p className="text-xs text-danger">
                      Error: {debugInfo.error}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-subtle flex items-center gap-3">
                <button
                  onClick={forceAddBuiltinPrinter}
                  className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Force Add Built-in Printer
                </button>
                <p className="text-xs text-muted">
                  Use this if auto-detection fails
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT TAB ── */}
      {tab === "add" && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-primary">
                {editing ? `Edit: ${editing.name}` : "Add New Printer"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {editing
                  ? "Update printer configuration"
                  : "Configure a new printer connection"}
              </p>
            </div>
            {editing && (
              <button
                onClick={handleFormClose}
                className="text-xs text-muted hover:text-secondary font-medium transition"
              >
                ← Back to list
              </button>
            )}
          </div>
          <PrinterForm
            editing={editing}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {tab === "templates" && (
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-primary">
              Print Template Mapping
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Choose which print jobs each printer handles
            </p>
          </div>
          <PrinterJobMapping printers={printers} reload={load} />
        </div>
      )}
    </main>
  );
}
