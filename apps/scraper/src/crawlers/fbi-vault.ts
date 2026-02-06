import 'dotenv/config';
import * as cheerio from 'cheerio';
import { BaseCrawler, type DocumentInfo } from './base-crawler.js';
import { getDb } from '../lib/db-client.js';
import { createR2Client } from '../lib/r2-client.js';

const FBI_VAULT_BASE = 'https://vault.fbi.gov';

class FBIVaultCrawler extends BaseCrawler {
  private searchTerm: string;

  constructor(searchTerm: string = 'epstein') {
    const db = getDb();
    const r2 = createR2Client();
    super(db, r2, 'fbi', {
      concurrency: parseInt(process.env.CONCURRENCY || '3'),
      delayMs: parseInt(process.env.DELAY_MS || '2000'),
    });
    this.searchTerm = searchTerm;
  }

  async discoverDocuments(): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = [];

    try {
      // FBI Vault has a specific search endpoint
      const searchUrl = `${FBI_VAULT_BASE}/${encodeURIComponent(this.searchTerm)}`;
      console.log(`Fetching FBI Vault: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; OpenClawInvestigations/1.0; +https://openclaw.dev)',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch search results: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Find PDF links on the page
      $('a[href*=".pdf"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const url = href.startsWith('http')
            ? href
            : new URL(href, FBI_VAULT_BASE).toString();
          const fileName = decodeURIComponent(url.split('/').pop() || 'document.pdf');

          if (!documents.some((d) => d.url === url)) {
            documents.push({ url, fileName });
          }
        }
      });

      // Look for part links (FBI releases are often multi-part)
      const partLinks: string[] = [];
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().toLowerCase();
        if (href && (text.includes('part') || text.includes('download'))) {
          const url = href.startsWith('http')
            ? href
            : new URL(href, FBI_VAULT_BASE).toString();
          if (!partLinks.includes(url)) {
            partLinks.push(url);
          }
        }
      });

      // Fetch each part page to find PDFs
      for (const partUrl of partLinks) {
        await this.delay(this.delayMs);

        try {
          const partResponse = await fetch(partUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (compatible; OpenClawInvestigations/1.0; +https://openclaw.dev)',
            },
          });

          if (partResponse.ok) {
            const partHtml = await partResponse.text();
            const $part = cheerio.load(partHtml);

            $part('a[href*=".pdf"]').each((_, element) => {
              const href = $part(element).attr('href');
              if (href) {
                const url = href.startsWith('http')
                  ? href
                  : new URL(href, FBI_VAULT_BASE).toString();
                const fileName = decodeURIComponent(
                  url.split('/').pop() || 'document.pdf'
                );

                if (!documents.some((d) => d.url === url)) {
                  documents.push({ url, fileName });
                }
              }
            });
          }
        } catch (error) {
          console.error(`Error fetching part ${partUrl}:`, error);
        }
      }
    } catch (error) {
      console.error('Error discovering FBI Vault documents:', error);
    }

    return documents;
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const searchTerm = args[0] || 'epstein';

  const crawler = new FBIVaultCrawler(searchTerm);
  const results = await crawler.crawl();

  console.log('\n=== Summary ===');
  console.log(`Total: ${results.length}`);
  console.log(`Success: ${results.filter((r) => r.success).length}`);
  console.log(`Failed: ${results.filter((r) => !r.success).length}`);
}

main().catch(console.error);

export { FBIVaultCrawler };
