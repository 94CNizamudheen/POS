import { useState } from "react";
import { Bluetooth, RefreshCw, Check, X } from "lucide-react";
import { printerService } from "@/services/local/printer.local.service";
import { useNotification } from "@/context/NotificationContext";

interface BtDevice {
  name: string;
  address: string;
  is_bluetooth?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (device: BtDevice) => void;
  /** true = Android WebView (paired BT devices), false = desktop (COM ports) */
  isAndroid: boolean;
}

export default function BluetoothScanModal({ open, onClose, onSelect, isAndroid }: Props) {
  const { showNotification } = useNotification();
  const [devices, setDevices] = useState<BtDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setDevices([]);
    setHasScanned(false);
    setPermissionDenied(false);
    setSelected(null);
    onClose();
  };

  const scan = async () => {
    setScanning(true);
    setPermissionDenied(false);
    try {
      let found: BtDevice[] = [];

      if (isAndroid) {
        // Small delay so Android UI thread can breathe
        await new Promise((r) => setTimeout(r, 80));
        try {
          found = printerService.scanBluetoothDevices();
        } catch (e) {
          if (e instanceof Error && e.message === "BLUETOOTH_PERMISSION_DENIED") {
            setPermissionDenied(true);
            return;
          }
          throw e;
        }
      } else {
        // Desktop: list Bluetooth COM ports via Tauri
        const ports = await printerService.listBluetoothPorts();
        found = ports.map((p) => ({ name: p.label, address: p.name, is_bluetooth: p.is_bluetooth }));
      }

      setDevices(found);
      setHasScanned(true);
    } catch {
      showNotification.error("Failed to scan Bluetooth devices");
    } finally {
      setScanning(false);
    }
  };

  const handleSelect = (device: BtDevice) => {
    setSelected(device.address);
    onSelect(device);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
      <div className="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-info" />
            <span className="font-semibold text-sm text-primary">
              {isAndroid ? "Select Bluetooth Printer" : "Select Bluetooth COM Port"}
            </span>
          </div>
          <button onClick={handleClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Scan button */}
          <button
            onClick={scan}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-default bg-surface-sunken text-secondary font-semibold text-sm hover:border-strong transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : "Scan Devices"}
          </button>

          {/* Device list */}
          {devices.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {devices.map((device) => (
                <button
                  key={device.address}
                  type="button"
                  onClick={() => handleSelect(device)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition active:scale-95"
                  style={{
                    borderColor: selected === device.address
                      ? "var(--color-info)"
                      : "var(--color-border-default)",
                    backgroundColor: selected === device.address
                      ? "var(--color-info-subtle)"
                      : "var(--color-surface-raised)",
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{device.name}</p>
                    {!isAndroid && (
                      <p className="text-xs font-medium" style={{ color: "var(--color-info-text)" }}>
                        {device.is_bluetooth ? "Bluetooth Printer" : "Serial Port"}
                      </p>
                    )}
                    <p className="text-xs text-muted font-mono">{device.address}</p>
                  </div>
                  {selected === device.address && (
                    <Check className="w-4 h-4 shrink-0 ml-2" style={{ color: "var(--color-info)" }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Permission denied */}
          {permissionDenied && (
            <div className="rounded-xl border border-danger bg-danger-subtle p-3 space-y-1">
              <p className="text-sm font-semibold text-danger">Bluetooth permission denied</p>
              <p className="text-xs text-muted">
                Go to Settings → Apps → [App] → Permissions → Nearby devices, grant access, then scan again.
              </p>
            </div>
          )}

          {/* Initial state */}
          {!permissionDenied && devices.length === 0 && !scanning && !hasScanned && (
            <p className="text-sm text-muted text-center py-2">
              {isAndroid
                ? "Tap Scan to find paired Bluetooth printers."
                : "Tap Scan to find Bluetooth COM ports."}
            </p>
          )}

          {/* No results after scan */}
          {!permissionDenied && devices.length === 0 && !scanning && hasScanned && (
            <p className="text-sm text-muted text-center py-2">
              {isAndroid
                ? "No paired printers found. Pair the printer in Android Settings → Bluetooth first, then scan again."
                : "No COM ports found. Pair the Bluetooth printer in Windows Settings → Bluetooth & devices first."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
