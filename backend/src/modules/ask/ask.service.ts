import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Evidence = { title: string; page: number; content: string; score: number };

const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_EVIDENCE = 6;
// text-embedding-3-small의 한국어 수업 노트 검색 점수는 0.25 이상일 때
// 질문과 직접 관련된 조각이 확인됐다. 이보다 낮으면 안전 답변을 단정하지 않는다.
const MIN_SCORE = 0.25;
const SAFETY_PATTERN = /식기|전자레인지|오븐|식기세척기|납|카드뮴|food[ -]?safe|microwave|oven|dishwasher|lead|cadmium/i;

function isEnglish(text: string) {
  return !/[ㄱ-ㅎ가-힣]/.test(text) && /[a-z]/i.test(text);
}

function vectorLiteral(values: number[]) {
  return `[${values.join(',')}]`;
}

@Injectable()
export class AskService {
  constructor(private readonly prisma: PrismaService) {}

  private get key() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new ServiceUnavailableException('질문 기능을 준비 중이에요');
    return key;
  }

  private async openAi(path: string, body: unknown) {
    const response = await fetch(`https://api.openai.com/v1${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new ServiceUnavailableException(`AI 응답을 준비하지 못했어요${detail ? ` (${response.status})` : ''}`);
    }
    return response.json() as Promise<Record<string, unknown>>;
  }

  async embed(input: string[]) {
    const body = await this.openAi('/embeddings', { model: EMBEDDING_MODEL, input });
    const rows = body.data as { index: number; embedding: number[] }[];
    return rows.sort((a, b) => a.index - b.index).map((row) => row.embedding);
  }

  private async evidence(question: string) {
    const [embedding] = await this.embed([question]);
    const vector = vectorLiteral(embedding);
    return this.prisma.$queryRaw<Evidence[]>(Prisma.sql`
      SELECT d.title, c.page, c.content,
        1 - (c.embedding <=> ${vector}::vector) AS score
      FROM "DocumentChunk" c
      INNER JOIN "Document" d ON d.id = c."documentId"
      WHERE d.status = 'READY' AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vector}::vector
      LIMIT ${MAX_EVIDENCE}
    `);
  }

  private fallback(english: boolean, safety: boolean) {
    if (english) {
      return safety
        ? 'I could not find enough supporting material to answer this safety-related question. Please check with the studio before use.'
        : 'I could not find supporting material for this question yet. Please ask the studio to confirm.';
    }
    return safety
      ? '안전과 관련된 질문은 근거 자료를 확인한 뒤에만 안내할 수 있어요. 공방에 확인해 주세요.'
      : '관련 자료를 아직 찾지 못했어요. 공방에 확인해 주세요.';
  }

  private async generate(question: string, evidence: Evidence[], english: boolean) {
    const context = evidence.map((item, i) => `[${i + 1}] ${item.title} p.${item.page}\n${item.content}`).join('\n\n');
    const instructions = [
      'You answer questions for a pottery studio.',
      'Use only the supplied source material. Do not invent facts or cite a source that is not supplied.',
      'Write in the same language as the user question.',
      'For safety-related use (food, microwave, oven, dishwasher, lead, cadmium), only make a claim supported by the source. If support is insufficient, say the studio must confirm it.',
      'Decorative-use glaze must not be recommended for food contact.',
      'Keep the answer concise and attach citations like [1] to factual statements.',
    ].join(' ');
    const body = await this.openAi('/responses', {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
      instructions,
      input: `Question:\n${question}\n\nSource material:\n${context}`,
    });
    const direct = typeof body.output_text === 'string' ? body.output_text : '';
    // Responses API는 output_text 편의 필드를 제공하지 않는 응답도 있어,
    // message/output_text 항목에서 본문을 함께 꺼낸다.
    const nested = Array.isArray(body.output)
      ? body.output
          .flatMap((item) => (item && typeof item === 'object' && Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : []))
          .filter((item): item is { type?: unknown; text?: unknown } => !!item && typeof item === 'object')
          .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
          .map((item) => item.text as string)
          .join('\n')
      : '';
    const text = (direct || nested).trim();
    return text || this.fallback(english, false);
  }

  async answer(rawQuestion: string) {
    const question = rawQuestion.trim();
    const english = isEnglish(question);
    const safety = SAFETY_PATTERN.test(question);
    const found = await this.evidence(question);
    const evidence = found.filter((item) => item.score >= MIN_SCORE);
    const hasEvidence = evidence.length > 0;
    const answer = hasEvidence ? await this.generate(question, evidence, english) : this.fallback(english, safety);
    const sources = evidence.map(({ title, page }) => ({ title, page }));
    await this.prisma.questionLog.create({
      data: { question, answer, language: english ? 'en' : 'ko', isSafety: safety, hasEvidence, sources },
    });
    return { answer, isSafety: safety, hasEvidence, sources };
  }
}
