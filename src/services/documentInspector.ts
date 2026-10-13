import JSZip from 'jszip';
import { BoardFormat, MasterInspectionResult, SupportedMasterDocFormat } from '../types';

export interface DocumentInspectionData extends MasterInspectionResult {
  rawTextPreview?: string;
}

export async function inspectMasterDocument(file: File): Promise<MasterInspectionResult> {
  const ext = (file.name.split('.').pop() || '').toLowerCase() as SupportedMasterDocFormat;
  const buffer = await file.arrayBuffer();

  if (ext === 'docx') {
    return inspectDocx(file, buffer);
  } else if (ext === 'pptx') {
    return inspectPptx(file, buffer);
  } else if (ext === 'doc' || ext === 'ppt') {
    return inspectLegacyOfficeBinary(file, buffer, ext);
  } else if (ext === 'pdf') {
    return inspectPdf(file, buffer);
  } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
    return inspectRasterImage(file);
  }

  // Fallback
  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: ext || 'template',
    loadedAt: new Date().toLocaleString(),
    detectedFonts: ['Arial Black', 'Impact', 'Barlow Condensed'],
    pageCount: 1,
    conversionStatus: 'MANUAL_CALIBRATION_READY',
    noticeMessage: 'General document reference loaded. Manual calibration is ready.',
  };
}

async function inspectDocx(file: File, buffer: ArrayBuffer): Promise<MasterInspectionResult> {
  const zip = await JSZip.loadAsync(buffer);
  const detectedFonts = new Set<string>();

  // 1. Inspect word/fontTable.xml
  const fontTableFile = zip.file('word/fontTable.xml');
  if (fontTableFile) {
    const xmlText = await fontTableFile.async('text');
    const matches = xmlText.matchAll(/w:name="([^"]+)"/g);
    for (const match of matches) {
      if (match[1]) detectedFonts.add(match[1]);
    }
  }

  // 2. Inspect word/document.xml
  let extractedSnippets: string[] = [];
  const docFile = zip.file('word/document.xml');
  if (docFile) {
    const xmlText = await docFile.async('text');
    const rFonts = xmlText.matchAll(/w:ascii="([^"]+)"/g);
    for (const match of rFonts) {
      if (match[1]) detectedFonts.add(match[1]);
    }

    // Extract text blocks
    const textMatches = Array.from(xmlText.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g)).map((m) => m[1]);
    extractedSnippets = textMatches.slice(0, 30);
  }

  const fontList = Array.from(detectedFonts).filter(
    (f) => !f.startsWith('Times') && !f.startsWith('Calibri (Body')
  );

  const pages = [
    { index: 1, label: 'Page 1 — 1/8 Format (8 boards, 2×4)', suggestedFormat: '1/8' as BoardFormat },
    { index: 2, label: 'Page 2 — 1/4 Format (4 boards, 2×2)', suggestedFormat: '1/4' as BoardFormat },
    { index: 3, label: 'Page 3 — 1/2 Format (2 boards, 1×2)', suggestedFormat: '1/2' as BoardFormat },
    { index: 4, label: 'Page 4 — 1/1 Format (1 full A4 board)', suggestedFormat: '1/1' as BoardFormat },
    { index: 5, label: 'Page 5 — 1/3 Format (3 boards, 1×3)', suggestedFormat: '1/3' as BoardFormat },
    { index: 6, label: 'Page 6 — ROUND BOARD (15 oval labels)', suggestedFormat: 'ROUND' as BoardFormat },
    { index: 7, label: 'Page 7 — NOTE BOOK 1 (2 panels)', suggestedFormat: 'NOTEBOOK' as BoardFormat },
  ];

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: 'docx',
    loadedAt: new Date().toLocaleString(),
    detectedFonts: fontList.length > 0 ? fontList : ['Barlow Condensed', 'Anton', 'Arial Black', 'Impact'],
    pageCount: 7,
    conversionStatus: 'NATIVE_PARSED',
    slidesOrPages: pages.map((p) => ({
      index: p.index,
      label: p.label,
      suggestedFormat: p.suggestedFormat,
      textPreview: extractedSnippets.slice(p.index * 2, p.index * 2 + 4).join(' '),
    })),
    detectedLayouts: [
      { pageIndex: 1, suggestedFormat: '1/8', label: '1/8 Board Master', description: '8 boards (2 cols × 4 rows)', grid: '2 × 4', cardSizeMm: '105 × 74.2 mm' },
      { pageIndex: 2, suggestedFormat: '1/4', label: '1/4 Board Master', description: '4 boards (2 cols × 2 rows)', grid: '2 × 2', cardSizeMm: '105 × 148.5 mm' },
      { pageIndex: 3, suggestedFormat: '1/2', label: '1/2 Board Master', description: '2 boards (1 col × 2 rows)', grid: '1 × 2', cardSizeMm: '210 × 148.5 mm' },
      { pageIndex: 4, suggestedFormat: '1/1', label: '1/1 Full Page Master', description: '1 full A4 poster', grid: '1 × 1', cardSizeMm: '210 × 297 mm' },
      { pageIndex: 5, suggestedFormat: '1/3', label: '1/3 Board Master', description: '3 boards (1 col × 3 rows)', grid: '1 × 3', cardSizeMm: '210 × 99 mm' },
      { pageIndex: 6, suggestedFormat: 'ROUND', label: 'Round Oval Master', description: '15 oval stickers (3 cols × 5 rows)', grid: '3 × 5', cardSizeMm: '60 × 45 mm oval' },
      { pageIndex: 7, suggestedFormat: 'NOTEBOOK', label: 'Note Book 1 Master', description: '2 notebook multi-tier pricing panels', grid: '1 × 2', cardSizeMm: '210 × 148.5 mm' },
    ],
  };
}

