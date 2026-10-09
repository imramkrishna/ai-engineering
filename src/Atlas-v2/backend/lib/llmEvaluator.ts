import { createLLMAsJudge, CORRECTNESS_PROMPT } from "openevals";
import { getChatModel } from "../../../packages/models/models.js";
const evaluatorModel = getChatModel();

const correctnessEvaluator = createLLMAsJudge({
  prompt: CORRECTNESS_PROMPT,
  judge: evaluatorModel,
});

export default correctnessEvaluator