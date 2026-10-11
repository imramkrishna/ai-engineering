import { goldenDataset } from "./dataset.js";

type Case = {
  question: string;
  relevantIds: string[];
};

export async function evalRetrieval(
  cases: Case[],
  retrieve: (q: string) => Promise<string[]>,
  k = 6,
) {
  if (cases.length === 0) {
    return {
      hitRate: 0,
      recallRate: 0,
      rrRate: 0,
    };
  }

  let hits = 0;
  let totalRecall = 0;
  let totalReciprocalRank = 0;

  for (const c of cases) {
    const ids = (await retrieve(c.question)).slice(0, k);

    const found = c.relevantIds.filter((id) => ids.includes(id));

    if (found.length > 0) {
      hits++;
    }

    const recall =
      c.relevantIds.length === 0 ? 0 : found.length / c.relevantIds.length;

    totalRecall += recall;

    const firstRelevantIndex = ids.findIndex((id) =>
      c.relevantIds.includes(id),
    );

    const reciprocalRank =
      firstRelevantIndex === -1 ? 0 : 1 / (firstRelevantIndex + 1);

    totalReciprocalRank += reciprocalRank;
  }

  return {
    hitRate: hits / cases.length,
    recallRate: totalRecall / cases.length,
    rrRate: totalReciprocalRank / cases.length,
  };
}

const retrieve = async (question: string): Promise<string[]> => {
  const document = goldenDataset.find((d) => d.question === question);
  console.log(`Retrieved for ${question} : ${document?.relevantIds}`);
  return document?.relevantIds ?? [];
};

const result = await evalRetrieval(
  goldenDataset.map((d) => {
    let result = {
      question: d.question,
      relevantIds: d.relevantIds,
    };
    return result;
  }),
  retrieve,
  6,
);

console.log(result);