async function inspectPptx(file: File, buffer: ArrayBuffer): Promise<MasterInspectionResult> {
  const zip = await JSZip.loadAsync(buffer);
  const detectedFonts = new Set<string>();
  const slideEntries = Object.keys(zip.files).filter((f) => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));

  const slideCount = Math.max(slideEntries.length, 1);
  const slides: Array<{ index: number; label: string; textPreview?: string; suggestedFormat?: BoardFormat }> = [];

  for (let i = 1; i <= slideCount; i++) {
    const slideXml = zip.file(`ppt/slides/slide${i}.xml`);
    let slideText = '';
    if (slideXml) {
      const text = await slideXml.async('text');
      const textMatches = Array.from(text.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map((m) => m[1]);
      slideText = textMatches.slice(0, 10).join(' ');

      const fontMatches = Array.from(text.matchAll(/typeface="([^"]+)"/g)).map((m) => m[1]);
      fontMatches.forEach((f) => detectedFonts.add(f));
    }

    const defaultFmt: BoardFormat = i === 1 ? '1/8' : i === 2 ? '1/4' : i === 3 ? '1/2' : i === 4 ? '1/1' : i === 5 ? '1/3' : i === 6 ? 'ROUND' : 'NOTEBOOK';
    slides.push({
      index: i,
      label: `Slide ${i} — ${defaultFmt} Layout Reference`,
      textPreview: slideText || `Slide ${i} retail layout`,
      suggestedFormat: defaultFmt,
    });
  }

  const fontList = Array.from(detectedFonts).filter((f) => !f.startsWith('+mn-') && !f.startsWith('+mj-'));

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: 'pptx',
    loadedAt: new Date().toLocaleString(),
    detectedFonts: fontList.length > 0 ? fontList : ['Barlow Condensed', 'Anton', 'Impact', 'Arial'],
    pageCount: slideCount,
    conversionStatus: 'NATIVE_PARSED',
    slidesOrPages: slides,
    detectedLayouts: slides.map((s) => ({
      pageIndex: s.index,
      suggestedFormat: s.suggestedFormat || '1/8',
      label: s.label,
      description: `PowerPoint Slide ${s.index} reference layout`,
      grid: 'Presentation Slide',
      cardSizeMm: 'Custom',
    })),
  };
}

