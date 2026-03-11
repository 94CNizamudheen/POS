import type { PaperSize } from "@/types/printer";

export const PAPER_WIDTHS: Record<PaperSize, number> = {
  "58mm": 32,
  "80mm": 48,
};

const ESC_POS = {
  INIT: [0x1b, 0x40],
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  SIZE_NORMAL: [0x1d, 0x21, 0x00],
  SIZE_DOUBLE: [0x1d, 0x21, 0x11],
  FEED: [0x0a],
  CUT: [0x1d, 0x56, 0x00],
};

const encoder = new TextEncoder();

export function wrapText(text: string, width: number): string[] {
  const result: string[] = [];
  let index = 0;

  while (index < text.length) {
    result.push(text.substring(index, index + width));
    index += width;
  }

  return result;
}

export class EscPosBuilder {
  private cmd: number[] = [];
  private paperWidth: number;

  constructor(paperSize: PaperSize) {
    this.paperWidth = PAPER_WIDTHS[paperSize];
    this.cmd.push(...ESC_POS.INIT);
  }

  getPaperWidth(): number {
    return this.paperWidth;
  }

  left(text: string) {
    this.cmd.push(...ESC_POS.ALIGN_LEFT, ...encoder.encode(text), ...ESC_POS.FEED);
    return this;
  }

  center(text: string) {
    this.cmd.push(...ESC_POS.ALIGN_CENTER, ...encoder.encode(text), ...ESC_POS.FEED);
    this.cmd.push(...ESC_POS.ALIGN_LEFT);
    return this;
  }

  centerDouble(text: string) {
    this.cmd.push(...ESC_POS.ALIGN_CENTER, ...ESC_POS.SIZE_DOUBLE, ...ESC_POS.BOLD_ON);
    this.cmd.push(...encoder.encode(text), ...ESC_POS.FEED);
    this.cmd.push(...ESC_POS.BOLD_OFF, ...ESC_POS.SIZE_NORMAL, ...ESC_POS.ALIGN_LEFT);
    return this;
  }

  boldOn() {
    this.cmd.push(...ESC_POS.BOLD_ON);
    return this;
  }

  boldOff() {
    this.cmd.push(...ESC_POS.BOLD_OFF);
    return this;
  }

  separator(char = "-") {
    this.cmd.push(...encoder.encode(char.repeat(this.paperWidth)), ...ESC_POS.FEED);
    return this;
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.cmd.push(...ESC_POS.FEED);
    }
    return this;
  }

  justified(left: string, right: string) {
    const leftMax = this.paperWidth - right.length - 1;
    const leftText = left.substring(0, leftMax);
    const spaces = this.paperWidth - leftText.length - right.length;

    this.cmd.push(
      ...encoder.encode(leftText + " ".repeat(spaces) + right),
      ...ESC_POS.FEED
    );

    return this;
  }

  itemHeader() {
    const is80 = this.paperWidth === 48;

    const nameW = is80 ? 24 : 14;
    const qtyW = is80 ? 6 : 4;
    const priceW = is80 ? 9 : 7;
    const totalW = this.paperWidth - nameW - qtyW - priceW;

    const header =
      "Item".padEnd(nameW) +
      "Qty".padStart(qtyW) +
      "Price".padStart(priceW) +
      "Total".padStart(totalW);

    this.cmd.push(...encoder.encode(header), ...ESC_POS.FEED);
    return this;
  }

  itemRow(name: string, qty: number, price: number, total: number) {
    const is80 = this.paperWidth === 48;

    const nameW = is80 ? 24 : 14;
    const qtyW = is80 ? 6 : 4;
    const priceW = is80 ? 9 : 7;
    const totalW = this.paperWidth - nameW - qtyW - priceW;

    const wrappedName = wrapText(name, nameW);

    const firstLine =
      wrappedName[0].padEnd(nameW) +
      `${qty}`.padStart(qtyW) +
      price.toFixed(2).padStart(priceW) +
      total.toFixed(2).padStart(totalW);

    this.cmd.push(...encoder.encode(firstLine), ...ESC_POS.FEED);

    for (let i = 1; i < wrappedName.length; i++) {
      const nextLine =
        wrappedName[i].padEnd(nameW) +
        " ".repeat(qtyW + priceW + totalW);

      this.cmd.push(...encoder.encode(nextLine), ...ESC_POS.FEED);
    }

    return this;
  }

  rawBytes(bytes: Uint8Array) {
    this.cmd.push(...bytes);
    return this;
  }

  logo(bytes: Uint8Array | null) {
    if (!bytes || bytes.length === 0) return this;
    this.cmd.push(...ESC_POS.ALIGN_CENTER);
    this.cmd.push(...bytes);
    this.cmd.push(...ESC_POS.FEED);
    this.cmd.push(...ESC_POS.ALIGN_LEFT);
    return this;
  }

  cut() {
    this.cmd.push(...ESC_POS.CUT);
    return this;
  }

  build() {
    return new Uint8Array(this.cmd);
  }
}
