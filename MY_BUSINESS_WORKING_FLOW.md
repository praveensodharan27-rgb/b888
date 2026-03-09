# My Business – Working Flow

## User journey (logged-in only)

```
User logs in
    ↓
Opens /mybusiness (or clicks "My Business" in nav)
    ↓
GET /api/business/my
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  No business found?                                             │
│  → Show empty state + "Create Your Business" button              │
│  → User clicks → /mybusiness/create                               │
└─────────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────────┐
│  Business exists?                                                │
│  → Show dashboard: logo, name, category, city, status,          │
│    [Edit] [Preview] + shortcuts (details, services, images, hours)│
│  → Edit → /mybusiness/edit/[id]                                   │
│  → Preview → /business/[slug] (new tab)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Create flow

```
/mybusiness/create
    ↓
User fills multi-section form:
  Basic info (name*, category*, description)
  Contact (phone*, whatsapp, email, website)
  Location (address, state, city*, pincode, map latitude, map longitude)
  Images (logo upload/URL, cover upload/URL, gallery upload/URLs)
  Services (add/remove: name, price, description, image URL)
  Working hours (Mon–Sun open/close)
  Social links (Facebook, Instagram, YouTube)
    ↓
Submit
    ↓
POST /api/business
  - Validate: business_name, category, phone, city required
  - Check: user has no existing business (one per user)
  - Generate slug from business_name (slugifyUnique)
  - Create Business in DB
    ↓
201 { success: true, data: business }
    ↓
Redirect → /mybusiness (dashboard)
```

---

## Edit flow

```
/mybusiness → [Edit] → /mybusiness/edit/[id]
    ↓
GET /api/business/:id (auth, owner only)
    ↓
Prefill same form as create
    ↓
User changes fields → Submit
    ↓
PUT /api/business/:id
  - Ensure req.user.id === business.userId
  - If business_name changed → regenerate slug (unique)
  - Update Business in DB
    ↓
200 { success: true, data: business }
    ↓
Redirect → /mybusiness
```

---

## Public page flow

```
Anyone (logged in or not) opens /business/[slug]
  e.g. /business/moksha-massage-spa
    ↓
Server: generateMetadata({ params })
  → GET {API}/business/public/[slug] (server-side fetch)
  → Title: "Best {category} in {city} – {business_name}"
  → Description, OG, Twitter meta
    ↓
Client: PublicBusinessPageClient
  → GET /api/business/public/[slug] (useQuery)
  → Show: cover, logo, name, category, description,
          services, gallery, contact (call, WhatsApp, email, website),
          working hours, address, map link, social links
  → JSON-LD LocalBusiness for SEO
```

---

## API summary

| Action              | Method | Path                     | Auth | Description                    |
|---------------------|--------|--------------------------|------|--------------------------------|
| Get my business     | GET    | /api/business/my         | Yes  | Single business for user      |
| Create business     | POST   | /api/business            | Yes  | One per user, slug auto       |
| Get public by slug  | GET    | /api/business/public/:slug | No   | Public profile                 |
| Get own by id       | GET    | /api/business/:id        | Yes  | For edit form                 |
| Update business     | PUT    | /api/business/:id        | Yes  | Owner only                    |

---

## Data flow (one business per user)

- **DB:** `Business.userId` is `@unique` → at most one row per user.
- **Create:** Backend checks `findUnique({ where: { userId } })`; if exists → 400.
- **Dashboard:** `GET /my` returns single business or `null`.
- **Edit:** Only the owner can `GET`/`PUT` by `id` (checked via `userId`).

Future: to support multiple businesses per user, remove `@unique` from `userId` and add a “default” or list UI.

---

## All data: save, show, edit, update

Every field stored in the database is saved from the create/edit form, shown on the public page, and can be updated via the edit form.

| DB field       | Create form     | Public page              | Edit form        |
|----------------|-----------------|---------------------------|------------------|
| businessName   | Basic name *    | Header card               | Basic name *     |
| slug           | Auto from name  | URL /business/[slug]      | Auto on name change |
| category       | Basic *         | Header + meta             | Basic *          |
| description    | Basic           | About the Company         | Basic            |
| phone          | Contact *       | Connect Phone             | Contact *        |
| whatsapp       | Contact         | Connect WhatsApp          | Contact          |
| email          | Contact         | Connect Email             | Contact          |
| website        | Contact         | Connect Website           | Contact          |
| address        | Location        | Location card             | Location         |
| state          | Location        | Location card             | Location         |
| city           | Location *      | Header + Location         | Location *       |
| pincode        | Location        | Location card             | Location         |
| mapLocation    | Location lat/lng| Get Directions link       | Location lat/lng |
| logo           | Images          | Header card               | Images           |
| coverImage     | Images          | Banner                    | Images           |
| gallery        | Images          | Gallery section           | Images           |
| services       | Services grid   | Our Core Services         | Services grid    |
| workingHours   | Mon-Sun         | Business Hours card       | Mon-Sun          |
| socialLinks    | Facebook etc    | Follow card               | Facebook etc     |
| isActive       | -               | Only active shown         | backend only     |
| isVerified     | -               | Blue tick header          | admin only       |

**Process:** (1) Save: Create form POST /api/business with all fields. (2) Show: Public page GET /api/business/public/:slug renders all data. (3) Edit: GET /api/business/:id prefills form including mapLocation, gallery, services, hours, social. (4) Update: PUT /api/business/:id with same payload shape; map_location can be set or cleared (null).
