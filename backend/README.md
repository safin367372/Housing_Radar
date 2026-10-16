# HousingRadar API

Express API for authentication and public property listings. User passwords are stored as bcrypt hashes, and listing photos are URL references.

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

List responses contain listings and pagination metadata. Detail responses contain a listing.

The existing frontend sample listings are marked isDemo and are only inserted into an empty listings collection. From this folder, run npm run seed to add them to MongoDB. The seed command skips insertion whenever any listing already exists.

## Boys' accommodation workbook import

The workbook-derived directory is stored in `src/data/boysAccommodations.json`. Run `npm run import-accommodation-data` from the backend folder to add or update those 40 records in MongoDB. The import is repeatable and keyed by the source row. Workbook owner names, addresses, and available phone numbers are preserved; hostel titles, monthly prices (₹3,000–₹7,000), availability, photos, descriptions, and amenities are demo values and should be confirmed before real use.
