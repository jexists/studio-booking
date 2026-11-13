import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

const STAGE_VALUES = ['FORMING', 'BISQUE', 'GLAZED', 'GLAZE_FIRED', 'DONE', 'PICKED_UP'] as const;

export class ListWorksQuery {
  @IsOptional() @IsString() @MaxLength(40) q?: string;
  @IsOptional() @IsIn(STAGE_VALUES) stage?: (typeof STAGE_VALUES)[number];
  @IsOptional() @IsIn(['true', 'false']) broken?: string;
  @IsOptional() @IsIn(['true', 'false']) overdue?: string;
  @IsOptional() @IsIn(['true', 'false']) decorative?: string;
}

export class MoveStageDto {
  @IsIn(['next', 'prev'], { message: '방향은 next 또는 prev 예요' })
  direction!: 'next' | 'prev';
}

export class BulkNextDto {
  @IsArray()
  @ArrayMinSize(1, { message: '작품을 하나 이상 골라 주세요' })
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids!: number[];
}

export class UpdateWorkDto {
  @IsOptional() @IsIn(['VISIT', 'DELIVERY', null]) pickupMethod?: 'VISIT' | 'DELIVERY' | null;
  @IsOptional() @IsString() @MaxLength(10) shelf?: string;
  @IsOptional() @IsBoolean() broken?: boolean;
  @IsOptional() @IsString() @MaxLength(300) memo?: string;
}

export const CARRIERS = ['CJ', 'POST', 'HANJIN', 'LOTTE', 'LOGEN'] as const;

export class ShipDto {
  @IsIn(CARRIERS, { message: '택배사를 골라 주세요' }) carrier!: (typeof CARRIERS)[number];
  @IsString() @MaxLength(30) trackingNo!: string;
}
