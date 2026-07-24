import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { embedText } from '../services/embeddingService';
import { searchSimilar } from '../services/qdrantService';
import { createError } from '../middleware/errorHandler';

export interface SearchResultItem {
  id: string | number;
  score: number;
  citation: string;
  doc_id: string;
  source_type: string;
  source_url: string;
  chunk_text: string;
}

const MIN_SCORE_THRESHOLD = 0.35;

export async function searchHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { query } = req.body as { query: string };

    if (!query || typeof query !== 'string') {
      throw createError('Query is required', 400);
    }
    if (query.trim().length < 5) {
      throw createError('Query must be at least 5 characters long', 400);
    }
    if (query.length > 1000) {
      throw createError('Query is too long (max 1000 characters)', 400);
    }

    console.log('[Search] Embedding query:', query.substring(0, 80));
    const queryVector = await embedText(query);

    console.log('[Search] Searching Qdrant...');
    const results = await searchSimilar(queryVector, 5, MIN_SCORE_THRESHOLD);

    if (results.length === 0) {
      res.json({
        results: [],
        message:
          'No relevant precedent found in corpus. Try rephrasing your query or using more specific legal terminology.',
      });
      return;
    }

    const formattedResults: SearchResultItem[] = results.map((r) => ({
      id: r.id,
      score: parseFloat(r.score.toFixed(4)),
      citation: r.payload.citation,
      doc_id: r.payload.doc_id,
      source_type: r.payload.source_type,
      source_url: r.payload.source_url,
      chunk_text: r.payload.chunk_text,
    }));

    res.json({ results: formattedResults, total: formattedResults.length });
  } catch (err) {
    next(err);
  }
}
