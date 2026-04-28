# TourVista — Rezdy × commercetools POC

A Next.js 14 proof-of-concept demonstrating real-time tour booking with Rezdy as the inventory/booking engine and commercetools as the product catalogue.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Next.js)                      │
│                                                             │
│  /           →  Tour grid  (Rezdy products → TourProduct)  │
│  /booking    →  3-step wizard (sessions → book)            │
│  /thank-you  →  Confirmation (URL params)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch
           ┌─────────────▼────────────────┐
           │      Next.js API Routes       │
           │  /api/rezdy/products          │
           │  /api/rezdy/sessions          │
           │  /api/rezdy/book              │
           │  /api/commercetools/products  │
           │  /api/sync/run                │
           └──────┬────────────┬──────────┘
                  │            │
         ┌────────▼────┐  ┌───▼────────────────┐
         │  Rezdy API  │  │  commercetools API  │
         │  (REST)     │  │  (REST + OAuth2)    │
         └─────────────┘  └────────────────────┘
```

### Sync Flow

```
POST /api/sync/run
  └─ runFullSync()
       ├─ getRezdyProducts()          ← Rezdy /products
       └─ for each product:
            ├─ getCTProductByKey()    ← CT /product-projections/key=:key
            ├─ if not found → createCTProduct()
            └─ if found    → updateCTProduct() → publishCTProduct()
```

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero + tour grid with category filter + Sync CT button |
| Booking | `/booking?productCode=XXX` | 3-step booking wizard |
| Thank You | `/thank-you` | Booking confirmation with confetti |

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/rezdy/products` | Fetch all Rezdy products → `TourProduct[]` |
| GET | `/api/rezdy/sessions?productCode=&startTime=&endTime=` | Fetch availability |
| POST | `/api/rezdy/book` | Create a Rezdy booking |
| GET | `/api/commercetools/products` | Fetch CT product projections |
| POST | `/api/sync/run` | Run full Rezdy → CT sync |
| GET | `/api/sync/run` | Usage instructions |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials. The app runs in **mock/demo mode** if no API keys are configured — no real API calls are made.

### 3. Create a commercetools Product Type

In commercetools Merchant Center (or via API), create a product type with these attributes:

| Name | Type | Description |
|------|------|-------------|
| `rezdy-product-code` | Text | Rezdy product code |
| `rezdy-duration` | Number | Duration in minutes |
| `rezdy-location` | Text | Location string |
| `rezdy-tags` | Text | Comma-separated tags |

Copy the product type ID to `CT_PRODUCT_TYPE_ID` in your `.env.local`.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
rezdy-ct-poc/
├── app/
│   ├── api/
│   │   ├── rezdy/
│   │   │   ├── products/route.ts     ← GET Rezdy products
│   │   │   ├── sessions/route.ts     ← GET Rezdy availability
│   │   │   └── book/route.ts         ← POST Rezdy booking
│   │   ├── commercetools/
│   │   │   └── products/route.ts     ← GET CT product projections
│   │   └── sync/
│   │       └── run/route.ts          ← POST/GET sync trigger
│   ├── booking/page.tsx              ← 3-step booking wizard
│   ├── thank-you/page.tsx            ← Confirmation + confetti
│   ├── layout.tsx                    ← Root layout
│   ├── page.tsx                      ← Home / tour grid
│   └── globals.css                   ← Tailwind + custom CSS
├── components/
│   ├── Navbar.tsx                    ← Fixed frosted-glass nav + sync button
│   ├── TourCard.tsx                  ← Product card with badges
│   └── StepIndicator.tsx             ← Booking wizard step indicator
├── data/
│   └── mockData.ts                   ← 6 Australian tours + 3 sessions
├── lib/
│   ├── commercetools/
│   │   ├── auth.ts                   ← OAuth2 token cache + ctRequest()
│   │   └── products.ts               ← CT CRUD operations + helpers
│   ├── rezdy/
│   │   └── service.ts                ← Rezdy API client + helpers
│   └── sync/
│       └── syncService.ts            ← rezdyToCtDraft() + runFullSync()
├── types/
│   └── index.ts                      ← All TypeScript interfaces
├── .env.example
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## Mock / Fallback Data

All API routes and client pages fall back to mock data silently when API keys are not configured:

- **6 Australian tours**: Sydney Harbour Cruise, Blue Mountains Trek, Great Barrier Reef Snorkel, Melbourne Coffee Tour, Uluru Camel Ride, Daintree Night Walk
- **3 sessions**: Tomorrow, day after, 3 days out — each with Adult ($89) and Child ($55) price options
- **Booking POC mode**: On any booking error, navigates to `/thank-you` with a `DEMO-` prefixed order number

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary green | `#277a58` | Buttons, badges, accents |
| Background | `#F9F7F4` | Warm off-white page bg |
| Coral | `#E07A5F` | Scarcity warnings |
| Ocean blue | `#2479e9` | Secondary accents |
| Display font | Playfair Display | Headings, hero |
| Body font | DM Sans | UI text |

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS v3** (custom color palette + animations)
- **Rezdy REST API** — product catalogue + availability + bookings
- **commercetools API** — product catalogue sync (OAuth2, REST)
- No additional UI libraries
