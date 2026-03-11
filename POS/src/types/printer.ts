export type PaperSize = "58mm" | "80mm";

export type PrintTemplate = "POS" | "KOT" | "OPEN_TICKET";

export interface PrintTemplateDefinition {
  id: string;
  name: string;
  type: PrintTemplate;
  layout: string;
  sections: Record<string, string>;
  is_default: boolean;
}

export interface PaymentDetail {
  method: string;
  amount: number;
  reference?: string;
}

export interface Printer {
  id: string;
  name: string;
  printer_type: string; // "network", "usb", "bluetooth", "builtin", "system"
  ip_address?: string;
  port?: number;
  bluetooth_address?: string;
  paper_size?: PaperSize;
  is_active: boolean;
  print_templates?: string; // JSON: '["POS"]', '["KOT"]', '["POS","KOT"]'
  created_at?: string;
  updated_at?: string;
  paper_width?: string;
  chars_per_line?: number;
}

export interface KotItem {
  name: string;
  quantity: number;
  modifiers?: { name: string; qty: number }[];
  notes?: string;
}

export interface KotData {
  queue_number: number | string;
  order_mode: string;
  table_number?: string;
  timestamp: string;
  items: KotItem[];
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptCharge {
  name: string;
  amount: number;
}

export interface ReceiptData {
  ticket_number: string;
  location_name: string;
  order_mode: string;
  items: ReceiptItem[];
  subtotal: number;
  charges: ReceiptCharge[];
  total: number;
  payment_method: string;
  tendered: number;
  change: number;
  timestamp: string;
  payments?: PaymentDetail[];
  total_in_words?: string;
  queue_number?: string | number;
  logo_url?: string;
  note?: string;
}

export interface BuiltinPrinterDetection {
  available: boolean;
  type: string;
  deviceName: string;
  vendorId: number;
  productId: number;
  manufacturer: string;
  model: string;
  error?: string;
}

export interface BuiltinPrinterResult {
  success: boolean;
  error?: string;
}

export interface PrinterDiagnostics {
  device: {
    manufacturer: string;
    model: string;
    brand: string;
    device: string;
    product: string;
  };
  adapters: {
    sunmi: boolean;
    pax: boolean;
    intent: boolean;
    usb: boolean;
    serial: boolean;
  };
  printServices: Array<{
    action: string;
    package: string;
    name: string;
  }>;
  serialPorts: string[];
  error?: string;
}

export interface PrintServiceScan {
  allPrintRelated: string[];
  intentServices: string[];
  count: number;
  error?: string;
}

export interface SystemPrinter {
  name: string;
  system_name: string;
  driver_name?: string;
  port_name?: string;
  is_default: boolean;
  is_shared: boolean;
}
