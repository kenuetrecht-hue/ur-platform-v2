import { MAX_STL_BYTES } from "./workspace-design-types";

export type StlParseResult = {
  dataBase64: string;
  byteSize: number;
  triangleCount: number;
  isAscii: boolean;
  fileName: string;
};

function isAsciiStl(header: string): boolean {
  return header.trimStart().startsWith("solid");
}

/** Count triangles in binary STL (80-byte header + 4-byte count + 50 bytes per tri). */
export function countBinaryStlTriangles(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 84) return 0;
  const view = new DataView(buffer);
  return view.getUint32(80, true);
}

/** Estimate triangle count for ASCII STL. */
export function countAsciiStlTriangles(text: string): number {
  const matches = text.match(/facet\s+normal/gi);
  return matches?.length ?? 0;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  if (typeof globalThis.btoa === "function") return globalThis.btoa(binary);
  throw new Error("Base64 encoding unavailable in this environment.");
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof globalThis.atob !== "function") {
    throw new Error("Base64 decoding unavailable in this environment.");
  }
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Validate and encode an STL File (web) into storable form. */
export async function parseStlFile(file: File): Promise<StlParseResult> {
  const name = file.name.trim() || "model.stl";
  if (!name.toLowerCase().endsWith(".stl")) {
    throw new Error("Only .stl files are supported.");
  }
  if (file.size > MAX_STL_BYTES) {
    throw new Error(`STL too large (max ${MAX_STL_BYTES / 1024 / 1024} MB).`);
  }
  if (file.size < 84) {
    throw new Error("File is too small to be a valid STL.");
  }

  const buffer = await file.arrayBuffer();
  const headerSlice = new TextDecoder().decode(buffer.slice(0, 6));
  const ascii = isAsciiStl(headerSlice);
  const triangleCount = ascii
    ? countAsciiStlTriangles(new TextDecoder().decode(buffer))
    : countBinaryStlTriangles(buffer);

  if (triangleCount <= 0) {
    throw new Error("Could not detect any triangles in this STL.");
  }

  return {
    dataBase64: arrayBufferToBase64(buffer),
    byteSize: buffer.byteLength,
    triangleCount,
    isAscii: ascii,
    fileName: name,
  };
}

/** Parse STL from base64 (for tests / server). */
export function parseStlBase64(fileName: string, dataBase64: string): Omit<StlParseResult, "dataBase64"> & { dataBase64: string } {
  const buffer = base64ToArrayBuffer(dataBase64);
  if (buffer.byteLength > MAX_STL_BYTES) {
    throw new Error(`STL exceeds ${MAX_STL_BYTES / 1024 / 1024} MB limit.`);
  }
  const headerSlice = new TextDecoder().decode(buffer.slice(0, 6));
  const ascii = isAsciiStl(headerSlice);
  const triangleCount = ascii
    ? countAsciiStlTriangles(new TextDecoder().decode(buffer))
    : countBinaryStlTriangles(buffer);
  return {
    dataBase64,
    byteSize: buffer.byteLength,
    triangleCount,
    isAscii: ascii,
    fileName,
  };
}
