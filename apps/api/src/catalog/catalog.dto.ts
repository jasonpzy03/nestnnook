import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const ROOM_TYPES = [
  'Single Room',
  'Common Room',
  'Balcony Room',
  'Window Room',
  'Master Room',
  'Common Area',
  'Others',
];
export class PhotoDto {
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https:\/\/[^\s]+|\/(assets|uploads)\/[^\s]+)$/)
  url!: string;
  @IsString() @MaxLength(200) alt!: string;
}
export class RoomDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,80}$/) id!: string;
  @IsString() @MinLength(1) @MaxLength(60) code!: string;
  @IsIn(ROOM_TYPES) type!: string;
  @IsInt() @Min(0) @Max(100000) monthlyRent!: number;
  @IsString() @MaxLength(80) locationId!: string;
  @IsString() @MaxLength(2000) description!: string;
  @IsArray()
  @ArrayMaxSize(15)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  features!: string[];
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  photos!: PhotoDto[];
  @IsBoolean() visible!: boolean;
  @IsBoolean() featured!: boolean;
  @IsInt() @Min(0) @Max(9999) order!: number;
}
export class LocationDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,80}$/) id!: string;
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MaxLength(150) journey!: string;
  @IsString() @MaxLength(2000) description!: string;
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https:\/\/[^\s]+|\/(assets|uploads)\/[^\s]+)?$/)
  image!: string;
  @IsBoolean() visible!: boolean;
  @IsInt() @Min(0) @Max(9999) order!: number;
}
export class CatalogDto {
  @IsInt() @Min(0) revision!: number;
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => RoomDto)
  rooms!: RoomDto[];
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations!: LocationDto[];
}
export class RevisionDto {
  @IsInt() @Min(0) revision!: number;
}
export interface Catalog extends CatalogDto {
  updatedAt: string;
  snapshot?: { revision: number; createdAt: string; rooms: RoomDto[]; locations: LocationDto[] };
}
