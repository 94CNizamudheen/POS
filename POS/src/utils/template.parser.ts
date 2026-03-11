import type {
  PaperSize,
  PrintTemplateDefinition,
  ReceiptData,
  KotData,
} from "@/types/printer";
import { EscPosBuilder, wrapText } from "./escpos.builder";

type DataMap = Record<string, unknown>;

export function parseTemplate(
  template: PrintTemplateDefinition,
  data: ReceiptData | KotData,
  paperSize: PaperSize,
  logoBytes?: Uint8Array | null,
): Uint8Array {
  const builder = new EscPosBuilder(paperSize);
  const dataMap = flattenData(data);
  const lines = template.layout.split("\n");

  processLines(lines, builder, dataMap, template.sections, data, logoBytes);

  builder.feed(8);
  builder.cut();

  return builder.build();
}

function flattenData(data: object): DataMap {
  const map: DataMap = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      map[`__arr_${key}`] = value;
    } else if (typeof value !== "object") {
      map[key] = value;
    }
  }
  return map;
}

function processLines(
  lines: string[],
  builder: EscPosBuilder,
  dataMap: DataMap,
  sections: Record<string, string>,
  rootData: ReceiptData | KotData,
  logoBytes?: Uint8Array | null,
): void {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === "<LOGO>") {
      if (logoBytes && logoBytes.length > 0) {
        builder.logo(logoBytes);
      }
      continue;
    }

    const sectionMatch = line.match(/^\{([A-Z]+)\}$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      handleSection(sectionName, builder, sections, rootData, dataMap, logoBytes);
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      const inner = line.slice(1, -1);
      const resolved = resolvePlaceholders(inner, dataMap);
      if (hasUnresolved(resolved) || hasEmptyValue(inner, dataMap)) continue;
      emitLine(resolved, builder);
      continue;
    }

    const resolved = resolvePlaceholders(line, dataMap);
    emitLine(resolved, builder);
  }
}

function handleSection(
  sectionName: string,
  builder: EscPosBuilder,
  sections: Record<string, string>,
  rootData: ReceiptData | KotData,
  parentMap: DataMap,
  logoBytes?: Uint8Array | null,
): void {
  const sectionTemplate = sections[sectionName];
  if (!sectionTemplate) return;

  const arrayKey = sectionKeyToDataKey(sectionName);
  const items = getArrayFromData(rootData, arrayKey, parentMap);
  if (!items || items.length === 0) return;

  const sectionLines = sectionTemplate.split("\n");

  for (const item of items) {
    const itemMap = { ...parentMap, ...flattenData(item) };
    processLines(sectionLines, builder, itemMap, sections, rootData, logoBytes);
  }
}

function sectionKeyToDataKey(sectionName: string): string {
  const mapping: Record<string, string> = {
    ITEMS: "items",
    CHARGES: "charges",
    PAYMENTS: "payments",
    MODIFIERS: "modifiers",
  };
  return mapping[sectionName] ?? sectionName.toLowerCase();
}

function getArrayFromData(
  rootData: ReceiptData | KotData,
  key: string,
  parentMap: DataMap
): Record<string, unknown>[] | null {
  const parentValue = parentMap[`__arr_${key}`];
  if (Array.isArray(parentValue)) return parentValue as Record<string, unknown>[];

  const rootValue = (rootData as unknown as Record<string, unknown>)[key];
  if (Array.isArray(rootValue)) return rootValue as Record<string, unknown>[];

  return null;
}

const INTEGER_KEYS = new Set(["quantity", "qty", "queue_number", "chars_per_line"]);

function resolvePlaceholders(text: string, dataMap: DataMap): string {
  return text.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = dataMap[key];
    if (value === undefined || value === null) return `{${key}}`;
    if (typeof value === "number") {
      return INTEGER_KEYS.has(key) ? String(value) : value.toFixed(2);
    }
    return String(value);
  });
}

function hasUnresolved(text: string): boolean {
  return /\{[A-Z_]+\}/.test(text);
}

function hasEmptyValue(text: string, dataMap: DataMap): boolean {
  const matches = text.match(/\{(\w+)\}/g);
  if (!matches) return false;
  for (const match of matches) {
    const key = match.slice(1, -1);
    const value = dataMap[key];
    if (value === undefined || value === null || value === "") return true;
  }
  return false;
}

function emitLine(line: string, builder: EscPosBuilder): void {
  if (line === "<EB>") { builder.boldOn(); return; }
  if (line === "<DB>") { builder.boldOff(); return; }

  if (line.startsWith("<F>")) {
    const char = line.slice(3).trim();
    if (char) { builder.separator(char); } else { builder.feed(); }
    return;
  }

  if (line.startsWith("<C11>") || line.startsWith("<C10>")) {
    builder.centerDouble(line.slice(5));
    return;
  }

  if (line.startsWith("<C>")) {
    builder.center(line.slice(3));
    return;
  }

  if (line.startsWith("<L11>") || line.startsWith("<L10>")) {
    builder.boldOn();
    builder.left(line.slice(5));
    builder.boldOff();
    return;
  }

  if (line.startsWith("<L>")) {
    builder.left(line.slice(3));
    return;
  }

  if (line === "<ITEM_HEADER>") {
    builder.itemHeader();
    return;
  }

  if (line.startsWith("<ITEM_ROW>")) {
    const parts = line.slice(10).split("|");
    if (parts.length >= 4) {
      builder.itemRow(parts[0].trim(), Number(parts[1]) || 0, Number(parts[2]) || 0, Number(parts[3]) || 0);
    }
    return;
  }

  if (line.startsWith("<KOT_ITEM>")) {
    const parts = line.slice(10).split("|");
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const qty = parts[1].trim();
      const totalW = builder.getPaperWidth();
      const qtyW = qty.length + 2;
      const nameW = totalW - qtyW;
      const wrapped = wrapText(name, nameW);

      builder.boldOn();
      builder.left(wrapped[0].padEnd(nameW) + qty.padStart(qtyW));
      for (let i = 1; i < wrapped.length; i++) {
        builder.left("  " + wrapped[i]);
      }
      builder.boldOff();
    }
    return;
  }

  if (line.startsWith("<J")) {
    const tagEnd = line.indexOf(">");
    if (tagEnd === -1) return;
    const content = line.slice(tagEnd + 1);
    const parts = content.split("|");
    if (parts.length >= 2) {
      builder.justified(parts[0].trim(), parts.slice(1).join("|").trim());
    } else {
      builder.left(content);
    }
    return;
  }

  if (line.length > 0) {
    builder.left(line);
  }
}
