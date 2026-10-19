# HousingRadar API

Express API for authentication, accommodation listings, owner-approved bookings, verified reviews, and complaints. User passwords are stored as bcrypt hashes, and listing photos are URL references.

## Set up

1. Copy .env.example to .env and configure MongoDB and JWT_SECRET.
2. Run npm install.
3. Run npm run dev to start the API.

The API listens on port 5000 by default. Local frontend origins on ports 5173 are allowed.

## Auth routes

- POST /api/auth/signup — body: { name, email, password, role }, with role student or owner.
- POST /api/auth/login — body: { email, password }.
- GET /api/auth/me — requires Authorization: Bearer token.

Signup and login return { token, user: { id, name, email, role } }.

## Listing routes

- GET /api/listings — supports search, location, propertyType, rateUnit, minPrice, maxPrice, amenities, available, sort, page, and limit.
- GET /api/listings/:id — fetch by MongoDB ID or slug.
- GET /api/listings/mine — list stays owned by the authenticated owner.
- POST /api/listings — create an owner listing (owner JWT required).
- PUT /api/listings/:id — update an owned listing (owner JWT required).
- DELETE /api/listings/:id — delete an owned listing (owner JWT required).
- PATCH /api/listings/:id/status — activate or deactivate an owned listing with `{ isActive: true|false }` (owner JWT required). Inactive listings are omitted from public search and detail responses.
- GET /api/listings/:listingId/reviews — list verified reviews for a stay.

List responses contain listings and pagination metadata. Detail responses contain a listing.

## Booking, review, and complaint routes

Student JWT required:

- POST /api/bookings/listings/:listingId — request rooms for a date range.
- GET /api/bookings/mine — view the student's requests, reviews, and complaints.
- PATCH /api/bookings/:id/cancel — cancel a pending request or a confirmed booking before its start date.
- POST /api/bookings/:bookingId/reviews — add one review after the owner marks the completed stay.
- POST /api/bookings/:bookingId/complaints — report an issue for a confirmed or completed booking.

Owner JWT required:

- GET /api/owner/bookings — see requests and confirmed room occupancy.
- PATCH /api/owner/bookings/:id — confirm/reject a pending request or mark a stay complete after its end date.
- GET /api/owner/reviews — view reviews for owned stays.
- GET /api/owner/complaints — view reports from booked guests.
- PATCH /api/owner/complaints/:id — update the complaint status and owner response.

Confirming a booking decrements `availableRooms`; completing the stay or cancelling before it starts releases the rooms. Current inventory is not allocated against overlapping dates, pending requests do not place temporary holds, and payment is not implemented.

The existing frontend sample listings are marked isDemo and are only inserted into an empty listings collection. From this folder, run npm run seed to add them to MongoDB. The seed command skips insertion whenever any listing already exists.

## Boys' accommodation workbook import

The workbook-derived directory is stored in `src/data/boysAccommodations.json`. Run `npm run import-accommodation-data` from the backend folder to add or update those 40 records in MongoDB. The import is repeatable and keyed by the source row. Workbook owner names, addresses, and available phone numbers are preserved; hostel titles, monthly prices (₹3,000–₹7,000), availability, photos, descriptions, and amenities are demo values and should be confirmed before real use.
