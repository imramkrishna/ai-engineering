import { getEmbeddingsModel } from "../../packages/models.js";

const embeddingModel = getEmbeddingsModel();

function cosine(x: number[], y: number[]) {
  let dot = 0;
  let nx = 0;
  let ny = 0;

  for (let i = 0; i < x.length; i++) {
    dot += x[i]! * y[i]!;
    nx += x[i]! ** 2;
    ny += y[i]! ** 2;
  }

  return dot / (Math.sqrt(nx) * Math.sqrt(ny));
}

async function main() {
  const response = await embeddingModel.embedDocuments([
    // Very similar
    "How do I reset my password?",
    "I forgot my password. How can I change it?",

    // Related but less similar
    "How do I reset my password?",
    "How can I update my account credentials?",

    // Unrelated
    "How do I reset my password?",
    "What is the weather like today?",
  ]);
  const [response1, response2, response3, response4, response5, response6] =
    response;
  console.log(cosine(response1!, response2!));
  console.log(cosine(response3!, response4!));
  console.log(cosine(response5!, response6!));
}

main();
