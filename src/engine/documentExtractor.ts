export type ExtractedDocumentType = 'pdf' | 'docx' | 'image' | 'text';

export async function extractDocumentText(file: File): Promise<{ text: string; type: ExtractedDocumentType }> {
  const lowerName = file.name.toLowerCase();

  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const { extractPdfText } = await import('./pdfExtractor');
    return { text: await extractPdfText(file), type: 'pdf' };
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const { extractDocxText } = await import('./docxExtractor');
    return { text: await extractDocxText(file), type: 'docx' };
  }

  if (file.type.startsWith('image/')) {
    return { text: `[Bild: ${file.name}]`, type: 'image' };
  }

  const text = await file.text();
  return { text: text.trim(), type: 'text' };
}
