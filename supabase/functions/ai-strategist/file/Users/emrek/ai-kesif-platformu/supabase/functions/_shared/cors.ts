// Bu, tüm Edge Function'larımızın farklı domainlerden çağrılmasına izin veren
// standart CORS (Cross-Origin Resource Sharing) başlıklarıdır.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