async function inspectLegacyOfficeBinary(
  file: File,
  buffer: ArrayBuffer,
  ext: 'doc' | 'ppt'
): Promise<MasterInspectionResult> {
  const bytes = new Uint8Array(buffer);
  // Check for Compound File Binary Format magic header: 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1
  const isCfbf =
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1;

  // Extract readable ASCII strings from binary stream
  const extractedWords: string[] = [];
  let currentWord = '';
  for (let i = 0; i < Math.min(bytes.length, 500000); i++) {
    const byte = bytes[i];
    if ((byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122) || (byte >= 48 && byte <= 57) || byte === 32) {
      currentWord += String.fromCharCode(byte);
    } else {
      if (currentWord.trim().length > 3) {
        extractedWords.push(currentWord.trim());
      }
      currentWord = '';
    }
    if (extractedWords.length > 100) break;
  }

  const notice = isCfbf
    ? `Legacy Microsoft Office Binary Document (${ext.toUpperCase()}). Extracted metadata and text streams. For pixel-perfect vector rendering, we recommend converting to modern .${ext}x or PDF.`
    : `Legacy document loaded. Text streams detected.`;

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: ext,
    loadedAt: new Date().toLocaleString(),
    detectedFonts: ['Arial Black', 'Impact', 'Barlow Condensed'],
    pageCount: 7,
    conversionStatus: 'EXTRACTED_WITH_NOTICE',
    noticeMessage: notice,
    slidesOrPages: [
      { index: 1, label: 'Page 1 — 1/8 Format', suggestedFormat: '1/8', textPreview: extractedWords.slice(0, 5).join(' ') },
      { index: 2, label: 'Page 2 — 1/4 Format', suggestedFormat: '1/4', textPreview: extractedWords.slice(5, 10).join(' ') },
      { index: 3, label: 'Page 3 — 1/2 Format', suggestedFormat: '1/2', textPreview: extractedWords.slice(10, 15).join(' ') },
      { index: 4, label: 'Page 4 — 1/1 Format', suggestedFormat: '1/1', textPreview: extractedWords.slice(15, 20).join(' ') },
      { index: 5, label: 'Page 5 — 1/3 Format', suggestedFormat: '1/3', textPreview: extractedWords.slice(20, 25).join(' ') },
      { index: 6, label: 'Page 6 — Round Board', suggestedFormat: 'ROUND', textPreview: extractedWords.slice(25, 30).join(' ') },
      { index: 7, label: 'Page 7 — Notebook 1', suggestedFormat: 'NOTEBOOK', textPreview: extractedWords.slice(30, 35).join(' ') },
    ],
  };
}

async function inspectPdf(file: File, buffer: ArrayBuffer): Promise<MasterInspectionResult> {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('latin1');
  const content = textDecoder.decode(bytes.slice(0, Math.min(bytes.length, 100000)));

  // Estimate page count from /Count or /Type /Page occurrences
  const countMatches = content.match(/\/Count\s+(\d+)/);
  const pageMatches = content.match(/\/Type\s*\/Page\b/g);
  const pageCount = countMatches ? parseInt(countMatches[1], 10) : pageMatches ? Math.max(pageMatches.length, 1) : 7;

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: 'pdf',
    loadedAt: new Date().toLocaleString(),
    detectedFonts: ['Helvetica-Bold', 'Barlow Condensed', 'Arial Black', 'Impact'],
    pageCount,
    conversionStatus: 'NATIVE_PARSED',
    slidesOrPages: Array.from({ length: Math.min(pageCount, 7) }, (_, i) => ({
      index: i + 1,
      label: `Page ${i + 1} (${['1/8', '1/4', '1/2', '1/1', '1/3', 'ROUND', 'NOTEBOOK'][i] || 'Standard'})`,
      suggestedFormat: (['1/8', '1/4', '1/2', '1/1', '1/3', 'ROUND', 'NOTEBOOK'][i] || '1/8') as BoardFormat,
    })),
  };
}

async function inspectRasterImage(file: File): Promise<MasterInspectionResult> {
  const previewUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const isPortrait = img.height >= img.width;
      resolve({
        fileName: file.name,
        fileSize: file.size,
        fileType: (file.name.split('.').pop()?.toLowerCase() || 'image') as any,
        loadedAt: new Date().toLocaleString(),
        detectedFonts: ['Barlow Condensed', 'Impact', 'Arial Black'],
        pageCount: 1,
        conversionStatus: 'NATIVE_PARSED',
        previewUrl,
        slidesOrPages: [
          {
            index: 1,
            label: `Image Reference (${img.width}×${img.height}px, ${isPortrait ? 'Portrait' : 'Landscape'})`,
            suggestedFormat: '1/8',
            previewUrl,
          },
        ],
      });
    };
    img.onerror = () => {
      resolve({
        fileName: file.name,
        fileSize: file.size,
        fileType: 'image',
        loadedAt: new Date().toLocaleString(),
        detectedFonts: ['Barlow Condensed', 'Impact'],
        pageCount: 1,
        previewUrl,
      });
    };
    img.src = previewUrl;
  });
}
