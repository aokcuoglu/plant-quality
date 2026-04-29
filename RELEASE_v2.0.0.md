PlantQuality v2.0.0 — Plan Gating, Packaging & Usage Limits 🚀

PlantQuality artık ücretlendirilebilir bir ürün! v2.0.0 ile platform, Free / Pro / Enterprise olmak üzere üç plana ayrılıyor ve her özellik plan bazlı erişim kontrolüyle kilitleniyor. Kalite yönetimi artık sadece bir araç değil, sürdürülebilir bir iş modeli.

Bu sürüm, platformu ürünleştiren temel altyapıyı kuruyor: merkezi feature gate sistemi, kullanım limitleri takibi, plan rozetleri ve yükseltme CTA'ları.

🌟 Öne Çıkan Özellikler
Central Feature Gate System: 24 özellik anahtarıyla plan bazlı erişim kontrolü. `checkFeatureAccess()` fonksiyonu üzerinden tek noktadan yönetilen, dağınık `plan !== "PRO"` kontrollerinden arındırılmış temiz bir mimari.
Usage Limit Tracking: Aylık ve kümülatif kullanım sayaçları. Free planda 25 hata/ay, Pro'da sınırsız, Enterprise'da özel limitler. Sayaçlar otomatik aylık döngüyle sıfırlanıyor.
Plan Badge & Sidebar Gating: Sidebar'da plan rozeti (Free / Pro / Enterprise), kilitli özelliklerde dimmed nav item'lar + yükseltme kartları. Tedarikçi özellikleri OEM'den gizleniyor.
Admin Plan & Settings Sayfası: `/quality/oem/settings/plan` üzerinde mevcut plan durumu, kullanım özeti (yeşil/amber/kırmızı ilerleme çubukları) ve tam özellik erişim matrisi.
Supplier Portal Ücretsiz: Tedarikçi erişimi tüm planlarda ücretsiz — kontrol OEM ilişkisi ve atamasıyla sağlanıyor.

📊 Plan Karşılaştırması

Free → Keşif ve benimsenme. 25 hata/ay, sınırlı dashboard, temel 8D.
Pro → Aktif kalite operasyonları. Sınırsız hata, tam 8D, AI Classification, FMEA, PPAP, IQC, SLA, War Room, Benzer Hatalar.
Enterprise → Zeka, kontrol ve entegrasyon. AI 8D Review, Root Cause Suggestion, API, Webhooks, SSO, Multi-Plant, Gelişmiş Denetim Kaydı.

⚠️ Breaking Changes
AI 8D Review ve Root Cause Suggestion artık Enterprise plan gerektiriyor (önceki sürümde PRO ile erişilebilirdi).
Inline plan kontrolleri merkezi feature gate sistemine taşındı — dağınık `plan` karşılaştırmaları kaldırıldı.

🛠 Teknik Detaylar
Yeni `usage_counters` veritabanı tablosu (Prisma migration dahil)
`Plan` enum'ına `FREE` ve `ENTERPRISE` değerleri eklendi (mevcut `BASIC` backward compat)
Session `plan` alanı artık `company.plan`'dan okunuyor (user.plan fallback)
`src/lib/billing/` modülü: `plans.ts`, `features.ts`, `usage.ts`, `guards.ts`
Tüm AI endpoint'leri ve server action'ları feature gate ile korunuyor

🚀 Sırada Ne Var? (Roadmap)
v2.1.0: Stripe ödeme entegrasyonu, fatura yönetimi, SSO implementasyonu.
v2.0.1: Defect/field creation usage consumption, storage tracking.

PlantX Automotive — Kalite Yönetimi, Artık Ürünleştirildi.