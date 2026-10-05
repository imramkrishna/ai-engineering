import { tool } from "@langchain/core/tools";
import z from "zod";

export const getWeather = tool(
  async ({ city, unit }) => {
    const result = { city, temp: 22, unit };
    return JSON.stringify(result);
  },
  {
    name: "get_weather",
    description: "Get the current weather for a city",
    schema: z.object({
      city: z.string().describe("City name, e.g. Kathmandu"),
      unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
    }),
  },
);
export const getCurrentTime = tool(
  async () => {
    return JSON.stringify(new Date(Date.now()).getTime());
  },
  {
    name: "get_current_time",
    description: "Get Current Time.",
  },
);
export const tools = [getWeather,getCurrentTime];
