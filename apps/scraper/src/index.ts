import 'dotenv/config';
import { DOJLibraryCrawler, ArchiveOrgCrawler } from './crawlers/doj-library.js';
import { FBIVaultCrawler } from './crawlers/fbi-vault.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'doj':
      console.log('Starting DOJ Library discovery...');
      await new DOJLibraryCrawler().crawl();
      break;

    case 'archive':
      console.log('Starting Archive.org discovery...');
      await new ArchiveOrgCrawler().crawl();
      break;

    case 'fbi':
      console.log('Starting FBI Vault discovery...');
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
OpenClaw Investigations Document Scraper

Usage:
  pnpm scraper:start doj       - Discover DOJ library documents
  pnpm scraper:start archive   - Discover Archive.org Epstein collection
  pnpm scraper:start fbi       - Discover FBI Vault documents
  pnpm scraper:start all       - Run all discovery crawlers

Environment variables:
  API_URL               - API endpoint (default: https://openclaw-api.morepencils.workers.dev/api/v1)

Note: Documents are discovered and registered lazily.
      Actual PDF processing happens when agents claim tasks.
      `);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
