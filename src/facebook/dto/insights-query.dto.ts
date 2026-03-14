import { IsOptional, IsString, IsIn, Matches } from "class-validator";

const DATE_PRESETS = [
  "today",
  "yesterday",
  "last_7d",
  "last_14d",
  "last_30d",
  "this_month",
  "last_month",
  "maximum",
] as const;

export class InsightsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^act_\d+$/, {
    message: "accountId must be in the format act_XXXXXXXXX",
  })
  accountId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsIn(DATE_PRESETS)
  datePreset?: (typeof DATE_PRESETS)[number];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateEnd?: string;
}
