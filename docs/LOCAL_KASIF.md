# Kâşif yerel AI deneyi

Bu deney mevcut Gemini akışını değiştirmez. Yalnızca `LOCAL_KASIF_ENABLED=true` iken
`/kasif-deney` ekranı ve `/api/kasif/ask` uç noktası çalışır.

## Yerel kurulum

1. Ollama'yı model sunucusunun çalışacağı makineye kurun.
2. `ollama pull qwen2.5:7b` komutuyla başlangıç modelini indirin.
3. Ollama'nın çalıştığını `ollama list` ile kontrol edin.
4. `.env.local` dosyanıza aşağıdaki değerleri ekleyin:

```env
LOCAL_KASIF_ENABLED=true
LOCAL_KASIF_URL=http://127.0.0.1:11434
LOCAL_KASIF_MODEL=qwen2.5:7b
LOCAL_KASIF_TIMEOUT_MS=45000
```

5. Uygulamayı `npm run dev` ile başlatıp `/kasif-deney` adresini açın.

## Güvenlik sınırları

- Model yalnızca sunucu tarafından getirilen onaylı araç kayıtlarını görür.
- Modelin döndürdüğü kaynak kimlikleri veritabanından gelen izinli listeyle doğrulanır.
- Bağlantılar model tarafından değil, doğrulanmış kayıtların slug değerlerinden oluşturulur.
- Geçerli kaynak bulunmayan cevap kullanıcıya gösterilmez.
- Deney rotası varsayılan olarak kapalıdır ve arama motorlarına kapatılmıştır.

## Bilinen ilk sürüm sınırı

İlk prototip veri erişiminde anahtar kelime araması kullanır. Yerel embedding modeli ve
blog/rehber indekslemesi, temel kalite ölçüldükten sonra ikinci aşamada eklenmelidir.
