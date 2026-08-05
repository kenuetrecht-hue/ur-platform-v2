/**
 * Export sandbox projects as downloadable ZIP (store-only, no extra deps).
 */

import type { SandboxProject } from "./coder-sandbox-service";

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date: Date): { time: number; date: number } {
  return {
    time: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff,
    date:
      (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff,
  };
}

function zipEntry(name: string, data: Buffer, now: Date): Buffer {
  const nameBuf = Buffer.from(name, "utf8");
  const { time, date } = dosTime(now);
  const crc = crc32(data);
  const local = Buffer.alloc(30 + nameBuf.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(date, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  nameBuf.copy(local, 30);
  return Buffer.concat([local, data]);
}

function centralDirEntry(name: string, data: Buffer, offset: number, now: Date): Buffer {
  const nameBuf = Buffer.from(name, "utf8");
  const { time, date } = dosTime(now);
  const crc = crc32(data);
  const cd = Buffer.alloc(46 + nameBuf.length);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0, 8);
  cd.writeUInt16LE(0, 10);
  cd.writeUInt16LE(time, 12);
  cd.writeUInt16LE(date, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(data.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt16LE(0, 30);
  cd.writeUInt16LE(0, 32);
  cd.writeUInt16LE(0, 34);
  cd.writeUInt16LE(0, 36);
  cd.writeUInt32LE(0, 38);
  cd.writeUInt32LE(offset, 42);
  nameBuf.copy(cd, 46);
  return cd;
}

export function buildProjectZip(project: SandboxProject): {
  base64: string;
  fileName: string;
  fileCount: number;
  sizeBytes: number;
} {
  const now = new Date();
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of project.files) {
    const normalized = file.path.replace(/\\/g, "/").replace(/^\/+/, "");
    const data = Buffer.from(file.content, "utf8");
    parts.push(zipEntry(normalized, data, now));
    central.push(centralDirEntry(normalized, data, offset, now));
    offset += 30 + Buffer.byteLength(normalized, "utf8") + data.length;
  }

  const centralStart = offset;
  for (const c of central) {
    parts.push(c);
    offset += c.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(project.files.length, 8);
  end.writeUInt16LE(project.files.length, 10);
  end.writeUInt32LE(central.reduce((s, b) => s + b.length, 0), 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  parts.push(end);

  const zip = Buffer.concat(parts);
  const safeName = project.name.replace(/[^\w.-]+/g, "_").slice(0, 40) || "project";
  return {
    base64: zip.toString("base64"),
    fileName: `${safeName}.zip`,
    fileCount: project.files.length,
    sizeBytes: zip.length,
  };
}
