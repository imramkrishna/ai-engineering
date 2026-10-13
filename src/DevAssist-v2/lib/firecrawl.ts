import { Firecrawl } from "firecrawl";
import { env } from "../../utils/getEnv.js";
const firecrawl = new Firecrawl({
  apiKey: env.FIRECRAWL_API_KEY!,
});

export async function webSearch(topic: string) {
  const results = await firecrawl.search(topic, {
    limit: 3,
    scrapeOptions: {
      formats: ["markdown"],
    },
  });
  return results;
}
export async function webScrape(url: string) {
  const results = await firecrawl.scrape(url, {
    formats: ["markdown"],
  });
  return results;
}

export async function webScrapeAndInteract(url: string, prompt: string) {
  const results = await firecrawl.scrape(url, {
    formats: ["markdown"],
  });
  const scrapeId = results.metadata?.scrapeId;
  const interactedResult = await firecrawl.interact(scrapeId as string, {
    prompt,
  });
  return interactedResult;
}

