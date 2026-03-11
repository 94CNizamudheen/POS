/**
 * Converts an image URL into ESC/POS GS v 0 raster bitmap bytes.
 * Scales the image to fit within the given max pixel width while preserving
 * aspect ratio, then converts to 1-bit monochrome.
 */
export async function logoToEscPos(
  imageUrl: string,
  maxWidthPx: number = 200,
): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidthPx / img.naturalWidth);
        const w = Math.floor(img.naturalWidth * scale);
        const h = Math.floor(img.naturalHeight * scale);

        const alignedW = Math.ceil(w / 8) * 8;

        const canvas = document.createElement("canvas");
        canvas.width = alignedW;
        canvas.height = h;

        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, alignedW, h);
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, alignedW, h);
        const pixels = imageData.data;

        const widthBytes = alignedW / 8;
        const dotData: number[] = [];

        for (let row = 0; row < h; row++) {
          for (let byteIdx = 0; byteIdx < widthBytes; byteIdx++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
              const x = byteIdx * 8 + bit;
              const idx = (row * alignedW + x) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              if (luminance < 128) {
                byte |= 1 << (7 - bit);
              }
            }
            dotData.push(byte);
          }
        }

        const xL = widthBytes & 0xff;
        const xH = (widthBytes >> 8) & 0xff;
        const yL = h & 0xff;
        const yH = (h >> 8) & 0xff;

        const header = [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
        resolve(new Uint8Array([...header, ...dotData]));
      } catch (e) {
        console.warn("[logo.converter] Failed to convert logo:", e);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn("[logo.converter] Failed to load logo image:", imageUrl);
      resolve(null);
    };

    img.src = imageUrl;
  });
}
