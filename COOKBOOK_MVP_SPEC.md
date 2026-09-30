# Cookbook Web App — MVP Spec

> **For Claude Code:** This is the build spec for a cookbook web app MVP. Read the whole file first, then build it phase by phase in the order in **§10 Build Order**. After each phase, run the app, fix any errors, and check that phase's acceptance criteria before moving on. Ask me before you add dependencies not listed here or change the stack.

---

## 1. Product Summary

A personal cookbook where users save recipes with photos, ingredients, steps, calories, and ratings. They can scale servings (ingredient quantities and nutrition update automatically), save their own changes to a recipe as "modifications," embed the video or tutorial the recipe came from, and share recipes with friends.

**Core loop:** Add recipe → cook it (scaled to your servings) → rate it and note your changes → share it.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + TypeScript** | Full stack in one repo, server actions, easy deploy |
| Styling | **Tailwind CSS + shadcn/ui** | Fast, clean components |
| DB | **SQLite via Prisma** (can switch to Postgres later by changing the provider) | No setup needed for the MVP |
| Auth | **Auth.js (NextAuth v5)**: email magic link or GitHub OAuth, plus a Credentials provider for local dev | Simple |
| Image storage | Local `/public/uploads` in dev behind a `StorageAdapter` interface (swap in S3 or Cloudinary later) | Keeps the MVP self-contained |
| Validation | **Zod** | Shared client and server schemas |
| Testing | **Vitest** for pure logic (scaling, unit conversion, nutrition, URL parsing) | The math has to be right |

**Env vars (`.env.example`):** `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `NEXT_PUBLIC_APP_URL`.

---

## 3. Data Model (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  image         String?
  username      String    @unique
  createdAt     DateTime  @default(now())
  recipes       Recipe[]
  ratings       Rating[]
  modifications Modification[]
  collections   Collection[]
  sentShares    Share[]   @relation("sharedBy")
  receivedShares Share[]  @relation("sharedWith")
  friendsA      Friendship[] @relation("requester")
  friendsB      Friendship[] @relation("addressee")
  shoppingItems ShoppingListItem[]
}

model Recipe {
  id            String   @id @default(cuid())
  ownerId       String
  owner         User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  coverImageUrl String?
  images        RecipeImage[]
  baseServings  Int      @default(4)
  prepMinutes   Int?
  cookMinutes   Int?
  difficulty    Difficulty @default(MEDIUM)
  cuisine       String?
  tags          String   // JSON array of strings (SQLite has no arrays)
  sourceUrl     String?  // where the recipe came from
  videoUrl      String?  // YouTube / TikTok / Instagram / Vimeo
  videoStartSec Int?     // optional timestamp to start the embed at
  // Nutrition is PER SERVING at baseServings
  caloriesPerServing Int?
  proteinG      Float?
  carbsG        Float?
  fatG          Float?
  visibility    Visibility @default(PRIVATE)
  shareSlug     String?  @unique // for public/unlisted links
  forkedFromId  String?  // "remix" lineage
  forkedFrom    Recipe?  @relation("forks", fields: [forkedFromId], references: [id])
  forks         Recipe[] @relation("forks")
  ingredients   Ingredient[]
  steps         Step[]
  ratings       Rating[]
  modifications Modification[]
  collections   CollectionRecipe[]
  shares        Share[]
  cookLogs      CookLog[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model RecipeImage {
  id       String @id @default(cuid())
  recipeId String
  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  url      String
  caption  String?
  order    Int    @default(0)
}

model Ingredient {
  id        String  @id @default(cuid())
  recipeId  String
  recipe    Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  order     Int
  quantity  Float?  // null for "to taste"
  unit      String? // canonical unit key, see §5.2
  name      String  // "all-purpose flour"
  note      String? // "sifted", "room temp"
  group     String? // "For the sauce"
  scalable  Boolean @default(true) // false for "1 bay leaf", "salt to taste"
}

model Step {
  id           String @id @default(cuid())
  recipeId     String
  recipe       Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  order        Int
  text         String
  timerSeconds Int?   // detected or manually set; powers the cook-mode timer
  imageUrl     String?
}

model Rating {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  stars     Int      // 1–5
  review    String?
  wouldMakeAgain Boolean?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([userId, recipeId])
}

model Modification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  title     String   // "Less sugar, added cinnamon"
  notes     String?
  // JSON: [{ ingredientId?, action: "change"|"add"|"remove", quantity?, unit?, name?, note? }]
  ingredientChanges String @default("[]")
  servings  Int?     // the servings this mod is tuned for
  isDefault Boolean  @default(false) // auto-apply when this user opens the recipe
  createdAt DateTime @default(now())
}

model Friendship {
  id          String   @id @default(cuid())
  requesterId String
  requester   User     @relation("requester", fields: [requesterId], references: [id], onDelete: Cascade)
  addresseeId String
  addressee   User     @relation("addressee", fields: [addresseeId], references: [id], onDelete: Cascade)
  status      FriendStatus @default(PENDING)
  createdAt   DateTime @default(now())
  @@unique([requesterId, addresseeId])
}

model Share {
  id           String   @id @default(cuid())
  recipeId     String
  recipe       Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  sharedById   String
  sharedBy     User     @relation("sharedBy", fields: [sharedById], references: [id], onDelete: Cascade)
  sharedWithId String
  sharedWith   User     @relation("sharedWith", fields: [sharedWithId], references: [id], onDelete: Cascade)
  message      String?
  seenAt       DateTime?
  createdAt    DateTime @default(now())
}

model Collection {
  id      String @id @default(cuid())
  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name    String // "Weeknight dinners", "Meal prep"
  emoji   String?
  recipes CollectionRecipe[]
}

model CollectionRecipe {
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  recipeId     String
  recipe       Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  @@id([collectionId, recipeId])
}

model CookLog {
  id        String   @id @default(cuid())
  recipeId  String
  recipe    Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  userId    String
  servings  Int
  photoUrl  String?  // "I made it" photo
  note      String?
  cookedAt  DateTime @default(now())
}

model ShoppingListItem {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  quantity  Float?
  unit      String?
  checked   Boolean @default(false)
  fromRecipeId String?
}

enum Visibility   { PRIVATE FRIENDS UNLISTED PUBLIC }
enum Difficulty   { EASY MEDIUM HARD }
enum FriendStatus { PENDING ACCEPTED BLOCKED }
```

