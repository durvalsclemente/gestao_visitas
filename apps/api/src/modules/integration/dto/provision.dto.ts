import { Equals, IsOptional, IsString, IsUUID } from 'class-validator';

export class ProvisionWebhookDto {
  @Equals('LICENSE_PROVISIONED')
  event!: 'LICENSE_PROVISIONED';

  @IsString()
  licenseId!: string;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  orgName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;

  @IsOptional()
  @IsString()
  appSlug?: string;
}
