import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';

dotenv.config();

const COLLECTION_NAME = 'legal_corpus';
const VECTOR_SIZE = 384; // all-MiniLM-L6-v2 output dim

const client = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

export interface ChunkPayload {
  doc_id: string;
  citation: string;
  chunk_text: string;
  source_type: 'judgment' | 'bare_act';
  source_url: string;
  chunk_index: number;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload: ChunkPayload;
}

export async function ensureCollection(): Promise<void> {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log('[Qdrant] Creating collection:', COLLECTION_NAME);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });
      console.log('[Qdrant] Collection created');
    } else {
      console.log('[Qdrant] Collection already exists');
    }
  } catch (error) {
    console.error('[Qdrant] Error ensuring collection:', error);
    throw error;
  }
}

export async function upsertChunks(
  chunks: { id: string; vector: number[]; payload: ChunkPayload }[]
): Promise<void> {
  const points = chunks.map((chunk) => ({
    id: chunk.id,
    vector: chunk.vector,
    payload: chunk.payload as unknown as Record<string, unknown>,
  }));

  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log(`[Qdrant] Upserted ${chunks.length} points`);
}

export async function searchSimilar(
  queryVector: number[],
  topK: number = 5,
  scoreThreshold: number = 0.35
): Promise<SearchResult[]> {
  const results = await client.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    score_threshold: scoreThreshold,
    with_payload: true,
  });

  return results.map((r) => ({
    id: r.id,
    score: r.score,
    payload: r.payload as unknown as ChunkPayload,
  }));
}

export async function getCollectionInfo() {
  return client.getCollection(COLLECTION_NAME);
}

export default client;
