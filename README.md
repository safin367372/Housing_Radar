# HousingRadar

HousingRadar is a responsive accommodation discovery web app. It helps people find hostels, PGs, hotels, and lodges, compare price and amenities, inspect property details, and contact an owner. Property owners can register, sign in, publish a listing, and review their own listings.

This repository contains the React/Vite frontend and the Express/MongoDB API. It supports owner-approved booking requests, room availability updates, verified post-stay reviews, and complaint handling. Notifications and the separate AI/RAG service remain future work.

## Contents

- [Project status](#project-status)
- [Features implemented](#features-implemented)
- [Planned work](#planned-work)
- [Technology stack](#technology-stack)
- [Architecture and data flow](#architecture-and-data-flow)
- [Repository structure](#repository-structure)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [MongoDB data model](#mongodb-data-model)
- [Accommodation data and demo records](#accommodation-data-and-demo-records)
- [Security and current limitations](#security-and-current-limitations)
- [Suggested implementation order](#suggested-implementation-order)

## Project status

The project brief describes RoomRadar/HousingRadar as a student accommodation platform, initially focused on finding hostels and PGs near College of Engineering Chengannur. The current product language and data model also support hotels and lodges, so it can serve a wider accommodation search use case.

### Implemented in this repository

- Responsive React single-page application with home, login, signup, student, owner, and stay-detail routes.
- Student and owner account roles, chosen at signup.
- Password hashing with bcrypt and seven-day JWT authentication.
- Protected student and owner routes in the frontend and role-guarded owner API routes.
- MongoDB/Mongoose listing and user models.
- Listing search by text and location, filters for type, price, price period, amenities, and availability, sorting, and pagination.
- Detail pages with photos, address/location, amenities, room type, price, availability count, and owner phone links when present.
- Owner dashboard for creating a listing and viewing the signed-in owner's listings.
- Owner dashboard editing for listing details and current available-room count/status.
- Owner-only listing deletion with a confirmation prompt.
- Owner-controlled active/inactive visibility; inactive listings are hidden from public search and detail pages.
- Student booking requests with date-specific room holds, owner approval/rejection, cancellation before a confirmed stay starts, and hold release on rejection/cancellation/completion.
- Reviews restricted to completed bookings, with public verified reviews and recalculated listing ratings.
- Complaint submission by booked students and owner response/status management.
- Owner dashboard views for confirmed room occupancy, booking requests, property reviews, and user complaints.
- Browser map view with pins for active listings that have coordinates.
- Saved stays persisted per browser account.
- Demo sample seeding and repeatable import of the supplied boys' accommodation workbook data.
- A chatbot preview panel in the interface. It is not connected to an AI service.

### Not implemented yet

See [Planned work](#planned-work). The room-map booking flow blocks overlapping requests for the same room while a request is pending or confirmed. Pending holds do not expire automatically, and booking notifications are not implemented.

## Features implemented

### Visitor and student experience

- Browse public listings from the API.
- Search by listing name, description, type, area, city, or address.
- Filter by hostel, PG, hotel, or lodge; monthly/nightly price; minimum/maximum price; amenities; and available status.
- Sort by newest, price ascending/descending, or rating.
- Select 4, 6, or 8 listings per page and navigate paginated results.
- Open a listing detail page by clicking a listing card.
- Open stay locations in an interactive map; listings need coordinates to appear as pins.
- Save stays on this browser, with saved IDs separated by signed-in account.
- Submit a booking request with dates, room count, and a message; track it under **My bookings**.
- Cancel a pending request or a confirmed booking before its start date.
- Leave one verified review after a confirmed booking is marked complete by its owner.
- Submit complaints for confirmed or completed stays and view the owner's response/status.
- Sign up as a student and sign in; the student page reuses the public search and adds an account banner.

### Owner experience

- Sign up with the owner role and sign in.
- Open a protected owner dashboard.
- Create a listing with its name, property type, description, location, rate, room type, available room count, amenities, photo URLs, contact phone, and availability flag.
- View the signed-in owner's own listing records.
- Review and accept/decline booking requests; confirmation reserves rooms and completion returns them to availability.
- See confirmed occupied-room totals by property, guest reviews, and complaints; update complaint status and send a response.

### Chat interface

The floating assistant button opens a preview panel. The message field is intentionally disabled until the chatbot API/service is implemented.

## Planned work

The following items in the original scope remain incomplete:

1. **Notifications:** inform students and owners about booking state and complaint updates.
2. **Booking operations:** room-map requests hold selected rooms for overlapping dates and release them on rejection/cancellation/completion. Add automatic expiry for unanswered requests, payment if required, and end-to-end tests.
3. **Maps improvements:** destination entry and per-stay route distance/time; current pins require owner-supplied coordinates.
4. **AI/RAG chatbot:** separate Spring Boot + Spring AI service using PostgreSQL/pgvector and Gemini or Ollama, with document retrieval, retrieval checks, and a safe fallback. The current widget is only a preview.
5. **Vacancy automation agent:** planned service/agent to update vacancy data; no such integration exists yet.
6. **Operational features:** password reset, email verification, image upload/storage, stronger session handling, production deployment configuration, and automated test coverage.
7. **Data quality:** replace demo prices, amenities, photos, and room counts with verified owner-supplied information before presenting them as factual.

## Technology stack

| Area | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 19, Vite 7 | UI and local development/build tooling |
| Routing | React Router 7 | Client-side page navigation and route guards |
| Styling | CSS in `src/index.css`, Tailwind CSS 4 Vite plugin | Responsive page styling and utility CSS support |
| Map | Leaflet, React Leaflet, OpenStreetMap tiles | Browser map with active stay markers |
| HTTP client | Axios | Frontend requests to the REST API |
| Backend | Node.js 20+, Express 5 | JSON REST API and middleware |
| Database | MongoDB Atlas or local MongoDB, Mongoose 8 | Persistent users, listings, bookings, reviews, and complaints |
| Authentication | bcryptjs, jsonwebtoken | Password hashing and signed bearer tokens |
| Middleware | cors, dotenv | Cross-origin configuration and environment loading |
| Planned AI service | Spring Boot, Spring AI, PostgreSQL/pgvector, Gemini or Ollama | Retrieval-augmented chatbot (not in this repository yet) |
| Maps | Leaflet/OpenStreetMap; optional Google Maps Embed API | Public map pins and detail directions |

The frontend and backend are separate npm projects with separate `package.json` files. The backend currently exposes a **REST API**, not GraphQL or gRPC.

## Architecture and data flow

```text
Browser (React + React Router)
  ├── UI state and forms
  ├── Axios API client (VITE_API_URL)
  │     └── Authorization: Bearer <JWT> when a token is saved
  └── Express REST API (default http://localhost:5000/api)
        ├── Auth routes → auth controller → User model
        ├── Listing routes → listing controllers → Listing model
        ├── JWT authentication and owner role middleware
        └── Mongoose → MongoDB
```

### Listing search flow

1. The home page builds query parameters from its search and filter state.
2. `src/api/listings.js` calls `GET /api/listings` through the shared Axios client.
3. Express routes the request to `getListings`.
4. The controller validates supported filter values, builds a MongoDB query, sorts and paginates it.
5. Mongoose reads matching documents from MongoDB and returns `{ listings, pagination }`.
6. React renders cards and links each card to `/listings/:id`.
7. The detail page requests `GET /api/listings/:id` and displays the returned listing.

### Signup and login flow

1. Signup sends `{ name, email, password, role }`; role is `student` or `owner`.
2. The API validates input, hashes the password with bcrypt, and stores a user document.
3. Login checks the password against the stored hash.
4. Signup/login return `{ token, user }`. The frontend stores both in browser `localStorage`.
5. Axios adds the token as a Bearer authorization header to subsequent API requests.
6. Protected frontend routes check for a saved token/user and role. For owner listing endpoints, the backend independently verifies the JWT and owner role.

### Owner listing flow

1. The owner fills out the dashboard form.
2. The frontend sends `POST /api/listings` with listing data and the bearer token.
3. `requireAuth` validates the token and `requireRole('owner')` checks the role.
4. The controller validates fields, associates the authenticated user as owner, then saves the listing through Mongoose.
5. The new listing is returned to the dashboard and is also available through public listing search/detail endpoints.

## Repository structure

```text
HousingRadar/
├── index.html                       # Browser entry HTML and page metadata
├── package.json                    # Frontend scripts and dependencies
├── vite.config.js                  # React and Tailwind Vite plugins
├── src/
│   ├── main.jsx                    # React root, BrowserRouter, global CSS
│   ├── App.jsx                     # Routes and homepage search/filter state
│   ├── index.css                   # Application styles and responsive layouts
│   ├── api/
│   │   ├── axios.js                # Axios base URL and token interceptor
│   │   ├── auth.js                 # Signup/login requests
│   │   └── listings.js             # Listing API requests
│   ├── components/
│   │   ├── AccountBanner.jsx       # Signed-in identity and sign-out action
│   │   ├── ChatbotWidget.jsx       # Non-connected chatbot preview UI
│   │   ├── ListingCard.jsx         # Search result card
│   │   ├── Navbar.jsx              # Responsive navigation
│   │   └── ProtectedRoute.jsx      # Client-side role route check
│   ├── data/
│   │   └── listings.js             # Sample data used by the seed script
│   └── pages/
│       ├── DashboardPage.jsx       # Owner create form and own listings
│       ├── ListingDetailPage.jsx  # Listing details, contact, map link
│       └── auth/
│           ├── Login.jsx
│           └── Signup.jsx
└── backend/
    ├── package.json                # API scripts and dependencies
    ├── .env.example                # Environment variable template
    ├── README.md                   # Backend-specific setup and API notes
    └── src/
        ├── app.js                  # Express middleware, health check, routes/errors
        ├── server.js               # Environment checks, Mongo connection, listener
        ├── models/
        │   ├── Listing.js          # Listing schema and indexes
        │   └── User.js             # User schema
        ├── controllers/
        │   ├── authController.js   # Signup, login, current-user handlers
        │   ├── listingController.js # Public search and listing detail
        │   └── ownerListingController.js # Owner create/list-own handlers
        ├── middleware/
        │   ├── requireAuth.js      # JWT verification
        │   └── requireRole.js      # Role authorization
        ├── routes/
        │   ├── authRoutes.js
        │   └── listingRoutes.js
        ├── data/
        │   └── boysAccommodations.json # Workbook-derived directory records
        ├── seedListings.js         # Inserts demo sample listings if DB is empty
        └── importAccommodationData.js # Upserts workbook-derived demo listings
```

## Run locally

### Requirements

- Node.js 20 or newer (the backend declares this requirement).
- npm.
- A MongoDB database, for example a MongoDB Atlas cluster or local MongoDB instance.

### 1. Configure the backend

In a terminal:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set a real MongoDB connection string and a long random JWT secret. Do not commit `.env` or paste database credentials into source files.

Example shape only (replace every placeholder):

```dotenv
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
JWT_SECRET=<a-random-secret-at-least-32-characters-long>
CLIENT_ORIGINS=http://localhost:5173
```

Start the backend in this terminal:

```bash
npm run dev
```

Expected API address: `http://localhost:5000`. Check `http://localhost:5000/api/health`; it should return `{"status":"ok"}`. A successful startup also logs that MongoDB is connected.

### 2. Start the frontend

Open a second terminal from the repository root:

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

The frontend defaults to `http://localhost:5000/api`. To use a different API URL, create a root `.env` file with:

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_EMBED_API_KEY=your_restricted_maps_embed_key
```

The stay detail page embeds a map using the listing address. When `VITE_GOOGLE_MAPS_EMBED_API_KEY` is set, the embed shows driving directions from College of Engineering Chengannur and Google displays route distance/travel time. Create and restrict a Google Maps Embed API key to your site's referrer and the Maps Embed API. The key is used in the browser and must be restricted; do not use a server-side secret here. Without a key, the page still shows a basic address map and an external directions link.

Restart Vite after changing environment variables. Copy `.env.example` to `.env` in the project root to configure frontend values.

### 3. Optional: add listings

The supplied directory importer is run from `backend/` after `.env` has been configured:

```bash
npm run import-accommodation-data
```

The optional sample seeder is also run from `backend/`:

```bash
npm run seed
```

The seed script inserts sample records only when the listing collection is empty. The workbook importer is repeatable and updates records by `sourceKey`.

## Environment variables

| Variable | Used by | Required | Description |
| --- | --- | --- | --- |
| `MONGODB_URI` | Backend | Yes | MongoDB connection string. Keep credentials private. |
| `JWT_SECRET` | Backend | Yes | Secret used to sign and verify JWTs; backend requires at least 32 characters. |
| `PORT` | Backend | No | API port; defaults to `5000`. |
| `CLIENT_ORIGINS` | Backend | No | Comma-separated allowed browser origins; defaults to localhost Vite origins on ports 5173. |
| `VITE_API_URL` | Frontend | No | API base URL; defaults to `http://localhost:5000/api`. |

## API reference

All routes use the `/api` prefix and JSON request/response bodies. The backend uses bearer JWTs for protected routes.

### Health

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Basic API health check. |

### Authentication

| Method | Endpoint | Auth | Request body / behavior |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | No | `{ "name", "email", "password", "role" }`. Role must be `student` or `owner`. Returns `{ token, user }`. |
| `POST` | `/api/auth/login` | No | `{ "email", "password" }`. Returns `{ token, user }`. |
| `GET` | `/api/auth/me` | Bearer JWT | Returns the authenticated public user. |

The public user shape is `{ id, name, email, role }`. Password hashes are never returned. Signup requires a password of at least 8 characters (maximum 72 UTF-8 bytes). Tokens expire after seven days.

### Listings

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/listings` | No | Search/filter/sort/paginate public stays. |
| `GET` | `/api/listings/:id` | No | Fetch a listing by MongoDB ID or slug. |
| `GET` | `/api/listings/mine` | Owner JWT | List the authenticated owner's listings (up to 100). |
| `POST` | `/api/listings` | Owner JWT | Create a listing owned by the authenticated owner. |
| `PUT` | `/api/listings/:id` | Owner JWT | Update an owned listing's details and current availability. |
| `DELETE` | `/api/listings/:id` | Owner JWT | Delete an owned listing. |
| `PATCH` | `/api/listings/:id/status` | Owner JWT | Set `{ "isActive": true }` or `{ "isActive": false }` for an owned listing. |
| `GET` | `/api/listings/:listingId/reviews` | No | List verified reviews for one stay. |

### Bookings, reviews, and complaints

Student JWT required:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/bookings/listings/:listingId` | Request rooms for a date range. |
| `GET` | `/api/bookings/mine` | View requests, reviews, and complaint responses. |
| `PATCH` | `/api/bookings/:id/cancel` | Cancel a pending request or confirmed booking before it starts. |
| `POST` | `/api/bookings/:bookingId/reviews` | Leave one review after the owner marks the stay complete. |
| `POST` | `/api/bookings/:bookingId/complaints` | Report an issue on a confirmed or completed booking. |

Owner JWT required:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/owner/bookings` | View booking requests and occupied-room totals. |
| `PATCH` | `/api/owner/bookings/:id` | Confirm/reject a request or mark an ended stay complete. |
| `GET` | `/api/owner/reviews` | View reviews for owned properties. |
| `GET` | `/api/owner/complaints` | View booked guests' complaints. |
| `PATCH` | `/api/owner/complaints/:id` | Update complaint status and owner response. |

`GET /api/listings` query parameters:

| Parameter | Example | Behavior |
| --- | --- | --- |
| `search` | `?search=wifi` | Text match on name, description, label, and location fields. |
| `location` | `?location=Chengannur` | Match area, city, or address. |
| `propertyType` | `?propertyType=hostel` | One of `hostel`, `pg`, `hotel`, `lodge`. |
| `rateUnit` | `?rateUnit=month` | `month` or `night`. |
| `minPrice`, `maxPrice` | `?minPrice=3000&maxPrice=7000` | Inclusive numeric price limits. |
| `amenities` | `?amenities=Wi-Fi,Laundry` | Comma-separated amenities; all listed values must match. |
| `available` | `?available=true` | Filter by availability boolean. |
| `sort` | `?sort=priceAsc` | `newest` (default), `priceAsc`, `priceDesc`, or `rating`. |
| `page`, `limit` | `?page=1&limit=6` | Pagination. Page starts at 1; limit is clamped to 4–8, default 6. |

Search response shape:

```json
{
  "listings": [],
  "pagination": { "page": 1, "limit": 6, "total": 0, "pages": 0 }
}
```

Create listing request fields include `name`, `propertyType`, `description`, `location` (`area`, `city`, optional `address`), `price`, `priceUnit` (`month` or `night`), `roomType`, `availableRooms`, optional `amenities` and `photos` arrays, optional `contactPhone`, and `available` boolean.

## MongoDB data model

### User

- `name`: display name.
- `email`: normalized, unique email address.
- `passwordHash`: bcrypt hash; excluded from normal query results.
- `role`: `student` or `owner`.
- `createdAt`, `updatedAt`: Mongoose timestamps.

### Listing

- `name`, unique `slug`, `propertyType`, `typeLabel`, `description`.
- `location`: `area`, `city`, optional `address`, optional latitude/longitude coordinates.
- `price`, `priceUnit` (`night` or `month`), `roomType`.
- `amenities`: string array; `photos`: URL string array.
- `available`, `availableRooms`.
- `isActive`: whether the listing is publicly visible; owners can deactivate it during maintenance.
- `rating`, `reviewCount` (recalculated when a verified review is submitted).
- `owner`: reference to a user, null for imported/demo records.
- `ownerDetails`: optional public name and phone list.
- `sourceKey`: sparse unique key used by workbook import.
- `isDemo`: identifies sample or placeholder listing data.
- `createdAt`, `updatedAt`: Mongoose timestamps.

### Booking, Review, and Complaint

- A booking links a student, owner, and listing; records requested rooms, stay dates, and a status (`pending`, `confirmed`, `rejected`, `completed`, or `cancelled`).
- For room-map listings, a request creates a date-specific room hold. Rejection, cancellation, or completion releases it; pending holds do not currently expire automatically.
- A review links to one completed booking; a unique booking index prevents duplicate reviews.
- A complaint links to a confirmed or completed booking and stores its category, message, status, and owner response.

## Accommodation data and demo records

The supplied workbook directory is represented as `backend/src/data/boysAccommodations.json`; it is not read from the Excel workbook at application runtime. The importer generates listing names and placeholder monthly prices (₹3,000–₹7,000), amenities, photos, room type, and room counts. Workbook-derived owner/address/phone fields are preserved when provided. These generated listing details are demo data and must be confirmed before real-world use.

Imported records are keyed by their workbook source row through `sourceKey`, so rerunning the import updates those records rather than adding another copy. Imported records are not associated with an owner account unless the importer is changed to link them.

## Security and current limitations

- Keep `backend/.env` private. Never commit MongoDB credentials or a real JWT secret.
- Passwords are hashed before storage. Protected API endpoints verify the JWT on the server; owner listing endpoints also check the role.
- The frontend route guard is a user experience feature, not a security boundary. The backend remains responsible for access checks.
- JWT and user information are currently stored in `localStorage`; this is convenient for a prototype but is exposed to JavaScript running in the page. Review session storage and XSS protections before production use.
- CORS is restricted to configured origins. Set `CLIENT_ORIGINS` to the deployed frontend origin(s) in production.
- Listing photos are currently external URLs. There is no upload service or image moderation.
- Pending and confirmed room-map bookings block the selected rooms for overlapping dates. Pending requests have no automatic expiry, and there is no payment flow.
- Demo records may show generated prices, photos, amenities, and room counts. Treat them as samples, not verified claims.
- There is no password reset/email verification, notification delivery, or chatbot backend yet. Booking updates span multiple MongoDB documents without a transaction, so production use needs stronger transaction handling and automated coverage.

## Suggested implementation order

1. Add booking notifications and a destination field for map routes.
2. Add automatic expiry for unanswered room requests and automated booking-flow tests.
3. Implement and connect the Spring AI RAG service; replace the preview chatbot panel with working chat.
4. Add password recovery, email verification, image uploads, deployment configuration, and production data validation.

---

HousingRadar is an academic prototype. Confirm all property, availability, contact, and price details directly with the listing owner before relying on them.
