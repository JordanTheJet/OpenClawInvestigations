import type { DocumentSource } from '@openclaw/shared';

export interface CrawlResult {
  url: string;
  fileName: string;
  success: boolean;
  isNew?: boolean;
  error?: string;
}

export interface DocumentInfo {
  url: string;
  fileName: string;
  fileType?: string;
}

export interface DiscoveryConfig {
  apiUrl: string;
  batchSize: number;
  delayMs: number;
}

const DEFAULT_CONFIG: DiscoveryConfig = {
  apiUrl: process.env.API_URL || 'https://openclaw-api.morepencils.workers.dev/api/v1',
  batchSize: 50,
  delayMs: 100,
};

/**
 * Base crawler for discovering documents
 * Now uses lazy discovery - just registers URLs, no downloads
 */
export abstract class BaseCrawler {
  protected source: DocumentSource;
  protected config: DiscoveryConfig;

  constructor(source: DocumentSource, config: Partial<DiscoveryConfig> = {}) {
    this.source = source;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Discover document URLs from the source
   * Implement in subclass
   */
  abstract discoverDocuments(): Promise<DocumentInfo[]>;

  /**
   * Submit discovered documents to the API
   */
  async submitDiscoveries(documents: DocumentInfo[]): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];

    // Process in batches
    for (let i = 0; i < documents.length; i += this.config.batchSize) {
      const batch = documents.slice(i, i + this.config.batchSize);

      try {
        const response = await fetch(`${this.config.apiUrl}/discover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documents: batch.map((doc) => ({
              sourceUrl: doc.url,
              fileName: doc.fileName,
              source: this.source,
              fileType: doc.fileType || this.getFileType(doc.fileName),
            })),
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          batch.forEach((doc) => {
            results.push({
              url: doc.url,
              fileName: doc.fileName,
              success: false,
              error: `API error: ${response.status} - ${error}`,
            });
          });
        } else {
          const result = await response.json() as { new: number; existing: number };
          batch.forEach((doc) => {
            results.push({
              url: doc.url,
              fileName: doc.fileName,
              success: true,
              isNew: true, // We don't know per-doc, but batch succeeded
            });
          });
          console.log(`Batch ${Math.floor(i / this.config.batchSize) + 1}: ${result.new} new, ${result.existing} existing`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        batch.forEach((doc) => {
          results.push({
            url: doc.url,
            fileName: doc.fileName,
            success: false,
            error: message,
          });
        });
      }

      // Rate limiting
      if (i + this.config.batchSize < documents.length) {
        await this.delay(this.config.delayMs);
      }
    }

    return results;
  }

  /**
   * Main crawl method - discover and submit
   */
  async crawl(): Promise<CrawlResult[]> {
    console.log(`Starting ${this.source} discovery crawler...`);

    const documents = await this.discoverDocuments();
    console.log(`Discovered ${documents.length} documents`);

    if (documents.length === 0) {
      return [];
    }

    const results = await this.submitDiscoveries(documents);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(`Discovery complete: ${successful} submitted, ${failed} failed`);

    return results;
  }

  protected getFileType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video';
      default:
        return 'pdf';
    }
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
