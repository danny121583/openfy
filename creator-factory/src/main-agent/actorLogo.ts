import { readFile } from "node:fs/promises";

export const actorLogoRelativePath = ".actor/icon.png";
export const actorLogoContentType = "image/png";

export async function readActorLogoPng(actorDir: string) {
  try {
    return await readFile(`${actorDir}/${actorLogoRelativePath}`);
  } catch {
    return Buffer.alloc(0);
  }
}

export function isPng(buffer: Buffer) {
  return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}