Also include the Auth.js `Account`, `Session` and `VerificationToken` models from the Prisma adapter.

---

## 4. Pages & Routes

| Route | Purpose |
|---|---|
| `/` | Logged out: landing page. Logged in: redirect to `/recipes` |
| `/recipes` | My cookbook: grid of recipe cards with search, filters and sort |
| `/recipes/new` | Create a recipe: manual form **or** "Import from URL" tab |
| `/recipes/[id]` | Recipe detail: images, video embed, servings scaler, ingredients, steps, nutrition, ratings, modifications |
| `/recipes/[id]/edit` | Edit a recipe (owner only) |
| `/recipes/[id]/cook` | **Cook mode**: full screen, one step at a time, timers, screen stays on |
| `/recipes/[id]/print` | Print-friendly view that respects the current servings and modification |
| `/r/[shareSlug]` | Public or unlisted shared recipe page (read-only, with a "Save to my cookbook" button) |
| `/friends` | Friend list, pending requests, add a friend by username or email |
| `/inbox` | Recipes friends shared with me |
| `/collections` and `/collections/[id]` | User-made recipe folders |
| `/shopping-list` | Aggregated grocery list |
| `/u/[username]` | Public profile listing the user's PUBLIC recipes |

API and server actions go under `app/api/*` or colocated `actions.ts`. Every mutation must check ownership or permissions on the server.

---

## 5. Feature Specs

