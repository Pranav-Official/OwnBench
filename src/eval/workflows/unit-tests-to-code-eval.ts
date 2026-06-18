import type { EvalContext } from "../types.js";

export async function runUnitTestsToCodeEval(
  ctx: EvalContext,
): Promise<void> {
  ctx.onEvent?.({
    type: "info",
    id: 1,
    message: `Evaluating model: ${ctx.model}`,
  });

  ctx.onEvent?.({
    type: "info",
    id: 2,
    message: "Unit Tests to Code eval is not yet implemented.",
  });
}
