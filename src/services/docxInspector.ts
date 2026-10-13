import JSZip from 'jszip';
import { MasterDocxInfo } from '../types';

export async function inspectMasterDocx(file: File): Promise<MasterDocxInfo> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const detectedFonts = new Set<string>();

  // 1. Inspect word/fontTable.xml if present
  const fontTableFile = zip.file('word/fontTable.xml');
  if (fontTableFile) {
    const xmlText = await fontTableFile.async('text');
    // Extract <w:font w:name="...">
    const matches = xmlText.matchAll(/w:name="([^"]+)"/g);
    for (const match of matches) {
      if (match[1]) detectedFonts.add(match[1]);
    }
  }

  // 2. Also check word/document.xml for rFonts
  const docFile = zip.file('word/document.xml');
  if (docFile) {
    const xmlText = await docFile.async('text');
    const rFonts = xmlText.matchAll(/w:ascii="([^"]+)"/g);
    for (const match of rFonts) {
      if (match[1]) detectedFonts.add(match[1]);
    }
  }

  const fontList = Array.from(detectedFonts).filter(
    (f) => !f.startsWith('Times') && !f.startsWith('Calibri (Body')
  );

  return {
    fileName: file.name,
    fileSize: file.size,
    loadedAt: new Date().toLocaleString(),
    detectedFonts: fontList.length > 0 ? fontList : ['Arial Black', 'Impact', 'Arial'],
  };
}
