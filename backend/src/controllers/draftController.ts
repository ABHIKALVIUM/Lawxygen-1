import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../db/client';
import { streamDraft } from '../services/groqService';
import { createError } from '../middleware/errorHandler';

interface DraftRow {
  id: string;
  user_id: string;
  doc_type: string;
  title: string;
  content: string;
  form_data: Record<string, string>;
  created_at: string;
}

export async function generateDraftHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { docType, formData } = req.body as {
      docType: 'legal_notice' | 'nda';
      formData: Record<string, string>;
    };

    if (!docType || !['legal_notice', 'nda'].includes(docType)) {
      throw createError('Invalid document type. Must be "legal_notice" or "nda"', 400);
    }
    if (!formData || typeof formData !== 'object') {
      throw createError('formData is required', 400);
    }

    await streamDraft(docType, formData, res);
  } catch (err) {
    next(err);
  }
}

export async function saveDraftHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { docType, title, content, formData } = req.body as {
      docType: string;
      title: string;
      content: string;
      formData: Record<string, string>;
    };

    if (!docType || !content) {
      throw createError('docType and content are required', 400);
    }

    const result = await query<DraftRow>(
      `INSERT INTO drafts (user_id, doc_type, title, content, form_data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, docType, title || 'Untitled Draft', content, JSON.stringify(formData || {})]
    );

    res.status(201).json({ draft: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function listDraftsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const result = await query<DraftRow>(
      `SELECT id, doc_type, title, created_at, updated_at
       FROM drafts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ drafts: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function getDraftHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await query<DraftRow>(
      'SELECT * FROM drafts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw createError('Draft not found', 404);
    }

    res.json({ draft: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function deleteDraftHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM drafts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw createError('Draft not found', 404);
    }

    res.json({ message: 'Draft deleted' });
  } catch (err) {
    next(err);
  }
}
