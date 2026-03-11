import type {
  BuiltinPrinterDetection,
  BuiltinPrinterResult,
  KotData,
  PaperSize,
  Printer,
  PrinterDiagnostics,
  PrintServiceScan,
  PrintTemplate,
  PrintTemplateDefinition,
  ReceiptData,
  SystemPrinter,
} from "@/types/printer";
import { detectPaperSize, uint8ArrayToBase64 } from "@/utils/printer.utils";
import { parseTemplate } from "@/utils/template.parser";
import { getAvailableTemplates, getTemplateByType } from "@/data/printerdata";
import { logoToEscPos } from "@/utils/logo.converter";

import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    BuiltinPrinter?: {
      isAvailable: () => string;
      detect: () => string;
      printEscPos: (base64Data: string) => string;
      printTest: () => string;
      connect: () => string;
      disconnect: () => string;
      hasPermission: () => string;
      requestPermission: () => string;
      listUsbDevices: () => string;
      listSerialPorts: () => string;
      getDiagnostics: () => string;
      scanPrintServices: () => string;
      getPendingUsbAttach: () => string;
      clearPendingUsbAttach: () => void;
      scanBluetoothDevices: () => string;
      printEscPosBluetooth: (address: string, base64Data: string) => string;
      testBluetoothConnection: (address: string) => string;
    };
  }
}

