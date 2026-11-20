export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, exp);
  return `${val >= 100 || exp === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[exp]}`;
}

export function formatDateTime(ts: number, locale: 'en' | 'ta'): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ta' ? 'ta-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1500);
}

export function stripExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

/**
 * Parse page range strings like "1-5, 6-10, 2, 4, 6"
 * Returns array of page arrays (1-indexed), or null if invalid.
 */
export function parsePageRangeGroups(input: string, maxPage: number): number[][] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const groups: number[][] = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > maxPage) return null;
      groups.push([page]);
    } else if (/^\d+\s*-\s*\d+$/.test(part)) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Number(startStr);
      const end = Number(endStr);
      if (start < 1 || end < 1 || start > maxPage || end > maxPage || start > end) {
        return null;
      }
      const range: number[] = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      groups.push(range);
    } else {
      return null;
    }
  }
  return groups;
}

/**
 * Parse flat unique sorted page list from input string like "1, 3-5, 8"
 */
export function parseFlatPages(input: string, maxPage: number): number[] | null {
  const groups = parsePageRangeGroups(input, maxPage);
  if (!groups) return null;
  const set = new Set<number>();
  for (const group of groups) {
    for (const p of group) set.add(p);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Magic-byte verification for local security & validation
 */
export async function verifyFileSignature(
  file: File,
  expected: 'pdf' | 'docx' | 'image'
): Promise<boolean> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const readSize = expected === 'pdf' ? 1024 : 16;
  const slice = await file.slice(0, readSize).arrayBuffer();
  const bytes = new Uint8Array(slice);

  if (expected === 'pdf') {
    if (ext !== 'pdf' && file.type !== 'application/pdf') return false;
    // Accept "%PDF-" anywhere in the first 1024 bytes (some producers prepend BOM/whitespace/headers)
    const text = String.fromCharCode(...bytes);
    return text.includes('%PDF-');
  }

  if (expected === 'docx') {
    if (ext !== 'docx') return false;
    // ZIP/OOXML magic: PK\x03\x04
    return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);
  }

  if (expected === 'image') {
    const allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowedExt.includes(ext) && !file.type.startsWith('image/')) return false;
    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    // PNG: 89 50 4E 47
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    // WEBP: RIFF....WEBP
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    const isWebp = riff === 'RIFF' && webp === 'WEBP';
    return isJpeg || isPng || isWebp;
  }

  return false;
}

export async function detectValidFileKind(
  file: File
): Promise<'pdf' | 'docx' | 'image' | null> {
  if (file.size === 0) return null;
  if (await verifyFileSignature(file, 'pdf')) return 'pdf';
  if (await verifyFileSignature(file, 'image')) return 'image';
  if (await verifyFileSignature(file, 'docx')) return 'docx';
  return null;
}
