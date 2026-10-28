# Higgsfield rebuild — ürün ve teslim planı

Emre Barkın Duğenci · 8x Product Engineer assignment · 28 Ekim 2026

**Durum:** İlk ürün incelemesi ve uygulama planı hazır. Bu paket çalışan uygulama veya tamamlanmış teslim değildir. 16 gerçek tarayıcı ekran görüntüsü içerir. Hesap açma, gerçek üretim sonucunu alma, indirme ve kayıt testleri henüz tamamlanmadı.

**Teslim:** 29 Ekim 2026, 11:42 UTC / İtalya 12:42. Brief süreyi takip ettiğini, katı uygulamadığını söylüyor; planımız yine bu tarihe yetişmek.

## 1. Ürün kararı

**Hedef:** Bir içerik üreticisinin tek bir görseli, anlaşılır ayarlarla kısa bir videoya dönüştürmesi; sonucu bulması, indirmesi ve tekrar düzenleyebilmesi.

Geçici ürün adı: **Frameflow — Image to motion.** İsmi UI bitmeden değiştirmeye zaman harcamayacağız. Bağımsız bir assignment rebuild olarak tanıtılacak; Higgsfield'ın resmi ürünü izlenimi verilmeyecek.

**Birincil kullanıcı varsayımı:** Teknik model bilgisi olmayan, sosyal medya veya ürün tanıtımı için kısa klip isteyen solo creator. Bu bir kullanıcı araştırması bulgusu değil, dar kapsam seçmemizi sağlayan tasarım varsayımıdır.

**Demo işi:** Bir kahve fincanı görselini yükle → “Slow push-in” seç → 5 saniyelik dikey video oluştur → sonucu indir → aynı girdilerle ikinci varyasyon hazırla. Süre ve oran seçenekleri ancak gerçek sağlayıcı bunları destekliyorsa açılır.

**İddiamız:** Daha çok özellik değil, daha az kararsızlık ve kaybolmayan iş. Birlikte çalışması gereken parçalara yatırım: input, ayarlar, maliyet, kuyruk, sonuç, geçmiş, yeniden kullanım.

## 2. İncelemeden çıkan kararlar

| Gözlem / kanıt | Yorum | Uygulama kararı |
| --- | --- | --- |
| Ana navigasyonda çok sayıda stüdyo ve model; 01 | İlk seçim yükü yüksek olabilir; kullanıcı testiyle henüz doğrulanmadı | Ana navigasyon yalnızca Create, Presets, My creations |
| Video editöründe modele göre girdiler değişiyor; 02–04 | Her modele aynı formu sunmak hatalı olur | İlk sürüm tek doğrulanmış video modeli; sadece desteklenen ayarlar |
| Görsel üretme tıklamasından sonra “In queue”, ardından kayıt duvarı; 07–08 | Giriş gereksinimi eylemden önce netleştirilebilir | Generate öncesinde giriş ve maliyet açık; taslak korunur |
| Video CTA'sında kredi maliyeti var; 04 | Maliyet görünürlüğü korunması gereken güçlü özellik | CTA yanında toplam maliyet ve bakiye; fiyatı sunucu hesaplar |
| Effects görsel preset galerisi ve opsiyonel input ayrımı sunuyor; 10–11 | Görsel seçim prompt yazmayı kolaylaştırabilir | 6 anlaşılır hareket preset'i; her biri prompt ve ayara dönüşür |
| Cinema Studio'da kamera hareketi seçmek prompt'a “Dolly in” ekliyor; 13–14 | Preset'in gerçek davranışa dönüşmesi değerli | Hareket seçimi düzenlenebilir prompt'a görünür biçimde yansır |
| Image, Video, Cinema Studio farklı yerleşimler kullanıyor; 06, 04, 12 | Akışlar arası öğrenme yükü oluşabilir | Aynı Create ekranında tutarlı input/preview/result yerleşimi |
| Logged-out History, öğretici içerik gösteriyor; 05 | Gerçek geçmiş durumunu doğrulamadık | Kendi boş geçmiş ekranımız açık CTA ve örnek proje sunar |

