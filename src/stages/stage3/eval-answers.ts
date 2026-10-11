import { createLLMAsJudge, CORRECTNESS_PROMPT } from "openevals";
import { getChatModel } from "../../packages/models/models.js";

type Evaluator = (args: {
  inputs: string;
  outputs: string;
  reference_outputs?: string;
}) => Promise<{
  key: string;
  score: boolean;
  comment: string;
}>;

let evaluatorModel;
let correctnessEvaluator: Evaluator;

try {
  evaluatorModel = getChatModel();
  correctnessEvaluator = createLLMAsJudge({
    prompt: CORRECTNESS_PROMPT,
    judge: evaluatorModel,
  }) as Evaluator;
} catch (error) {
  console.error("Failed to initialize LLM evaluator:", error);
  correctnessEvaluator = async () => ({
    key: "score",
    score: false,
    comment: "Evaluation failed due to initialization error",
  });
}

async function runEval() {
  const result = await correctnessEvaluator({
    inputs: "What is the capital of France?",
    outputs: "The capital of France is Paris.",
    reference_outputs: "Paris",
    // You can also pass context or reference outputs depending on the prompt
  });

  console.log(result);
  // Expected output structure:
  // {
  //   key: 'score',
  //   score: true,
  //   comment: 'The answer correctly identifies Paris as the capital.'
  // }
}
await runEval();
