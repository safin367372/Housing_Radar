import { randomUUID } from 'node:crypto'
import Listing from '../models/Listing.js'
import User from '../models/User.js'

const propertyTypes = new Set(['hostel', 'pg', 'hotel', 'lodge'])
const priceUnits = new Set(['night', 'month'])

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function listValues(value, maxItems, maxLength) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : []
  return values.map(item => cleanString(item)).filter(Boolean).slice(0, maxItems).map(item => item.slice(0, maxLength))
}

export async function getMyListings(req, res, next) {
  try {
    const listings = await Listing.find({ owner: req.auth.userId }).sort({ createdAt: -1 }).limit(100)
    return res.json({ listings: listings.map(listing => listing.toJSON()) })
  } catch (error) {
    return next(error)
  }
}

export async function createListing(req, res, next) {
  try {
    const body = req.body || {}
    const name = cleanString(body.name)
    const propertyType = cleanString(body.propertyType).toLowerCase()
    const description = cleanString(body.description)
    const area = cleanString(body.location?.area)
    const city = cleanString(body.location?.city)
    const address = cleanString(body.location?.address)
    const roomType = cleanString(body.roomType)
    const price = Number(body.price)
    const priceUnit = cleanString(body.priceUnit)
    const availableRooms = Number(body.availableRooms)

    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: 'Listing name must be between 2 and 120 characters.' })
    if (!propertyTypes.has(propertyType)) return res.status(400).json({ message: 'Choose hostel, PG, hotel, or lodge.' })
    if (description.length < 10 || description.length > 3000) return res.status(400).json({ message: 'Description must be between 10 and 3,000 characters.' })
    if (!area || area.length > 100 || !city || city.length > 100 || address.length > 300) return res.status(400).json({ message: 'Add a valid area and city. Address must be under 300 characters.' })
    if (!Number.isInteger(price) || price < 1 || price > 10000000) return res.status(400).json({ message: 'Price must be a whole number between ₹1 and ₹1,00,00,000.' })
    if (!priceUnits.has(priceUnit)) return res.status(400).json({ message: 'Choose a monthly or nightly price.' })
    if (!roomType || roomType.length > 80) return res.status(400).json({ message: 'Add a room type under 80 characters.' })
    if (!Number.isInteger(availableRooms) || availableRooms < 0 || availableRooms > 999) return res.status(400).json({ message: 'Available rooms must be a whole number from 0 to 999.' })

    const amenities = listValues(body.amenities, 20, 60)
    const photos = listValues(body.photos, 8, 500)
    for (const photo of photos) {
      try {
        const parsed = new URL(photo)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol')
      } catch {
        return res.status(400).json({ message: 'Each photo must be a valid http or https URL.' })
      }
    }

    const phone = cleanString(body.contactPhone)
    if (phone && !/^\+?[\d\s().-]{7,20}$/.test(phone)) return res.status(400).json({ message: 'Enter a valid contact phone number.' })
    const owner = await User.findById(req.auth.userId)
    if (!owner || owner.role !== 'owner') return res.status(401).json({ message: 'Your owner account could not be verified. Please sign in again.' })

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'stay'
    const listing = await Listing.create({
      name,
      slug: slugBase + '-' + randomUUID().slice(0, 8),
      propertyType,
      typeLabel: propertyType === 'pg' ? 'Paying guest' : propertyType[0].toUpperCase() + propertyType.slice(1),
      description,
      location: { area, city, address },
      price,
      priceUnit,
      roomType,
      amenities,
      photos,
      available: body.available !== false && availableRooms > 0,
      availableRooms: body.available === false ? 0 : availableRooms,
      owner: owner._id,
      ownerDetails: { name: owner.name, phones: phone ? [phone] : [] },
      isDemo: false,
    })

    return res.status(201).json({ listing: listing.toJSON() })
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check the listing details and try again.' })
    return next(error)
  }
}
