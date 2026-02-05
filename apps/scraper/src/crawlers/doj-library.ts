import 'dotenv/config';
import * as cheerio from 'cheerio';
import { BaseCrawler, type DocumentInfo } from './base-crawler.js';
import { getDb } from '../lib/db-client.js';
import { createR2Client } from '../lib/r2-client.js';

const DOJ_BASE_URL = 'https://www.justice.gov/usao-sdfl/us-v-ghislaine-maxwell-court-filings';
const EPSTEIN_LIBRARY_URL = 'https://archive.org/details/epstein-documents';

class DOJLibraryCrawler extends BaseCrawler {
  private baseUrl: string;

  constructor(baseUrl: string = DOJ_BASE_URL) {
    const db = getDb();
    const r2 = createR2Client();
    super(db, r2, 'doj', {
      concurrency: parseInt(process.env.CONCURRENCY || '5'),
      delayMs: parseInt(process.env.DELAY_MS || '1000'),
    });
    this.baseUrl = baseUrl;
  }

  async discoverDocuments(): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = [];

    try {
      // Fetch the main page
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch index: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Find all PDF links
      $('a[href$=".pdf"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const url = href.startsWith('http') ? href : new URL(href, this.baseUrl).toString();
          const fileName = decodeURIComponent(url.split('/').pop() || 'document.pdf');

          documents.push({ url, fileName });
        }
      });

      // Also look for links in common patterns
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && (href.includes('/files/') || href.includes('/docs/'))) {
          const url = href.startsWith('http') ? href : new URL(href, this.baseUrl).toString();
          if (url.endsWith('.pdf') || url.endsWith('.PDF')) {
            const fileName = decodeURIComponent(url.split('/').pop() || 'document.pdf');
            if (!documents.some((d) => d.url === url)) {
              documents.push({ url, fileName });
            }
          }
        }
      });
    } catch (error) {
      console.error('Error discovering documents:', error);
    }

    return documents;
  }
}

class ArchiveOrgCrawler extends BaseCrawler {
  private collectionId: string;

  constructor(collectionId: string = 'epstein-documents') {
    const db = getDb();
    const r2 = createR2Client();
    super(db, r2, 'doj', {
      concurrency: parseInt(process.env.CONCURRENCY || '3'),
      delayMs: parseInt(process.env.DELAY_MS || '2000'),
    });
    this.collectionId = collectionId;
  }

  async discoverDocuments(): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = [];

    try {
      // Use Internet Archive API to get collection metadata
      const metadataUrl = `https://archive.org/metadata/${this.collectionId}`;
      const response = await fetch(metadataUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }

      const metadata = (await response.json()) as {
        files?: Array<{ name: string; format: string }>;
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
            });
          }
        }
      }
    } catch (error) {
      console.error('Error discovering documents from Archive.org:', error);
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

  // Log failures
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  - ${f.fileName}: ${f.error}`);
    }
  }
}

main().catch(console.error);

export { DOJLibraryCrawler, ArchiveOrgCrawler };
