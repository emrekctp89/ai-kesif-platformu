import logger from '@/utils/logger';
('use client');

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateApiKey, getApiKeys, revokeApiKey } from '@/app/actions/api-keys';
import { toast } from 'sonner';
import { Copy, Trash2, Key, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function DeveloperPortalClient() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [newRawKey, setNewRawKey] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await getApiKeys();
      if (error) {
        toast.error(error);
      } else if (data) {
        setKeys(data);
      }
    } catch (err) {
      logger.error('fetchKeys failed:', err);
      toast.error('Beklenmeyen bir hata oluştu: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error('Lütfen anahtar için bir isim girin.');
      return;
    }
    setGenerating(true);
    try {
      const { data, rawKey, error } = await generateApiKey(newKeyName.trim());
      if (error) {
        toast.error(error);
      } else if (data && rawKey) {
        setNewRawKey(rawKey);
        setNewKeyName('');
        setKeys([data, ...keys]);
      }
    } catch (err) {
      logger.error('handleGenerate failed:', err);
      toast.error('Sunucu hatası: ' + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Bu API anahtarını iptal etmek istediğinize emin misiniz?')) return;

    try {
      const { success, error } = await revokeApiKey(id);
      if (error) {
        toast.error(error);
      } else if (success) {
        toast.success('API anahtarı iptal edildi.');
        setKeys(keys.filter((k) => k.id !== id));
      }
    } catch (err) {
      logger.error('handleRevoke failed:', err);
      toast.error('Sunucu hatası: ' + (err.message || ''));
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Panoya kopyalandı!');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* API Documentation Section */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>API Dokümantasyonu</CardTitle>
          <CardDescription>
            AI Keşif Platformu verilerine programatik olarak erişin. Tüm isteklerde{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              Authorization: Bearer aik_...
            </code>{' '}
            başlığı zorunludur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-md">
            <p className="font-semibold text-sm mb-2">Örnek İstek (Araçları Listeleme)</p>
            <pre className="text-sm bg-card p-3 rounded border overflow-x-auto">
              <code>
                {`curl -X GET "https://api.aikesif.com/v1/tools?page=1&limit=10" \\
  -H "Authorization: Bearer SİZİN_API_ANAHTARINIZ"`}
              </code>
            </pre>
          </div>
          <div className="flex gap-2 items-start bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 p-3 rounded-md text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Kullanım Limitleri (Rate Limits)</p>
              <p>
                Adil kullanım politikası gereği, API istekleri <b>dakikada 30 istek</b> ile
                sınırlandırılmıştır. Limiti aştığınızda <code>429 Too Many Requests</code> hatası
                alırsınız.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yeni API Anahtarı Oluştur</CardTitle>
          <CardDescription>Uygulamanız için API isteklerini yetkilendirin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <label htmlFor="keyName" className="text-sm font-medium">
                Anahtar İsmi
              </label>
              <Input
                id="keyName"
                placeholder="Örn: Prod Uygulamam"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                maxLength={50}
              />
            </div>
            <Button type="submit" disabled={generating}>
              {generating ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mevcut API Anahtarları</CardTitle>
          <CardDescription>
            Oluşturduğunuz tüm API anahtarlarını buradan yönetebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground">Henüz API anahtarı oluşturmadınız.</p>
          ) : (
            <div className="space-y-4">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Key className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold">{k.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Oluşturulma: {new Date(k.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      {k.last_used_at
                        ? `Son Kullanım: ${new Date(k.last_used_at).toLocaleDateString('tr-TR')}`
                        : 'Hiç kullanılmadı'}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(k.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!newRawKey} onOpenChange={(open) => !open && setNewRawKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> API Anahtarı Oluşturuldu
            </DialogTitle>
            <DialogDescription>
              Lütfen bu API anahtarını güvenli bir yere kopyalayın. Güvenlik nedeniyle bu anahtarı{' '}
              <b>bir daha göremeyeceksiniz</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
              <code className="text-sm break-all flex-1">{newRawKey}</code>
              <Button variant="outline" size="icon" onClick={() => handleCopy(newRawKey)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 p-3 rounded-md flex gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>
                Eğer bu anahtarı kaybederseniz, yenisini oluşturmanız gerekecektir. Sistem bu
                anahtarı veritabanında şifreli olarak saklar.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setNewRawKey(null)}>Anladım, kapattım</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
