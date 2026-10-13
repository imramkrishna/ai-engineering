import { tool } from "@langchain/core/tools";
import z, { json } from "zod";

async function fetchProfile(userId: string) {
  return {
    name: "Admin",
    email: "admin@email.com",
  };
}
export const getUserProfile = tool(
  async (_input, config) => {
    const { userId } = config.context;
    const user = await fetchProfile(userId);
    return JSON.stringify(user);
  },
  {
    name: "get_user_profile",
    description: "Fetch the user profile details",
    schema: z.object({}),
  },
);
