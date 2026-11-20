# Offline Document Converter

A privacy-first, 100% browser-based Progressive Web App (PWA) for converting, merging, splitting, compressing, and organizing PDF, Word (`.docx`), and image documents locally on your device.

**Zero server uploads. Zero external APIs. Works offline.**

## Tools Included

1. **Image to PDF** — Combine JPG, PNG, and WEBP images into PDF with EXIF orientation normalization, configurable page size, orientation, margins, and image fit.
2. **PDF to Word** — Extract text, headings, paragraphs, bullet lists, bold/italic hints, and embedded images from text-based PDFs into an editable `.docx` file.
3. **Word to PDF** — Convert sanitized `.docx` HTML content into paginated A4 PDF pages with selectable vector text, tables, lists, images, and Tamil script support.
4. **Merge PDF** — Combine multiple PDF files in custom order into a single document.
5. **Split PDF** — Split a PDF by custom page ranges, individual pages, or selected pages with ZIP bundle download.
6. **Compress PDF** — Lossless metadata/stream cleanup (default) or calibrated JPEG raster downsampling.
7. **PDF to Image** — Export selected or all PDF pages as PNG or JPG images individually or bundled as a ZIP.
8. **Rotate PDF** — Rotate all or selected pages by 90°, 180°, or 270°.
9. **Remove PDF Pages** — Visually pick pages or enter ranges to remove unwanted pages.
10. **Extract PDF Pages** — Extract selected pages or ranges into a new PDF document.

## Privacy & Offline Architecture

- **Local Browser Processing**: All conversions execute strictly in your browser using client-side JavaScript, Web Workers, HTML5 Canvas, IndexedDB, and `localStorage`.
- **Offline Ready (PWA)**: Built with `vite-plugin-pwa` and Workbox precaching, plus bundled `@fontsource` fonts (`DM Sans`, `Plus Jakarta Sans`, `Noto Sans Tamil`, `JetBrains Mono`) so the entire interface and font stack work without an internet connection.
- **Metadata-Only History**: Conversion history stored in IndexedDB records filenames, sizes, timestamps, and status—never file contents.
- **Bilingual & Theme Support**: Full English and Tamil (`தமிழ்`) translations, plus Light, Dark, and System themes.

## Tech Stack

- React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- `pdf-lib` & `pdfjs-dist` (PDF manipulation and local rendering)
- `jspdf` (Image/Word to PDF generation)
- `mammoth` & `docx` (DOCX reading and writing)
- `dompurify` (HTML sanitization for Word document preview and export)
- `jszip` (Multi-file ZIP archives)
- `vitest` (Unit testing)

## Local Development

```bash
npm install
npm run dev
```

### Scripts

- `npm run dev` — Start local development server on port `3000`
- `npm run lint` — Run TypeScript type checking (`tsc --noEmit`)
- `npm test` — Run unit test suite (`vitest run`)
- `npm run build` — Build production bundle and PWA Service Worker into `dist/`
- `npm run preview` — Preview the production build locally

## Browser Support

Modern Chromium (Chrome, Edge, Brave), Firefox, and Safari browsers supporting Web Workers, IndexedDB, `createImageBitmap`, and HTML5 Canvas.
