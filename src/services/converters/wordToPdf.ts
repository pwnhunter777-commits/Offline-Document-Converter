import html2canvas from 'html2canvas';
import {jsPDF} from 'jspdf';
import mammoth from 'mammoth';

export interface WordPreviewResult {
  html: string;
  messages: string[];
}

export async function extractWordPreview(file: File): Promise<WordPreviewResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    {arrayBuffer},
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((imageBuffer) => ({
          src: `data:${image.contentType};base64,${imageBuffer}`,
        }))
      ),
    }
  );
  return {
    html: result.value,
    messages: result.messages.map((m) => m.message),
  };
}

export async function convertWordHtmlToPdf(
  htmlContent: string,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  onProgress?.(10);

  // Render into a clean off-screen A4-proportioned container (794px wide ~ 96dpi A4 width)
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.color = '#0f172a';
  wrapper.style.padding = '56px 60px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily =
    "'DM Sans', 'Noto Sans Tamil', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  wrapper.style.fontSize = '14px';
  wrapper.style.lineHeight = '1.65';

  // Scoped rich document typography styles
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-odc-docx', 'true');
  styleEl.textContent = `
    .odc-docx-render h1 { font-size: 24px; font-weight: 700; margin: 0 0 14px; color: #0f172a; line-height: 1.3; }
    .odc-docx-render h2 { font-size: 19px; font-weight: 700; margin: 20px 0 10px; color: #0f172a; line-height: 1.35; }
    .odc-docx-render h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #1e293b; line-height: 1.4; }
    .odc-docx-render p { margin: 0 0 10px; }
    .odc-docx-render ul, .odc-docx-render ol { margin: 0 0 12px 24px; padding: 0; }
    .odc-docx-render ul { list-style-type: disc; }
    .odc-docx-render ol { list-style-type: decimal; }
    .odc-docx-render li { margin-bottom: 4px; }
    .odc-docx-render table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
    .odc-docx-render th, .odc-docx-render td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: top; }
    .odc-docx-render th { background: #f1f5f9; font-weight: 600; }
    .odc-docx-render img { max-width: 100%; height: auto; margin: 12px 0; display: block; }
    .odc-docx-render blockquote { border-left: 3px solid #94a3b8; margin: 12px 0; padding-left: 14px; color: #334155; }
    .odc-docx-render strong, .odc-docx-render b { font-weight: 700; }
  `;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'odc-docx-render';
  contentDiv.innerHTML = htmlContent || '<p></p>';

  wrapper.appendChild(styleEl);
  wrapper.appendChild(contentDiv);
  document.body.appendChild(wrapper);

  try {
    // Wait for any embedded base64 images to finish decoding
    const imgs = Array.from(contentDiv.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    onProgress?.(35);

    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.className = '';
        clonedDoc.body.className = '';
        clonedDoc.body.style.cssText = 'margin:0;padding:0;background:#ffffff;color:#0f172a;';
        clonedDoc
          .querySelectorAll('link[rel="stylesheet"], style:not([data-odc-docx])')
          .forEach((el) => el.remove());
      },
    });

    onProgress?.(75);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidthMm = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeightMm = pdf.internal.pageSize.getHeight(); // 297mm
    const pageHeightPx = Math.floor((canvas.width * pdfHeightMm) / pdfWidthMm);

    let yOffsetPx = 0;
    let pageIndex = 0;

    while (yOffsetPx < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yOffsetPx);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        yOffsetPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      const renderHeightMm = (sliceHeightPx * pdfWidthMm) / canvas.width;

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, renderHeightMm);

      yOffsetPx += sliceHeightPx;
      pageIndex++;
    }

    onProgress?.(100);
    return pdf.output('blob');
  } finally {
    wrapper.remove();
  }
}
