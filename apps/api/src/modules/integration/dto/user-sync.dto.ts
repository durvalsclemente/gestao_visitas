import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class UserSyncItemDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsIn(['SUPER_ADMIN', 'ORG_ADMIN', 'ORG_USER'])
  role!: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'ORG_USER';
}

export class UserSyncWebhookDto {
  @Equals('USER_SYNCED')
  event!: 'USER_SYNCED';

  @IsString()
  licenseId!: string;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  appSlug?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UserSyncItemDto)
  users!: UserSyncItemDto[];
}
