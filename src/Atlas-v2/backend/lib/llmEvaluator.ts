import { createLLMAsJudge, CORRECTNESS_PROMPT } from "openevals";
import { getChatModel } from "../../../packages/models/models.js";

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
  // Create a fallback evaluator that returns a default response
  correctnessEvaluator = async () => ({
    key: 'score',
    score: false,
    comment: 'Evaluation failed due to initialization error',
  });
}

export default correctnessEvaluator;