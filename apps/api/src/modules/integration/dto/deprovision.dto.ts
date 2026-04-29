import { Equals, IsOptional, IsString, IsUUID } from 'class-validator';

export class DeprovisionWebhookDto {
  @Equals('LICENSE_DEPROVISIONED')
  event!: 'LICENSE_DEPROVISIONED';

  @IsString()
  licenseId!: string;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  appSlug?: string;
}
