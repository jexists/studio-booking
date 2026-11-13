import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import pdf from 'pdf-parse';
import { AskService } from '../ask/ask.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadDocumentDto } from './dto';

type UploadFile = { originalname: string; mimetype: string; buffer: Buffer; size: number };
type PageText = { page: number; content: string };

const CHUNK_SIZE = 850;
const CHUNK_OVERLAP = 150;
const BATCH_SIZE = 40;

function splitPages(text: string): PageText[] {
  const parts = text.split(/-----\s*p\.(\d+)\s*-----/i);
  if (parts.length === 1) {
    return text.split('\f').map((content, index) => ({ page: index + 1, content }));
  }
  const pages: PageText[] = [];
  for (let i = 1; i < parts.length; i += 2) pages.push({ page: Number(parts[i]), content: parts[i + 1] ?? '' });
  return pages;
}

function chunk(pages: PageText[]) {
  const chunks: PageText[] = [];
  for (const page of pages) {
    const content = page.content.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    for (let start = 0; start < content.length; start += CHUNK_SIZE - CHUNK_OVERLAP) {
      const part = content.slice(start, start + CHUNK_SIZE).trim();
      if (part) chunks.push({ page: page.page, content: part });
      if (start + CHUNK_SIZE >= content.length) break;
    }
  }
  return chunks;
}

function vectorLiteral(values: number[]) {
  return `[${values.join(',')}]`;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ask: AskService,
  ) {}

  async list() {
    return this.prisma.document.findMany({
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async textFrom(file: UploadFile) {
    const isText = file.mimetype.startsWith('text/') || /\.(txt|md)$/i.test(file.originalname);
    if (isText) return file.buffer.toString('utf8');
    if (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname)) {
      return (await pdf(file.buffer)).text;
    }
    throw new BadRequestException('TXT 또는 PDF 파일만 올릴 수 있어요');
  }

  async upload(file: UploadFile | undefined, dto: UploadDocumentDto, staffId: number) {
    if (!file) throw new BadRequestException('자료 파일을 선택해 주세요');
    if (!process.env.OPENAI_API_KEY) throw new BadRequestException('OPENAI_API_KEY를 설정해 주세요');
    const document = await this.prisma.document.create({
      data: {
        title: dto.title?.trim() || file.originalname.replace(/\.[^.]+$/, ''),
        kind: dto.kind,
        fileName: file.originalname,
        uploadedById: staffId,
      },
    });
    try {
      const pages = splitPages(await this.textFrom(file));
      const chunks = chunk(pages);
      if (chunks.length === 0) throw new BadRequestException('파일에서 검색할 글자를 찾지 못했어요');
      const embeddings: number[][] = [];
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        embeddings.push(...(await this.ask.embed(chunks.slice(i, i + BATCH_SIZE).map((item) => item.content))));
      }
      const values = chunks.map((item, index) => Prisma.sql`(${document.id}, ${item.page}, ${item.content}, ${vectorLiteral(embeddings[index])}::vector)`);
      await this.prisma.$transaction([
        this.prisma.$executeRaw(Prisma.sql`INSERT INTO "DocumentChunk" ("documentId", page, content, embedding) VALUES ${Prisma.join(values)}`),
        this.prisma.document.update({ where: { id: document.id }, data: { pageCount: pages.length, status: 'READY' } }),
      ]);
      return this.prisma.document.findUniqueOrThrow({ where: { id: document.id }, include: { _count: { select: { chunks: true } } } });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : '처리하지 못했어요';
      await this.prisma.document.update({ where: { id: document.id }, data: { status: 'FAILED', error: message } });
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('자료를 임베딩하지 못했어요. 파일과 API 설정을 확인해 주세요.');
    }
  }

  async remove(id: number) {
    const exists = await this.prisma.document.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('자료를 찾을 수 없어요');
    await this.prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}