Bunlar gözlem ve tasarım hipotezidir; gerçek dönüşüm artışı veya kullanıcı tercihi ölçülmüş gibi sunulmayacak.

## 3. Kapsam sözleşmesi

| Seviye | Yapılacak | Bitti sayılma koşulu |
| --- | --- | --- |
| P0 | Gerçek görselden video üretimi | Kendi input'umuzdan sağlayıcı job'ı, oynatılabilir sonuç ve indirme |
| P0 | Görsel yükleme ve preview | Dosya türü/boyutu kontrolü; değiştirme; anlaşılır hata |
| P0 | Prompt + 6 hareket preset'i | Seçim gerçek isteği değiştirir; kullanıcı prompt'u düzenler |
| P0 | Desteklenen süre/oran/kalite | Arayüz ve sunucu aynı capability listesini uygular |
| P0 | Maliyet ve üretim durumları | Giriş/limit kontrolü; submitting, queued, running, completed, failed |
| P0 | Kalıcı geçmiş ve yeniden kullanım | Refresh sonrası job bulunur; eski ayarlar yeni taslağa yüklenir |
| P0 | Public inceleme yolu | Ziyaretçi hesabı olmadan örnek projeyi inceleyebilir |
| P0 | Kayıt, repo, deploy, demo | İki oturum capture testi; public repo; çalışan URL; kamera açık video |
| P1 | Metinden görsel oluşturma | İkinci gerçek sağlayıcı akışı; görseli videoya taşıma |
| P1 | Önce/sonra veya varyasyon karşılaştırma | İki gerçek sonucu ve üretim ayarlarını yan yana görme |
| P1 | Filtre, favori, isim değiştirme | Ana akışı bozmadan çalışan basit organizasyon |
| Kapsam dışı | Full timeline, canvas, katman editörü, audio, avatar, face swap | README'de gerekçe: 24 saatte ana akışa yatırım |
| Kapsam dışı | Tüm modeller, topluluk sosyal ağı, ödeme abonelik sistemi | Kullanılmayan buton ve sahte ekran eklenmez |

**Kesme sırası:** P1 özellikler → ekstra animasyonlar → favoriler. Gerçek üretim, kalıcı sonuç, hata yönetimi ve teslim kanıtları kesilmez. Sağlayıcı kurulamazsa bunu açık engel olarak raporlarız; statik örneği canlı üretim diye göstermeyiz.

## 4. Kullanıcı akışları

### A. İlk ziyaret / değerlendirici

Landing → “Try the studio” veya “View sample project” → Create. Örnek proje kayıt gerektirmeden açılır; “Sample project — previously generated” etiketi taşır. Örneği açmak ücretli API çağrısı başlatmaz.

Canlı üretim için giriş gerekiyorsa bunu CTA yanında önceden söyle. Kullanıcı önce taslağını hazırlayabilir; sign-in dönüşünde aynı taslağa döner. Sample mode ile live mode görsel ve davranışsal olarak ayrılır.

### B. Görselden video

Upload/sample → input önizlemesi → hareket preset'i → düzenlenebilir prompt → desteklenen ayarlar → maliyet onayı → Generate → job kaydı → kuyruk → üretim → sonuç ekranı → indir veya varyasyon oluştur.

Generate sırasında aynı butona çift tıklama tek job oluşturur. Sayfa kapanırsa job devam eder; yeniden açıldığında sunucudan durum okunur. İşlem zaman aşımına uğradığında “failed” diye uydurmak yerine “Status temporarily unavailable” gösterilir ve aynı job tekrar sorgulanır.

### C. Preset keşfi

Presets → “Subtle / Cinematic / Energetic” filtreleri → önizleme ve kısa açıklama → “Use this movement” → Create ekranında mevcut görseli koru, hareketi uygula. Kullanıcının kendi prompt'unu sessizce silme; preset ekle/değiştir davranışı görünür olsun.

