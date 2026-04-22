export interface CostSnapshot {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | null;
  model: string;
}

/**
 * Cost tracker that works with ANY model.
 *
 * Pricing is never hardcoded. If the user sets MINA_INPUT_PRICE and
 * MINA_OUTPUT_PRICE (per 1M tokens in USD), cost estimates are shown.
 * Otherwise only token counts are reported.
 */
export class CostTracker {
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private totalCost = 0;
  private model: string;
  private inputPrice: number | null = null;
  private outputPrice: number | null = null;

  constructor(model: string) {
    this.model = model;

    const inputPriceEnv = process.env.MINA_INPUT_PRICE;
    const outputPriceEnv = process.env.MINA_OUTPUT_PRICE;
    if (inputPriceEnv) this.inputPrice = parseFloat(inputPriceEnv);
    if (outputPriceEnv) this.outputPrice = parseFloat(outputPriceEnv);
  }

  recordUsage(inputTokens: number, outputTokens: number): void {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;

    if (this.inputPrice !== null && this.outputPrice !== null) {
      const cost =
        (inputTokens / 1_000_000) * this.inputPrice +
        (outputTokens / 1_000_000) * this.outputPrice;
      this.totalCost += cost;
    }
  }

  getSnapshot(): CostSnapshot {
    return {
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      estimatedCost:
        this.inputPrice !== null && this.outputPrice !== null
          ? this.totalCost
          : null,
      model: this.model,
    };
  }

  getSummary(): string {
    const snap = this.getSnapshot();
    const tokens = `${snap.inputTokens} input + ${snap.outputTokens} output tokens`;
    if (snap.estimatedCost !== null) {
      return `Session cost: ~$${snap.estimatedCost.toFixed(4)} (${tokens})`;
    }
    return `Session usage: ${tokens}`;
  }
}
