import { IsUrl, IsNotEmpty } from 'class-validator';

export class BulkImportDto {
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  url: string;
}