### D. Sonuç ve iterasyon

Result → video player + kullanılan görsel + prompt + ayarlar → Download / Make a variation / Back to creations. “Make a variation” yeni taslak açar; eski sonucu üzerine yazmaz. Yeni üretim için yeni ücret/limit kontrolü gerekir.

### E. Geçmiş

My creations → durum ve tarih sırasıyla kartlar → job detayına git. Pending job görünür kalır. Başarısız job'ın girdileri ve hata açıklaması korunur. Bir kullanıcı diğer kullanıcının işlerini göremez.

### F. Hata ve geri dönüşler

| Durum | Kullanıcıya gösterilecek | Sistem davranışı |
| --- | --- | --- |
| Desteklenmeyen dosya | “Upload a PNG or JPG.” | Upload başlamaz |
| Fazla büyük dosya | Gerçek limit ve dosya boyutu | Alternatif dosya seçilir; taslak korunur |
| Eksik prompt/görsel | Alanın yanında açıklama | Generate devre dışı; neden görünür |
| Yetersiz kullanım hakkı | Üretimden önce limit bilgisi | Job ve harcama oluşturulmaz |
| Sağlayıcı reddi | Düzenlenebilir, anlaşılır mesaj | Draft korunur; otomatik ücretli tekrar yok |
| Ağ bağlantısı kesildi | “Reconnecting to your generation…” | Aynı job sorgulanır, yeni üretim açılmaz |
| Sağlayıcı hatası | “Generation failed. Your inputs are saved.” | Durum kaydedilir, rezervasyon çözümlenir |
| Download başarısız | Yeniden indir seçeneği | Video yeniden üretilmez |

## 5. Ekran ve tasarım spesifikasyonu

**Görsel yön:** Koyu nötr stüdyo, açık tipografi, tek mint vurgu rengi. Görsel/video ana içerik. Higgsfield'ın bütün menülerini, kampanyalarını veya özel varlıklarını kopyalamayacağız. Özgün veya kullanım hakkı olan örnekler üretilecek.

| Ekran | İçerik | Birincil eylem | Zorunlu durumlar |
| --- | --- | --- | --- |
| Landing | Tek değer önerisi, gerçek örnek, kısa kullanım anlatımı | Try the studio | Logged-out, sample |
| Create | Sol input/settings, sağ preview/result; geçmişe erişim | Generate + maliyet | Empty, ready, upload error, submitting |
| Presets | 6 hareket kartı, kısa açıklama, preview | Use movement | Search/filter empty, selected |
| Generation detail | Video, prompt, model/ayarlar, durum | Download | Queued, running, completed, failed, reconnecting |
| My creations | Tarihli kartlar ve durum etiketleri | Open creation | Empty, loading, error, populated |

Desktop: 280–340 px input paneli + esnek preview. Mobil: önce preview, sonra form; altta sabit CTA içerik kapatmaz. 390 px ve 1440 px genişlikte kontrol. Klavye odağı görünür, diyalog Escape ile kapanır, hata yalnızca renkle anlatılmaz. Hareket önizlemeleri hover/focus ile oynar; reduced-motion ayarına saygı duyulur.

Proposed metrics: İlk taslağı hazırlama süresi, Generate → başarılı sonuç oranı, sonuç → indirme oranı, hata sonrası başarılı yeniden deneme. Bunlar henüz ölçülmedi. Submission'da kanıtlayacağımız hedef: yeni ziyaretçi yardım almadan input/CTA'yı bulabilir; geçerli istek hemen job durumuna geçer; bir üretim refresh sonrasında kaybolmaz.

## 6. Mühendislik tasarımı

Önerilen başlangıç: **Next.js + TypeScript, Supabase auth/database/storage, Vercel, tek async video sağlayıcısı.** Seçim gerekçesi az altyapı ve bilinen araçlar. Hesap/anahtar/bütçe erişimi doğrulanmadan bunları kurulmuş varsaymıyoruz. Fal queue API adaydır; hangi modelin erişilebilir ve ekonomik olduğu ilk spike'ta gerçek istekle seçilecek.

