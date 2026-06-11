# Qissalar — CLAUDE notes

## Loyiha turi
abuyahyo/qissalar — GitHub Pages SPA. Bolalar uchun "Payg'ambarlar qissasi" (Shayx Muhammad Sodiq Muhammad Yusuf) reader.

## Manba
Maqola **islom.uz/maqola/2396** dan olinadi (API: `https://new.islom.uz/api/v1/posts/2396` — JSON `body` HTML matn beradi). `parse.js` shu HTML'ni strukturali `qissalar.json`ga aylantiradi.

## Struktura
- `index.html` — SPA shell
- `styles.css` — bolalarbop pastel dizayn, tungi mavzu, font o'lchamini o'zgartirish
- `app.js` — hash-router, render funksiyalar
- `qissalar.json` — parslangan mazmun: `chapters → stories → sections → blocks`
- `parse.js` — bir martalik konversiya skripti

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
- Shrift: iOS native — UI uchun `-apple-system` (SF Pro), o'qish matni uchun `ui-serif` (iOS'da New York). Tashqi shrift yuklanmaydi.
- Qur'on iqtiboslari yashil border-left + ﴿﴾ ornament
- Font o'lchami `A+` tugmasi bilan oshiriladi (localStorage'da saqlanadi)
- Tungi mavzu `prefers-color-scheme: dark` orqali

## Manba matni o'zgarmasligi kerak
Original muallifning so'zlari hech qachon "soddalashtirilmaydi" yoki o'zgartirilmaydi. Faqat strukturasi (HTML → JSON) qayta ishlanadi.
