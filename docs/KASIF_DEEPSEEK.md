# Kâşif + DeepSeek

Kâşif, DeepSeek’i araç seçen otorite olarak değil, katalog-grounded konuşma ve muhakeme
katmanı olarak kullanır. Deterministik Kâşif çekirdeği kaynakları seçer; DeepSeek yalnız seçilmiş
kaynaklarla doğal sohbet yanıtı oluşturur.

## Yapılandırma

```env
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-v4-flash
KASIF_CONVERSATIONAL_LLM_ENABLED=true
```

API base URL otomatik olarak `https://api.deepseek.com`; endpoint `/chat/completions` olur.
`deepseek-chat` ve `deepseek-reasoner` eski model adları kullanılmaz.

## Maliyet güvenliği

- API anahtarı tek başına chatbot çağrısını açmaz.
- Açık opt-in değişkeni varsayılan `false` değerindedir.
- Yerel niyet eşleşmesi, katalog retrieval ve güvenlik kuralları model çağrısından önce çalışır.
- Provider hatası, boş yanıt veya timeout durumunda deterministik yerel cevap korunur.
- Scraping ve katalog onayı DeepSeek’e devredilmez.

## Grounding sözleşmesi

- Model yalnız Kâşif’in seçtiği `sourceIds` kayıtlarını görür.
- Araç ekleme/çıkarma veya kaynak kimliği değiştirme yetkisi yoktur.
- Son cevap yeniden mevcut grounding katmanından geçer.
- API yanıtında `conversational` ve secretsiz `conversationalSource` alanları bulunur.
