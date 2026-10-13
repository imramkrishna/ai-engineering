import { tool } from "@langchain/core/tools";
import z from "zod";
import {
  webScrape,
  webScrapeAndInteract,
  webSearch,
} from "../lib/firecrawl.js";

export function makeWebTools() {
  const webSearchTool = tool(
    async ({ topic }) => {
      try {
        return await webSearch(topic);
      } catch (error) {
        console.error(`Web search failed for topic "${topic}".`, error);
        return `Web search failed for topic "${topic}".`;
      }
    },
    {
      name: "web_search",
      description:
        "Search the public web for relevant pages and return useful results. Use this when you need to discover sources before reading a specific webpage.",
      schema: z.object({
        topic: z.string().min(1).describe("The topic or question to search for."),
      }),
    },
  );

  const scrapeWebpage = tool(
    async ({ url }) => {
      try {
        return await webScrape(url);
      } catch (error) {
        console.error(`Webpage scraping failed for URL "${url}".`, error);
        return `Webpage scraping failed for URL "${url}".`;
      }
    },
    {
      name: "scrape_webpage_content",
      description:
        "Scrape a public webpage and return its readable content in Markdown. Use this when you have a specific URL and need the page's text, documentation, policies, or other static information.",
      schema: z.object({
        url: z.url().describe("The public webpage URL to scrape."),
      }),
    },
  );

  const scrapeAndInteractWithWebpage = tool(
    async ({ url, prompt }) => {
      try {
        return await webScrapeAndInteract(url, prompt);
      } catch (error) {
        console.error(
          `Webpage scraping and interaction failed for URL "${url}".`,
          error,
        );
        return `Webpage scraping and interaction failed for URL "${url}".`;
      }
    },
    {
      name: "scrape_and_interact_with_webpage",
      description:
        "Scrape a public webpage and interact with it using a natural-language instruction. Use this for dynamic pages where you need to click, fill, select, navigate, or otherwise perform an action before extracting information.",
      schema: z.object({
        url: z.url().describe("The public webpage URL to open and interact with."),
        prompt: z
          .string()
          .min(1)
          .describe(
            "A precise natural-language instruction describing the interaction or information to retrieve.",
          ),
      }),
    },
  );

  return [webSearchTool, scrapeWebpage, scrapeAndInteractWithWebpage];
}