**Akış:** Client → own server API → validate/auth/rate limit → persist job → async provider → status reconciliation → copy output to owned storage → completed result. Browser'a sağlayıcı anahtarı gönderilmez. Uzun üretim boyunca tek HTTP isteği açık tutulmaz.

### Veriler

| Varlık | Temel alanlar | Kural |
| --- | --- | --- |
| Project | id, owner_id, title, created_at | Tek kullanıcı sahipliği |
| Asset | id, owner_id, storage_path, mime, size, origin | Upload ve output kaynağı bilinir |
| Generation | id, owner_id, project_id, input_asset_id, prompt, preset_id, settings, status, provider_request_id, output_asset_id, error_code, timestamps, idempotency_key | Settings immutable snapshot; owner+idempotency unique |
| UsageReservation | generation_id, units, state | Ayrı reserve/settle/release; duplicate callback ikinci işlem yapmaz |
| Preset | id, name, prompt_fragment, preview_asset, supported_settings | Sürüm kontrollü küçük katalog |

### API sınırları

POST /api/uploads: doğrulanmış upload yolu. POST /api/generations: yetki+input+limit doğrular, 202 ve job id döner. GET /api/generations/:id: sahiplik kontrolüyle kalıcı durum; gerektiğinde provider ile reconcile. GET /api/generations: sahibin geçmişi. GET /api/generations/:id/download: yalnızca tamamlanmış ve yetkili output. Provider webhook kullanılırsa imza/doğrulama ve idempotency gerekir; webhook ilk sürümün zorunlu bağımlılığı değildir.

### Job güvenilirliği

Durumlar: draft → submitting → queued → running → completed veya failed. Provider submit cevabı kaybolursa körlemesine tekrar submit etme; belirsiz durumu kaydet ve provider request id/idempotency desteğiyle reconcile et. Provider tarafında bunu desteklemeyen durum için manuel inceleme açıklaması gerekir. Kredi rezervasyonu terminal durumla tek transaction içinde kapatılır. Provider başarısız olsa bile platform maliyetinin ne olacağı sağlayıcıya bağlıdır; “her hata ücretsiz” iddiası yapılmaz.

Server-side model allowlist, dosya türü/boyutu doğrulama, user ownership/RLS, kısa ömürlü dosya erişimi, global harcama limiti ve kullanıcı oran limiti gerekir. Public demo sınırsız ücretli üretim endpoint'i olamaz. Public örnekler ayrı ve salt okunur olsun. Secrets prompt'lara veya log'lara yazılmaz; .env dosyaları repoya girmez. .agent-logs/ repoya girer.

## 7. İş sırası ve zaman bütçesi

Bu süreler çalışma tahminidir; kalan süreye göre ölçeklenir. Yaklaşık 12–14 saat odaklı çalışma + tampon hedeflenir. Her aşama sonunda çalışan kanıt ve küçük commit olmalı.

| Aşama | Bütçe | Çıktı / çıkış koşulu |
| --- | --- | --- |
| 0. Capture | 30–45 dk | İki ayrı oturumda canary; gerçek prompt+final response; CAPTURE-TEST.md |
| 1. Araştırmayı kapat | 45–60 dk | Giriş sonrası upload → gerçek generation → download; eksik akış matrisi |
| 2. Teknik spike | 45–60 dk | Tek gerçek video üretimi; maliyet/süre/limit bilgisi; model kararı |
| 3. İlk dikey akış | 2–3 saat | Upload → job → result; ilk çalışan deploy |
| 4. Kalıcılık | 1–1.5 saat | Auth, storage, history, refresh, ownership |
| 5. Ürün kalitesi | 2 saat | Presets, draft restore, maliyet, failure/retry, responsive UI |
| 6. Doğrulama | 1.5 saat | Kritik testler, gerçek production smoke, public erişim |
| 7. Teslim | 45–60 dk | README, tradeoffs, repo/log kontrolü, 4–4.5 dakikalık video |
| Tampon | 2 saat | Sağlayıcı, deploy, beklenmeyen hatalar |

