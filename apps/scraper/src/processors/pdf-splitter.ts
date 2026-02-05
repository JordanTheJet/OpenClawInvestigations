import pdfParse from 'pdf-parse';

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
}

export async function extractPDFMetadata(buffer: Buffer): Promise<PDFMetadata> {
  try {
    const data = await pdfParse(buffer);
    return {
      pageCount: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return {
      pageCount: 0,
    };
  }
}

export function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'tiff':
    case 'bmp':
      return 'image';
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return 'video';
    case 'txt':
    case 'doc':
    case 'docx':
      return 'text';
    default:
      return 'pdf'; // Default to PDF
  }
}

export function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    tiff: 'image/tiff',
    bmp: 'image/bmp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
