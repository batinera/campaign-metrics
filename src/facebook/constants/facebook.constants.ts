export const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'
export const INSIGHTS_FIELDS = 'spend,impressions,reach,actions,campaign_id,campaign_name'
export const INSIGHTS_FIELDS_ADSET =
  'spend,impressions,reach,actions,campaign_id,campaign_name,adset_id,adset_name,account_id,account_name'
export const DAILY_INSIGHTS_FIELDS =
  'spend,impressions,campaign_id,campaign_name,account_id,account_name'
export const DAILY_INSIGHTS_FIELDS_ADSET =
  'spend,impressions,campaign_id,campaign_name,adset_id,adset_name,account_id,account_name'
export const AD_FIELDS =
  'id,name,status,adset_id,adset{id,name},campaign_id,created_time,creative{id,name,body,image_url,thumbnail_url,video_id}'
export const CAMPAIGN_FIELDS = 'id,name,status,account_id,created_time'
export const ADSET_FIELDS = 'id,name,status,campaign_id,account_id,created_time'
