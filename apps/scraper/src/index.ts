import 'dotenv/config';
import { DOJLibraryCrawler, ArchiveOrgCrawler } from './crawlers/doj-library.js';
import { FBIVaultCrawler } from './crawlers/fbi-vault.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'doj':
      console.log('Starting DOJ Library crawler...');
      await new DOJLibraryCrawler().crawl();
      break;

    case 'archive':
      console.log('Starting Archive.org crawler...');
      await new ArchiveOrgCrawler().crawl();
      break;

    case 'fbi':
      console.log('Starting FBI Vault crawler...');
      await new FBIVaultCrawler(args[1] || 'epstein').crawl();
      break;

    case 'all':
      console.log('Starting all crawlers...');
      await new ArchiveOrgCrawler().crawl();
      await new DOJLibraryCrawler().crawl();
      await new FBIVaultCrawler().crawl();
      break;

    default:
      console.log(`
OpenClaw Document Scraper

Usage:
  pnpm scraper:start doj       - Crawl DOJ library
  pnpm scraper:start archive   - Crawl Archive.org Epstein collection
  pnpm scraper:start fbi       - Crawl FBI Vault
  pnpm scraper:start all       - Run all crawlers

Environment variables:
  DATABASE_URL          - PostgreSQL connection string
  R2_ENDPOINT           - Cloudflare R2 endpoint
  R2_ACCESS_KEY_ID      - R2 access key
  R2_SECRET_ACCESS_KEY  - R2 secret key
  R2_BUCKET_NAME        - R2 bucket name
  CONCURRENCY           - Number of concurrent downloads (default: 5)
  DELAY_MS              - Delay between requests in ms (default: 1000)
      `);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