### 5.1 Recipe CRUD (required)
- Form fields: title, description, cover image plus up to 10 gallery images (drag to reorder), base servings, prep and cook time, difficulty, cuisine, tags, source URL, video URL, nutrition, ingredients, steps, visibility.
- **Ingredients editor:** repeatable rows (qty / unit / name / note / group), with a **"paste as text" mode** that parses lines like `2 1/2 cups flour, sifted` into structured fields (see §5.2 parser).
- **Steps editor:** repeatable, reorderable textareas with an optional image per step. Auto-detect times such as "bake 25 minutes" or "simmer for 1 hr" and prefill `timerSeconds` (the user can edit it).
- Images: accept jpg, png and webp up to 5 MB, resize to a max width of 1600px (use `sharp`), and store through the `StorageAdapter`.
- Delete asks for confirmation.

### 5.2 Servings Scaler + Unit Handling (required)
- A servings stepper (− / + and a number input, 1–100) on the detail page. It defaults to `baseServings`, or to the user's default modification's servings.
- `scaleFactor = targetServings / baseServings`. Scale every ingredient where `scalable = true`.
- **Smart formatting:** show friendly fractions (`0.333 → ⅓`, `1.5 → 1½`) and round to sensible values for each unit.
- **Unit toggle:** Original / US / Metric. Keep a conversion table for volume (tsp, tbsp, cup, fl oz, ml, l) and weight (oz, lb, g, kg). Never convert volume to weight.
- **Auto-upscale units** when numbers get awkward: 16 tbsp becomes 1 cup, 1000 g becomes 1 kg.
- Nutrition stays **per serving** and also shows **total for the batch** = perServing × servings.
- Eggs and other count items round to whole or half numbers and show a hint such as "≈ 1½ eggs, use 2 small".
- Put all of this in `lib/scaling.ts`, `lib/units.ts` and `lib/ingredientParser.ts`, and **unit-test it with Vitest** (at least 15 cases covering fractions, mixed numbers, unicode fractions, ranges like "2-3 cloves", and "to taste").

### 5.3 Calories & Nutrition (required)
- Enter per-serving calories, protein, carbs and fat manually.
- Show a small macro bar (P / C / F percentages of calories) on the detail page.
- *Stretch:* an "Estimate" button that calls a nutrition API (for example USDA FoodData Central) behind a `NutritionProvider` interface. Stub it in the MVP.

### 5.4 Modifications (required)
- Any user who can view a recipe can create a **Modification** layered on top of it without touching the original: change, add or remove ingredients, set a servings count, and write notes.
- The detail page has a dropdown to switch between "Original" and my modifications. The ingredient list renders the diff: changed quantities are highlighted, added items are tagged `+ added`, removed items are struck through.
- Mark one modification as **default** so it applies automatically.
- **Fork / Remix:** "Save as my own recipe" copies the recipe with the modification applied, sets `forkedFromId`, and shows "Remixed from X by @user" on the copy.

### 5.5 Ratings & Reviews (required)
- 1–5 stars, an optional review, and a "Would make again?" toggle. One rating per user per recipe, which they can edit.
- Show the average stars, the count, and the percentage who would make it again. List reviews newest first.
- Owners can rate their own recipes as a personal log, but those ratings are excluded from the public average.

