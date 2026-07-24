import fs from 'fs';
import path from 'path';
import { embedBatch } from '../src/services/embeddingService';
import { ensureCollection, upsertChunks, ChunkPayload } from '../src/services/qdrantService';

interface ParsedDoc {
  doc_id: string;
  citation: string;
  source_type: 'judgment' | 'bare_act';
  source_url: string;
  text: string;
}

function parseFile(filePath: string): ParsedDoc {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parts = content.split('---');
  
  if (parts.length < 3) {
    throw new Error(`Invalid file format: ${filePath}`);
  }

  const header = parts[1].trim();
  const text = parts.slice(2).join('---').trim();

  const metadata: Record<string, string> = {};
  header.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim();
      metadata[key] = value;
    }
  });

  return {
    doc_id: metadata.doc_id,
    citation: metadata.citation,
    source_type: metadata.source_type as 'judgment' | 'bare_act',
    source_url: metadata.source_url,
    text,
  };
}

function chunkText(text: string, maxTokens: number = 250): string[] {
  // Simple heuristic: 1 token ~= 4 chars roughly. So maxTokens 250 = ~1000 chars.
  // We'll chunk by sentences to keep semantic boundaries.
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  
  let currentChunk = '';
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxTokens * 4) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

async function run() {
  console.log('[Ingest] Starting corpus ingestion...');
  
  try {
    await ensureCollection();

    const corpusDir = path.join(__dirname, '../data/corpus');
    const files = fs.readdirSync(corpusDir).filter(f => f.endsWith('.txt'));

    console.log(`[Ingest] Found ${files.length} corpus files.`);

    for (const file of files) {
      const filePath = path.join(corpusDir, file);
      const doc = parseFile(filePath);
      
      console.log(`[Ingest] Processing ${doc.doc_id}...`);
      const chunks = chunkText(doc.text);
      
      console.log(`[Ingest] Chunked into ${chunks.length} pieces. Getting embeddings...`);
      const vectors = await embedBatch(chunks);

      const points = chunks.map((chunkText, i) => {
        // Generate a deterministic ID based on doc_id and index
        const id = require('crypto')
          .createHash('md5')
          .update(`${doc.doc_id}_${i}`)
          .digest('hex');
          
        return {
          id: [id.slice(0, 8), id.slice(8, 12), id.slice(12, 16), id.slice(16, 20), id.slice(20, 32)].join('-'), // uuid format
          vector: vectors[i],
          payload: {
            doc_id: doc.doc_id,
            citation: doc.citation,
            source_type: doc.source_type,
            source_url: doc.source_url,
            chunk_index: i,
            chunk_text: chunkText
          }
        };
      });

      await upsertChunks(points);
      console.log(`[Ingest] Upserted ${points.length} chunks for ${doc.doc_id}`);
    }

    console.log('[Ingest] ✅ All corpus files ingested successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Ingest] ❌ Error during ingestion:', error);
    process.exit(1);
  }
}

run();
