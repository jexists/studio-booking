import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffGuard, type StaffRequest } from '../auth/auth.guard';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto';

type UploadFile = { originalname: string; mimetype: string; buffer: Buffer; size: number };

@Controller('staff/documents')
@UseGuards(StaffGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list() {
    return this.documents.list();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Req() req: StaffRequest, @UploadedFile() file: UploadFile | undefined, @Body() dto: UploadDocumentDto) {
    return this.documents.upload(file, dto, req.staff.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.documents.remove(id);
  }
}
