import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadDocumentDto {
  @IsIn(['SUPPLIER', 'NOTE'])
  kind!: 'SUPPLIER' | 'NOTE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;
}