**Kesin duraklar:** Capture doğrulanmadan ürün kodu yok. Teknik spike çalışmadan geniş UI yatırımı yok. Deadline'a 3 saat kala yeni özellik yok. Son 60–90 dakika yalnızca teslim ve hata düzeltme.

Önerilen commit sırası: capture setup/test → research and decisions → provider spike → create-to-result → persistence/history → failure/retry → UX/accessibility → verification → submission docs. Bunlar geçmiş commit'ler değil, planlanan sıradır.

## 8. Değerlendiriciye gösterilecek kanıt

| Brief ölçütü | Göstereceğimiz şey |
| --- | --- |
| Speed | Erken çalışan deploy; birbirini takip eden küçük teslimler |
| Product judgement | Ekran görüntüsüne bağlı kararlar; bilinçli kapsam dışı listesi |
| UX/UI | Uçtan uca gerçek iş; input kaybetmeyen hata; anlaşılır maliyet; mobil kontrol |
| AI ile çalışma | Otomatik, ham, iki oturumda doğrulanmış kayıt; yanlış dönüşler de korunur |
| Engineering ownership | Gerçek provider sonucu; refresh ve duplicate-submit testleri; sırların korunması |

HR veya teknik ekip kabulü garanti edilemez. Kontrol edebildiğimiz kalite: somut ürün, dürüst kapsam ve tekrar edilebilir kanıt.

## 9. Şu anki engeller ve sonraki adım

1. **Higgsfield girişi:** Login sekmesi açık bırakıldı. Emre kendi hesabıyla giriş yapmalı; gerekiyorsa hesap ve koşul kabulünü kendisi tamamlamalı. Sonuç, download, kayıtlı history ve hesap akışları bu yüzden bekliyor. Public ekran görüntüleri toplandı; “her akış tamamlandı” denmiyor.
2. **Agent capture:** Bu Work ortamında erişilebilir Codex CLI/session transcript bulunamadı; araç kataloğunda capture/export aracı yok. Resmi belgelerde hooks bulunması, bu aktif sohbetin hook kurabildiğini kanıtlamaz. İki oturum testi henüz yapılmadı. Yerel geliştirme ortamını seçip resmi 8x setup prompt'unu yeni assignment oturumunun ilk mesajı yapacağız. Bu araştırma paketi ayrı bir hazırlık girdisidir; otomatik log yerine geçmez.
3. **Gerçek üretim sağlayıcısı:** Hesap, API erişimi ve harcama sınırı henüz doğrulanmadı. Bütçe bilgisi alınmadan ücretli entegrasyon başlatılmayacak.

## Dosyalar

- docs/RECON.md: ekran kanıtları, kapsam matrisi ve eksik testler.
- docs/BUILD-BRIEF.md: capture sonrası geliştirici agente verilecek İngilizce uygulama brifi.
- docs/QA-AND-DEMO.md: kabul testleri ve beş dakikanın altındaki demo akışı.
- recon/: 16 gerçek JPG ekran görüntüsü. Araştırma kanıtıdır; ürünün yeniden kullanılabilir medya varlıkları değildir.

## Kaynaklar

- Assignment: kullanıcının paylaştığı brief; 29 Ekim 2026 11:42 UTC teslim.
- 8x capture setup: https://8x-internal.com/p/8x-agent-capture-setup
- 8x rol: https://www.8x.careers/join/software-engineer
- Higgsfield: https://higgsfield.ai/ — doğrudan tarayıcı incelemesi, 28 Ekim 2026.
- Fal async queue: https://fal.ai/docs/documentation/model-apis/inference/queue
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Next.js secrets/environment: https://nextjs.org/docs/app/guides/environment-variables
- Capture araştırması için resmi hooks dokümanı: https://learn.chatgpt.com/docs/hooks
