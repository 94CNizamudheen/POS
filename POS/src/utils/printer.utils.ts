import type { PaperSize, Printer } from "@/types/printer";

export function detectPaperSize(printer?: Printer | null): PaperSize {
  if (printer?.paper_size) return printer.paper_size;

  if (printer?.paper_width === "58mm" || printer?.paper_width === "80mm") {
    return printer.paper_width as PaperSize;
  }

  if (printer?.printer_type === "builtin") return "58mm";

  if (
    printer?.printer_type === "network" ||
    printer?.printer_type === "system" ||
    printer?.printer_type === "usb"
  ) {
    return "80mm";
  }

  return "80mm";
}

export function formatQueueNumber(num: number, digits = 3): string {
  return String(num).padStart(digits, "0");
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