### 5.6 Video / Tutorial Embeds (required)
- Paste a URL and detect the provider:
  - **YouTube** (`youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, and a `t=` timestamp) → `youtube-nocookie.com/embed/{id}?start={t}`
  - **Vimeo** → `player.vimeo.com/video/{id}`
  - **TikTok** → `tiktok.com/embed/v2/{id}`
  - **Instagram reel or post** → `instagram.com/p/{id}/embed`
  - Anything else → a link card showing the domain and a favicon.
- Render the embed as a responsive iframe (16:9, or 9:16 for Shorts, TikTok and Reels) that lazy-loads.
- Show a "Source: [domain]" credit linking to `sourceUrl`.
- Put this in `lib/video.ts` with unit tests.

### 5.7 Sharing with Friends (required)
- **Friends:** send a request by username or email, then accept, decline or block.
- **Share to a friend:** from a recipe, choose one or more friends and add an optional message. It lands in their `/inbox` with an unread badge in the nav.
- **Visibility levels:**
  - `PRIVATE`: owner only (plus anyone the recipe was explicitly shared with)
  - `FRIENDS`: all accepted friends
  - `UNLISTED`: anyone with the `/r/[shareSlug]` link
  - `PUBLIC`: link, plus shown on the profile
- **Share button:** copy the link, use the Web Share API on mobile, and show a QR code (`qrcode` package).
- Set Open Graph meta tags on `/r/[slug]` (title, cover image, description, "⭐ 4.6 · 520 cal") so links preview well in iMessage, WhatsApp and Slack.
- A **"Save to my cookbook"** button on shared recipes forks the recipe into the viewer's account.

### 5.8 Browse, Search & Filter (required)
- Search by title, ingredient name and tag.
- Filters: tags, cuisine, difficulty, max total time, max calories, min rating, and "has video."
- Sort by newest, top rated, most cooked, quickest, or fewest calories.
- Recipe card: cover image, title, ⭐ average, total time, calories per serving, and a ▶ badge if the recipe has a video.

---

## 6. Extra Features (build after the core; ranked by value for effort)

1. **Import from URL**: paste a recipe link, fetch it server-side, parse the `application/ld+json` block for schema.org `Recipe` (most recipe sites include one), and prefill the form with title, image, ingredients, steps, servings, time and nutrition. Fall back to a manual form if no Recipe JSON-LD is found. *(This saves the most time in the whole app.)*
2. **Cook Mode**: full screen with big text, one step per screen, swipe or arrow keys to move, and the ingredients used in each step highlighted. Tap-to-start timers that can run several at once and chime when done. Use the **Screen Wake Lock API** so the phone doesn't sleep. Include a checklist of ingredients to prep first.
3. **Shopping List**: "Add to list" at the current servings and modification. Combine duplicates across recipes (2 cups milk + 1 cup milk = 3 cups when the units are compatible), group by aisle using a simple keyword category map, check items off, and copy the list as text.
4. **"I Made It" Cook Log**: log a cook with a photo, the servings, and a note. Show "Cooked 7 times · last 3 weeks ago" on the recipe and a feed of cook photos in the gallery.
5. **Collections**: user folders with an emoji, and add-to-collection from any card.
6. **"What can I make?" pantry search**: enter the ingredients you have and rank your recipes by the percentage of ingredients matched, listing what's missing.
7. **Print view**: a clean one-page layout that respects the chosen servings, units and modification.
8. **Random pick / "Surprise me"**: a random recipe from a collection or filter set.

*Future, not in the MVP:* AI features (clean up a pasted recipe, suggest substitutions, estimate nutrition), a meal planner calendar, comments on shared recipes, PWA offline mode.

---

## 7. UI / UX Guidelines
- Mobile-first. People cook with phones on the counter.
- Recipe detail layout: hero image or gallery carousel → title, rating, time, calories chips → servings scaler and unit toggle → **Ingredients** (with tap-to-check-off) → **Steps** → **Video** → **Nutrition** → **My modifications** → **Ratings & reviews**. On desktop, ingredients go in a sticky left column and steps on the right.
- A warm, food-friendly palette with light and dark mode. Use shadcn components (Dialog, Tabs, Sheet, Toast).
- Empty states with a clear call to action ("No recipes yet — add one or import from a link").
- Skeleton loaders and optimistic UI for ratings, checkboxes and the shopping list.
- Accessibility: labeled inputs, alt text on images (a required field on upload), keyboard-navigable cook mode.

---

## 8. Permissions Matrix

| Action | Owner | Friend (FRIENDS visibility or direct share) | Link holder (UNLISTED/PUBLIC) | Anonymous |
|---|---|---|---|---|
| View | ✅ | ✅ | ✅ | ✅ PUBLIC/UNLISTED only |
| Edit / delete | ✅ | ❌ | ❌ | ❌ |
| Rate / review | ✅ (personal) | ✅ | ✅ logged in | ❌ |
| Create modification | ✅ | ✅ | ✅ logged in | ❌ |
| Fork / save | ✅ | ✅ | ✅ logged in | ❌, prompt to sign in |
| Re-share | ✅ | ✅ if not PRIVATE | ✅ PUBLIC only | ❌ |

Put this logic in a single `lib/permissions.ts` (`canView`, `canEdit`, `canRate`, …) and use it everywhere.

---

## 9. Project Structure

```
/app
  /(auth)/signin
  /recipes/[id]/{page,edit,cook,print}
  /r/[slug]
  /friends /inbox /collections /shopping-list /u/[username]
  /api/import  /api/upload
/components
  recipe-card.tsx  recipe-form/  ingredient-list.tsx  servings-scaler.tsx
  unit-toggle.tsx  video-embed.tsx  star-rating.tsx  modification-picker.tsx
  share-dialog.tsx  cook-mode/  nutrition-panel.tsx
/lib
  db.ts  auth.ts  permissions.ts  storage.ts
  scaling.ts  units.ts  ingredientParser.ts  fractions.ts
  video.ts  importRecipe.ts  timeParser.ts  shoppingList.ts
/prisma  schema.prisma  seed.ts
/tests   *.test.ts
```

---

## 10. Build Order

**Phase 1 – Foundation**
Scaffold Next.js, TypeScript, Tailwind and shadcn. Add the Prisma schema and migration, Auth.js sign-in (Credentials in dev), and a nav shell.
✅ *Done when:* I can sign up, sign in, and see an empty `/recipes`.

**Phase 2 – Recipes core**
Recipe CRUD, image upload, the ingredients and steps editors, the detail page, and cards with search.
✅ *Done when:* I can create a recipe with 3 images, 8 ingredients and 5 steps, see it on the detail page, edit it, and delete it.

**Phase 3 – Scaling, units, nutrition**
`lib/scaling`, `units`, `ingredientParser` and `fractions`, plus the Vitest suite, the servings scaler, the unit toggle, and the nutrition panel.
✅ *Done when:* Changing 4 → 6 servings turns "1 cup" into "1½ cups," the metric toggle shows ml or g, batch calories update, and all tests pass.

**Phase 4 – Ratings & Modifications**
Star ratings and reviews with aggregates, modifications with diff rendering and a default mod, and fork/remix.
✅ *Done when:* A modification that removes sugar and adds cinnamon shows correctly in the diff, and forking creates a new recipe with a "Remixed from" link.

**Phase 5 – Video embeds**
`lib/video.ts` with tests, the embed component, and the source credit.
✅ *Done when:* A YouTube watch URL, a youtu.be link with a timestamp, a YouTube Shorts link, a TikTok link and an Instagram reel link all render correctly.

**Phase 6 – Sharing & Friends**
The friend system, visibility, share dialog, inbox, `/r/[slug]` with Open Graph tags, QR code, and "Save to my cookbook."
✅ *Done when:* User A shares a recipe with User B, B sees it in the inbox, B saves a copy, and an anonymous visitor can open an UNLISTED link but not a PRIVATE one.

**Phase 7 – Extras**
Import from URL → Cook mode → Shopping list → Cook log → Collections → Pantry search → Print view.

**Phase 8 – Polish**
Seed data with 8 sample recipes and images from Unsplash URLs, empty states, a responsive pass, dark mode, a README with setup steps, and `npm run lint && npm test && npm run build` passing cleanly.

---

## 11. Non-Functional Requirements
- Validate all inputs with Zod on the server.
- Sanitize user text; never render raw HTML. Iframe `src` values must come from `lib/video.ts` and match a provider allowlist, never a raw user URL.
- The URL importer fetches server-side with a 10-second timeout, a 2 MB response cap, and blocks private IP ranges to prevent SSRF.
- Images use `next/image` and lazy loading.
- Lighthouse mobile score ≥ 90 on the recipe detail page.
- `README.md` covers setup (`npm i`, `cp .env.example .env`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`) and how to switch to Postgres.

---

## 12. Out of Scope for the MVP
Payments, native mobile apps, real-time collaborative editing, comment threads, notifications by email or push, and AI features. Keep interfaces (`StorageAdapter`, `NutritionProvider`) ready so these can be added later.
