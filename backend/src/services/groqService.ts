import Groq from 'groq-sdk';
import { Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL = 'llama-3.3-70b-versatile';

// ─── Prompt Templates ────────────────────────────────────────────────────────

function buildLegalNoticePrompt(formData: Record<string, string>): string {
  return `You are a senior Indian advocate with 20 years of practice. Draft a formal Legal Notice in proper Indian legal format based on the details below. 

STRICT FORMAT REQUIREMENTS:
1. Start with "LEGAL NOTICE" as the heading
2. Include date (use ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })})
3. Address block: "To, [Recipient Name], [Recipient Address]"
4. Opening: "Under instructions from and on behalf of my client, [Sender Name], [Sender Address], I hereby serve upon you this Legal Notice as under:"
5. Number all paragraphs (1., 2., 3., etc.)
6. Include a clear "TAKE NOTICE" clause with the demand and deadline
7. End with "Yours faithfully," followed by the advocate's signature block: "Sd/- Rohan Sharma, Advocate, Bar Council No: D/4321/2012"

CASE DETAILS:
- Sender (my client): ${formData.senderName || 'Not specified'}, ${formData.senderAddress || 'Not specified'}
- Recipient: ${formData.recipientName || 'Not specified'}, ${formData.recipientAddress || 'Not specified'}
- Subject Matter: ${formData.subjectMatter || 'Not specified'}
- Facts of Dispute: ${formData.facts || 'Not specified'}
- Relief/Demand Sought: ${formData.relief || 'Not specified'}
- Statutory Basis (if any): ${formData.statutoryBasis || 'Not specified'}
- Compliance Deadline: ${formData.deadline || '15 days'} from receipt of this notice

Draft a complete, professional, legally sound notice. Use formal Indian legal language. Include at least 4–6 numbered paragraphs covering: background, facts, legal position, demand, and consequences of non-compliance.`;
}

function buildNDAPrompt(formData: Record<string, string>): string {
  const ndaType = formData.ndaType === 'mutual' ? 'Mutual' : 'One-Way';
  return `You are a senior Indian corporate lawyer. Draft a complete ${ndaType} Non-Disclosure Agreement (NDA) governed by Indian law.

AGREEMENT DETAILS:
- NDA Type: ${ndaType}
- Disclosing Party: ${formData.disclosingParty || 'Party A'} (${formData.disclosingPartyAddress || 'Address to be filled'})
- Receiving Party: ${formData.receivingParty || 'Party B'} (${formData.receivingPartyAddress || 'Address to be filled'})
- Purpose/Scope of Disclosure: ${formData.purpose || 'Business discussions and potential collaboration'}
- Confidentiality Scope: ${formData.scope || 'All non-public information shared between parties'}
- Term/Duration: ${formData.term || '2 years from the date of signing'}
- Governing Law: Indian law; Jurisdiction: ${formData.jurisdiction || 'Courts of New Delhi'}

STRICT FORMAT REQUIREMENTS:
1. Title: "${ndaType.toUpperCase()} NON-DISCLOSURE AGREEMENT"
2. Recitals / Background section
3. Numbered clauses covering: Definitions, Obligations of Confidentiality, Exclusions, ${ndaType === 'Mutual' ? 'Mutual Obligations,' : ''} Term, Remedies & Injunctive Relief, Governing Law & Dispute Resolution, Miscellaneous (Entire Agreement, Severability, Waiver, Notices)
4. Signature block for both parties with date fields
5. All monetary references in INR where applicable

Draft a complete, enforceable NDA that a practicing Indian advocate would be proud to sign.`;
}

// ─── Streaming Draft Generator ────────────────────────────────────────────────

export async function streamDraft(
  docType: 'legal_notice' | 'nda',
  formData: Record<string, string>,
  res: Response
): Promise<void> {
  const systemPrompt =
    docType === 'legal_notice'
      ? buildLegalNoticePrompt(formData)
      : buildNDAPrompt(formData);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional Indian legal document drafter. Produce clean, properly formatted legal documents. Do not include any meta-commentary, preambles, or explanations — output only the document itself.\n\nCRITICAL: If the user inputs contain profanity, abusive language, hate speech, or blatant nonsense (e.g., "fuck you", "ass", etc.), you MUST refuse to draft the document. In such cases, output ONLY this exact message and nothing else: "ERROR: Request blocked. The provided inputs contain inappropriate, profane, or abusive language. As an AI Legal Counsel, I cannot generate documents containing such content."',
        },
        {
          role: 'user',
          content: systemPrompt,
        },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 3000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error('[Groq] Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Generation failed. Please try again.' })}\n\n`);
    res.end();
  }
}

// ─── Non-streaming for internal use ──────────────────────────────────────────

export async function generateDraft(
  docType: 'legal_notice' | 'nda',
  formData: Record<string, string>
): Promise<string> {
  const systemPrompt =
    docType === 'legal_notice'
      ? buildLegalNoticePrompt(formData)
      : buildNDAPrompt(formData);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a professional Indian legal document drafter. Produce clean, properly formatted legal documents. Do not include any meta-commentary, preambles, or explanations — output only the document itself.\n\nCRITICAL: If the user inputs contain profanity, abusive language, hate speech, or blatant nonsense (e.g., "fuck you", "ass", etc.), you MUST refuse to draft the document. In such cases, output ONLY this exact message and nothing else: "ERROR: Request blocked. The provided inputs contain inappropriate, profane, or abusive language. As an AI Legal Counsel, I cannot generate documents containing such content."',
      },
      { role: 'user', content: systemPrompt },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  return completion.choices[0]?.message?.content || '';
}
