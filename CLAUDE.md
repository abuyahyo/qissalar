# Qissalar — CLAUDE notes

## Loyiha turi
abuyahyo/qissalar — GitHub Pages SPA. Bolalar uchun "Payg'ambarlar qissasi" (Shayx Muhammad Sodiq Muhammad Yusuf) reader.

## Auditoriya (MUHIM)
Ilovaning **foydalanuvchisi — katta odam** (ota-ona / ustoz), u **yosh bolaga ovoz chiqarib o'qib beradi**. Bola ekranni o'zi o'qimaydi. Demak:
- Matn ovoz chiqarib o'qish uchun ravon va uzluksiz bo'lishi kerak (bola uchun "soddalashtirilgan qisqa matn" emas; manba matni hech qachon o'zgartirilmaydi).
- Pastel/emoji dizayn — bola yonida ekranga qarab o'tirishi mumkin bo'lgani uchun saqlanadi.
- Ilovani bola o'zi o'qishi uchun **optimizatsiya qilmang** (audio-narratsiya, o'yinlashtirish, harf-darajadagi soddalashtirish va h.k. kerak emas).

## Manba
Maqola **islom.uz/maqola/2396** dan olinadi (API: `https://new.islom.uz/api/v1/posts/2396` — JSON `body` HTML matn beradi). `parse.js` shu HTML'ni strukturali `qissalar.json`ga aylantiradi.

## Struktura
- `index.html` — SPA shell (manifest + apple-touch-icon meta'lari)
- `styles.css` — bolalarbop pastel dizayn, tungi mavzu, font o'lchamini o'zgartirish
- `app.js` — hash-router, render funksiyalar, Kirill↔Lotin translit, SW registratsiyasi
- `qissalar.json` — parslangan mazmun: `chapters → stories → sections → blocks`
- `parse.js` — bir martalik konversiya skripti
- `sw.js` — Service Worker (PWA)
- `manifest.json` — PWA manifest
- `icon-{192,512,maskable}.png`, `apple-touch-icon.png` — sharp orqali `icon.svg`'dan generatsiya qilinadi

## PWA / Service Worker
**Strategiya:** network-first 3s timeout bilan, offline'da kesh'dan fallback. Stale-cache muammosi yo'q — onlayn foydalanuvchi har sahifa yuklashda yangi mazmun oladi.

**Yangilanish:** SW `skipWaiting()` + `clients.claim()` qiladi → yangi versiya darhol almashtiriladi, kesh tozalash kerak emas. Registratsiya `updateViaCache: 'none'` bilan, demak `sw.js` o'zi hech qachon keshlanmaydi.

**Versiya:** `sw.js` ichida `VERSION = 'v1'` konstanta. Asoslimaslik: matn yangilansa ham, JSON network-first sxema bilan keladi. VERSION'ni bumpla **faqat** SW logikasi yoki precache ro'yxati o'zgarganda — keshni butunlay tozalash uchun.

**Ikonalarni qayta generatsiya qilish:**
```
node -e "const s=require('sharp'),f=require('fs');['icon-192.png',192,'icon-512.png',512,'apple-touch-icon.png',180].reduce(async(p,v,i,a)=>{if(i%2)return;await p;await s(f.readFileSync('icon.svg'),{density:384}).resize(a[i+1],a[i+1]).png().toFile(v);},Promise.resolve())"
```
Maskable ikona **alohida** `icon-maskable.svg`'dan generatsiya qilinadi (full-bleed fon + ~80% xavfsiz zona — Android adaptive-icon kesib qo'ymasligi uchun, `icon.svg`'ni nusxa qilmang):
```
node -e "const s=require('sharp'),f=require('fs');s(f.readFileSync('icon-maskable.svg'),{density:384}).resize(512,512).png().toFile('icon-maskable-512.png')"
```

### Maydon ma'nolari
- **chapter** (`h1`) — original maqolaning 4 bobi
- **story** — bob ichidagi alohida payg'ambar qissasi (raqam 1'ga qaytganda yangi qissa boshlanadi). Bob 4 ichida 4 ta qissa (Ibrohim, Yusuf, Muso 1, Muso 2)
- **section** (`<p><strong>N. ...</strong></p>`) — raqamli kichik bo'lim
- **block kinds** — `para` (oddiy abzas), `quote` (Qur'on oyati — «...» bilan)

## Routing (hash)
- `#/` — bosh sahifa
- `#/intro` — muqaddima
- `#/c/:ci` — bob (bitta qissali bo'lsa avto-yo'naltirish)
- `#/c/:ci/s/:si` — qissaning bo'limlar ro'yxati
- `#/c/:ci/s/:si/p/:pi` — bitta bo'limni o'qish

## Yangilash workflow
```
curl https://new.islom.uz/api/v1/posts/2396 -o $TEMP/post2396.json
node parse.js  # qissalar.json'ni yangilaydi
git add qissalar.json && git commit && git push
```

## Dizayn qoidalari
- Mobile-first (user telefondan o'qiydi)
- Shrift: iOS native sans — hamma joyda (UI ham, o'qish matni ham) `-apple-system` (iOS'da SF Pro). `styles.css`'dagi `--font` tokeni orqali boshqariladi. Tashqi shrift yuklanmaydi.
- Qur'on iqtiboslari yashil border-left + ﴿﴾ ornament
- Font o'lchami `A+` tugmasi bilan oshiriladi (localStorage'da saqlanadi)
- Tungi mavzu `prefers-color-scheme: dark` orqali

## Manba matni o'zgarmasligi kerak
Original muallifning so'zlari hech qachon "soddalashtirilmaydi" yoki o'zgartirilmaydi. Faqat strukturasi (HTML → JSON) qayta ishlanadi.