export const printerService = {
  isBuiltinPrinterAvailable(): boolean {
    if (typeof window !== "undefined" && window.BuiltinPrinter) {
      try {
        return window.BuiltinPrinter.isAvailable() === "true";
      } catch {
        return false;
      }
    }
    return false;
  },

  detectBuiltinPrinter(): BuiltinPrinterDetection | null {
    if (typeof window !== "undefined" && window.BuiltinPrinter) {
      try {
        return JSON.parse(window.BuiltinPrinter.detect()) as BuiltinPrinterDetection;
      } catch {
        return null;
      }
    }
    return null;
  },

  hasBuiltinPrinterPermission(): boolean {
    if (typeof window !== "undefined" && window.BuiltinPrinter?.hasPermission) {
      try {
        const result = JSON.parse(window.BuiltinPrinter.hasPermission());
        return result.granted === true;
      } catch {
        return false;
      }
    }
    return false;
  },

  async requestBuiltinPrinterPermission(): Promise<boolean> {
    if (!window.BuiltinPrinter?.requestPermission) {
      throw new Error("Permission request not available on this device");
    }
    const result: BuiltinPrinterResult = JSON.parse(window.BuiltinPrinter.requestPermission());
    if (!result.success) throw new Error(result.error || "USB permission denied");
    return true;
  },

  async printReceiptBuiltin(
    receiptData: ReceiptData,
    printer?: Printer | null,
    templateType: "POS" | "OPEN_TICKET" = "POS",
    logoBytes?: Uint8Array | null,
  ): Promise<void> {
    if (!window.BuiltinPrinter) throw new Error("Built-in printer not available");

    const detection = this.detectBuiltinPrinter();
    if (!detection?.available) throw new Error("Built-in printer not detected");

    if (detection.type === "usb_builtin" && !this.hasBuiltinPrinterPermission()) {
      await this.requestBuiltinPrinterPermission();
    }

    const paperSize = detectPaperSize(printer ?? { printer_type: "builtin" } as Printer);
    const template = getTemplateByType(templateType);
    if (!template) throw new Error(`No ${templateType} template found`);

    const resolvedLogo = logoBytes ?? (receiptData.logo_url
      ? await logoToEscPos(receiptData.logo_url, paperSize === "58mm" ? 200 : 300)
      : null);
    const escPosCommands = parseTemplate(template, receiptData, paperSize, resolvedLogo);
    const base64Data = uint8ArrayToBase64(escPosCommands);

    const result: BuiltinPrinterResult = JSON.parse(window.BuiltinPrinter.printEscPos(base64Data));
    if (!result.success) throw new Error(result.error || "Print failed");
  },

  async testBuiltinPrinter(): Promise<void> {
    if (!window.BuiltinPrinter) throw new Error("Built-in printer not available");

    const detection = this.detectBuiltinPrinter();
    if (!detection?.available) throw new Error("Printer not detected");

    if (detection.type === "usb_builtin" && !this.hasBuiltinPrinterPermission()) {
      await this.requestBuiltinPrinterPermission();
    }

    const result: BuiltinPrinterResult = JSON.parse(window.BuiltinPrinter.printTest());
    if (!result.success) throw new Error(result.error || "Test print failed");
  },

  getDiagnostics(): PrinterDiagnostics | null {
    if (typeof window !== "undefined" && window.BuiltinPrinter?.getDiagnostics) {
      try {
        return JSON.parse(window.BuiltinPrinter.getDiagnostics()) as PrinterDiagnostics;
      } catch (e) {
        console.error("Failed to get diagnostics:", e);
        return null;
      }
    }
    return null;
  },

  scanPrintServices(): PrintServiceScan | null {
    if (typeof window !== "undefined" && window.BuiltinPrinter?.scanPrintServices) {
      try {
        return JSON.parse(window.BuiltinPrinter.scanPrintServices()) as PrintServiceScan;
      } catch (e) {
        console.error("Failed to scan print services:", e);
        return null;
      }
    }
    return null;
  },

  async getAllPrinters(): Promise<Printer[]> {
    return invoke("get_printers");
  },

  async getActivePrinters(): Promise<Printer[]> {
    return invoke("get_active_printers");
  },

  async getPrinter(id: string): Promise<Printer | null> {
    return invoke("get_printer", { id });
  },

  async savePrinter(printer: Printer): Promise<void> {
    return invoke("save_printer", { printer });
  },

  async deletePrinter(id: string): Promise<void> {
    return invoke("delete_printer", { id });
  },

  async setPrinterActive(id: string, isActive: boolean): Promise<void> {
    return invoke("set_printer_active", { id, isActive });
  },

  async testPrinter(printer: Printer): Promise<void> {
    if (printer.printer_type === "builtin") {
      return this.testBuiltinPrinter();
    }
    if (printer.printer_type === "bluetooth" && window.BuiltinPrinter?.printEscPosBluetooth) {
      if (!printer.bluetooth_address) throw new Error("No Bluetooth address configured");
      const testBytes = new Uint8Array([
        0x1B, 0x40, 0x1B, 0x61, 0x01, 0x1D, 0x21, 0x11,
        ...Array.from(new TextEncoder().encode("TEST PRINT\n")),
        0x1D, 0x21, 0x00,
        ...Array.from(new TextEncoder().encode("Printer OK\n\n\n")),
        0x1D, 0x56, 0x00,
      ]);
      const base64Data = uint8ArrayToBase64(testBytes);
      const result: BuiltinPrinterResult = JSON.parse(
        window.BuiltinPrinter.printEscPosBluetooth(printer.bluetooth_address, base64Data)
      );
      if (!result.success) throw new Error(result.error || "Bluetooth test print failed");
      return;
    }
    return invoke("test_printer", { printer });
  },

  async sendRawToPrinter(printer: Printer, escPosCommands: Uint8Array): Promise<void> {
    const base64Data = uint8ArrayToBase64(escPosCommands);

    if (printer.printer_type === "builtin") {
      if (!window.BuiltinPrinter) throw new Error("Built-in printer not available");
      const detection = this.detectBuiltinPrinter();
      if (!detection?.available) throw new Error("Built-in printer not detected");
      if (detection.type === "usb_builtin" && !this.hasBuiltinPrinterPermission()) {
        await this.requestBuiltinPrinterPermission();
      }
      const result: BuiltinPrinterResult = JSON.parse(window.BuiltinPrinter.printEscPos(base64Data));
      if (!result.success) throw new Error(result.error || "Print failed");
    } else if (printer.printer_type === "bluetooth") {
      if (typeof window !== "undefined" && window.BuiltinPrinter?.printEscPosBluetooth) {
        if (!printer.bluetooth_address) throw new Error("No Bluetooth address configured");
        const result: BuiltinPrinterResult = JSON.parse(
          window.BuiltinPrinter.printEscPosBluetooth(printer.bluetooth_address, base64Data)
        );
        if (!result.success) throw new Error(result.error || "Bluetooth print failed");
      } else {
        await invoke("print_raw", { printerId: printer.id, data: base64Data });
      }
    } else {
      await invoke("print_raw", { printerId: printer.id, data: base64Data });
    }
  },

  /**
   * Print to all active printers using their configured template mappings.
   */
  async printByTemplate(receiptData: ReceiptData, kotData?: KotData): Promise<void> {
    const activePrinters = await this.getActivePrinters();
    const errors: string[] = [];
    let printedToAny = false;

    const logoBytes = receiptData.logo_url
      ? await logoToEscPos(receiptData.logo_url, 200).catch(() => null)
      : null;

    for (const printer of activePrinters) {
      const templates = this.getTemplatesForPrinter(printer);
      const paperSize = detectPaperSize(printer);

      for (const tplType of templates) {
        if (tplType === "OPEN_TICKET") continue;
        try {
          const templateDef = getTemplateByType(tplType);
          if (!templateDef) continue;

          let escPosCommands: Uint8Array;

          if (tplType === "KOT" && kotData) {
            escPosCommands = parseTemplate(templateDef, kotData, paperSize, logoBytes);
          } else {
            escPosCommands = parseTemplate(templateDef, receiptData, paperSize, logoBytes);
          }

          await this.sendRawToPrinter(printer, escPosCommands);
          printedToAny = true;
        } catch (e) {
          errors.push(`${printer.name}[${tplType}]: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    if (!printedToAny) {
      if (errors.length > 0) throw new Error(`Print errors: ${errors.join("; ")}`);
      else throw new Error("No printers available");
    }
  },

  /**
   * Print receipt to all active printers (legacy – uses POS template).
   */
  async printReceiptToAllActive(receiptData: ReceiptData): Promise<void> {
    const activePrinters = await this.getActivePrinters();
    const errors: string[] = [];
    let printedToAny = false;

    const logoBytes = receiptData.logo_url
      ? await logoToEscPos(receiptData.logo_url, 200).catch(() => null)
      : null;

    const builtinPrinter = activePrinters.find((p) => p.printer_type === "builtin");
    if (builtinPrinter) {
      try {
        await this.printReceiptBuiltin(receiptData, builtinPrinter, "POS", logoBytes);
        printedToAny = true;
      } catch (e) {
        errors.push(`Builtin: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const bluetoothPrinters = activePrinters.filter((p) => p.printer_type === "bluetooth");
    for (const printer of bluetoothPrinters) {
      if (!printer.bluetooth_address || !window.BuiltinPrinter?.printEscPosBluetooth) continue;
      try {
        const paperSize = detectPaperSize(printer);
        const tpl = getTemplateByType("POS");
        if (!tpl) throw new Error("No POS template found");
        const escPosCommands = parseTemplate(tpl, receiptData, paperSize, logoBytes);
        const base64Data = uint8ArrayToBase64(escPosCommands);
        const result: BuiltinPrinterResult = JSON.parse(
          window.BuiltinPrinter.printEscPosBluetooth(printer.bluetooth_address, base64Data)
        );
        if (!result.success) throw new Error(result.error || "Bluetooth print failed");
        printedToAny = true;
      } catch (e) {
        errors.push(`${printer.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const tauriPrinters = activePrinters.filter(
      (p) => p.printer_type === "network" || p.printer_type === "system" || p.printer_type === "usb"
    );
    for (const printer of tauriPrinters) {
      try {
        const paperSize = detectPaperSize(printer);
        const tpl = getTemplateByType("POS");
        if (!tpl) throw new Error("No POS template found");
        const escPosCommands = parseTemplate(tpl, receiptData, paperSize, logoBytes);
        const base64Data = uint8ArrayToBase64(escPosCommands);
        await invoke("print_raw", { printerId: printer.id, data: base64Data });
        printedToAny = true;
      } catch (e) {
        errors.push(`${printer.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!printedToAny) {
      if (errors.length > 0) throw new Error(`Print errors: ${errors.join("; ")}`);
      else throw new Error("No printers available");
    }
  },

  async autoSetupBuiltinPrinter(): Promise<Printer | null> {
    const detection = this.detectBuiltinPrinter();
    if (!detection?.available) return null;

    const existingPrinters = await this.getAllPrinters();
    const existingBuiltin = existingPrinters.find((p) => p.printer_type === "builtin");
    if (existingBuiltin) return existingBuiltin;

    const builtinPrinter: Printer = {
      id: `builtin-${Date.now()}`,
      name: `Built-in Printer (${detection.manufacturer} ${detection.model})`,
      printer_type: "builtin",
      paper_width: "80mm",
      chars_per_line: 48,
      is_active: true,
    };

    await this.savePrinter(builtinPrinter);
    return builtinPrinter;
  },

  getPaperSizes(): { value: PaperSize; label: string; chars: number }[] {
    return [
      { value: "58mm", label: "58mm (32 chars)", chars: 32 },
      { value: "80mm", label: "80mm (48 chars)", chars: 48 },
    ];
  },

  getTemplatesForPrinter(printer: Printer): PrintTemplate[] {
    if (!printer.print_templates) return [];
    try {
      const parsed = JSON.parse(printer.print_templates);
      if (Array.isArray(parsed)) return parsed as PrintTemplate[];
      return [];
    } catch {
      return [];
    }
  },

  scanBluetoothDevices(): { name: string; address: string }[] {
    if (typeof window !== "undefined" && window.BuiltinPrinter?.scanBluetoothDevices) {
      const parsed = JSON.parse(window.BuiltinPrinter.scanBluetoothDevices());
      if (parsed?.error === "permission_denied") throw new Error("BLUETOOTH_PERMISSION_DENIED");
      if (parsed?.error) throw new Error(parsed.error);
      if (parsed?.devices) return parsed.devices as { name: string; address: string }[];
      if (Array.isArray(parsed)) return parsed as { name: string; address: string }[];
      return [];
    }
    return [];
  },

  testBluetoothConnection(address: string): { success: boolean; error?: string } {
    if (typeof window !== "undefined" && window.BuiltinPrinter?.testBluetoothConnection) {
      try {
        return JSON.parse(window.BuiltinPrinter.testBluetoothConnection(address));
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Connection test failed" };
      }
    }
    return { success: false, error: "Bluetooth test not available on this platform" };
  },

  async listBluetoothPorts(): Promise<{ name: string; label: string; is_bluetooth: boolean }[]> {
    try {
      return await invoke<{ name: string; label: string; is_bluetooth: boolean }[]>("list_bluetooth_ports");
    } catch (e) {
      console.error("Failed to list Bluetooth ports:", e);
      return [];
    }
  },

  getAvailableTemplateDefinitions(): PrintTemplateDefinition[] {
    return getAvailableTemplates();
  },

  // ============== SYSTEM PRINTER METHODS (Desktop Only) ==============

  async getSystemPrinters(): Promise<SystemPrinter[]> {
    return invoke("get_system_printers");
  },

  async printToSystemPrinter(printerName: string, receiptData: ReceiptData, paperSize: PaperSize = "80mm"): Promise<void> {
    const template = getTemplateByType("POS");
    if (!template) throw new Error("No POS template found");
    const logoBytes = receiptData.logo_url
      ? await logoToEscPos(receiptData.logo_url, paperSize === "58mm" ? 200 : 300).catch(() => null)
      : null;
    const escPosCommands = parseTemplate(template, receiptData, paperSize, logoBytes);
    const base64Data = uint8ArrayToBase64(escPosCommands);
    return invoke("print_to_system_printer", { printerName, data: base64Data });
  },

  async addSystemPrinterToApp(systemPrinter: SystemPrinter, paperSize?: PaperSize): Promise<Printer> {
    return invoke("add_system_printer_to_app", { systemPrinter, paperSize });
  },

  async autoDiscoverSystemPrinters(): Promise<Printer[]> {
    const systemPrinters = await this.getSystemPrinters();
    const addedPrinters: Printer[] = [];
    const existingPrinters = await this.getAllPrinters();
    const existingNames = new Set(existingPrinters.map(p => p.name));

    for (const sysPrinter of systemPrinters) {
      if (existingNames.has(sysPrinter.name)) continue;
      try {
        const printer = await this.addSystemPrinterToApp(sysPrinter, "80mm");
        addedPrinters.push(printer);
      } catch (e) {
        console.warn(`Failed to add system printer ${sysPrinter.name}:`, e);
      }
    }

    return addedPrinters;
  },
};
