/* eslint-disable @typescript-eslint/no-explicit-any */
let pipeline: any = null;
let embeddingPipeline: any = null;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

async function loadPipeline() {
  if (embeddingPipeline) return embeddingPipeline;

  console.log('[Embedding] Loading model:', MODEL_NAME);
  // Dynamically import to handle ESM module
  const { pipeline: createPipeline } = await import('@xenova/transformers');
  embeddingPipeline = await createPipeline('feature-extraction', MODEL_NAME, {
    quantized: true,
  });
  console.log('[Embedding] Model loaded successfully');
  return embeddingPipeline;
}

export async function embedText(text: string): Promise<number[]> {
  const pipe = await loadPipeline();

  // Truncate text to avoid exceeding model max tokens
  const truncated = text.slice(0, 2000);

  const output = await pipe(truncated, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert Float32Array to regular array
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const pipe = await loadPipeline();
  const results: number[][] = [];

  for (const text of texts) {
    const truncated = text.slice(0, 2000);
    const output = await pipe(truncated, {
      pooling: 'mean',
      normalize: true,
    });
    results.push(Array.from(output.data as Float32Array));
  }

  return results;
}

// Preload model on startup
export const preloadEmbeddingModel = loadPipeline;

export { pipeline };
