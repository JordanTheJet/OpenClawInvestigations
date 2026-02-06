import 'dotenv/config';
import * as cheerio from 'cheerio';
import { BaseCrawler, type DocumentInfo } from './base-crawler.js';

const DOJ_BASE_URL = 'https://www.justice.gov/usao-sdfl/us-v-ghislaine-maxwell-court-filings';
const EPSTEIN_ARCHIVE_URL = 'https://archive.org/details/epstein-documents';

/**
 * Crawler for DOJ Maxwell court filings
 */
export class DOJLibraryCrawler extends BaseCrawler {
  private baseUrl: string;

  constructor(baseUrl: string = DOJ_BASE_URL) {
    super('doj');
    this.baseUrl = baseUrl;
  }

  async discoverDocuments(): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = [];

    try {
      console.log(`Fetching DOJ page: ${this.baseUrl}`);
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Find all PDF links
      $('a[href$=".pdf"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const url = href.startsWith('http') ? href : new URL(href, this.baseUrl).toString();
          const fileName = decodeURIComponent(url.split('/').pop() || 'document.pdf');
          if (!documents.some((d) => d.url === url)) {
            documents.push({ url, fileName });
          }
        }
      });
    } catch (error) {
      console.error('Error discovering DOJ documents:', error);
    }

    return documents;
  }
}

/**
 * Crawler for Archive.org Epstein documents collection
 */
export class ArchiveOrgCrawler extends BaseCrawler {
  private collectionId: string;

  constructor(collectionId: string = 'epstein-documents') {
    super('archive');
    this.collectionId = collectionId;
  }

  async discoverDocuments(): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = [];

    try {
      // Use Internet Archive API to get collection metadata
      const metadataUrl = `https://archive.org/metadata/${this.collectionId}`;
      console.log(`Fetching Archive.org metadata: ${metadataUrl}`);

      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const metadata = (await response.json()) as {
        files?: Array<{ name: string; format?: string; size?: string }>;
      };

      // Filter for PDF files
      if (metadata.files) {
        for (const file of metadata.files) {
          if (
            file.name.toLowerCase().endsWith('.pdf') ||
            file.format?.toLowerCase().includes('pdf')
          ) {
            const url = `https://archive.org/download/${this.collectionId}/${encodeURIComponent(file.name)}`;
            documents.push({
              url,
              fileName: file.name,
              fileType: 'pdf',
            });
          }
        }
      }

      console.log(`Found ${documents.length} PDFs in archive`);
    } catch (error) {
      console.error('Error discovering Archive.org documents:', error);
    }

    return documents;
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const source = args[0] || 'archive';

  let crawler: BaseCrawler;

  switch (source) {
    case 'doj':
      crawler = new DOJLibraryCrawler();
      break;
    case 'archive':
    default:
      crawler = new ArchiveOrgCrawler();
      break;
  }

  const results = await crawler.crawl();

  console.log('\n=== Summary ===');
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter((r) => r.success).length}`);
  console.log(`Failed: ${results.filter((r) => !r.success).length}`);
}

main().catch(console.error);
