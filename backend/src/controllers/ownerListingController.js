import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import Listing from '../models/Listing.js'
import User from '../models/User.js'
import Booking from '../models/Booking.js'

const propertyTypes = new Set(['hostel', 'pg', 'hotel', 'lodge'])
const priceUnits = new Set(['night', 'month'])

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function listValues(value, maxItems, maxLength) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : []
  return values.map(item => cleanString(item)).filter(Boolean).slice(0, maxItems).map(item => item.slice(0, maxLength))
}

function readCoordinates(value) {
  const latValue = value?.lat
  const lngValue = value?.lng
  const latEmpty = latValue === '' || latValue === undefined || latValue === null
  const lngEmpty = lngValue === '' || lngValue === undefined || lngValue === null
  if (latEmpty && lngEmpty) return undefined
  if (latEmpty || lngEmpty) return null
  const lat = Number(latValue)
  const lng = Number(lngValue)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return null
  return { lat, lng }
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
    const coordinates = readCoordinates(body.location?.coordinates)
    const roomType = cleanString(body.roomType)
    const price = Number(body.price)
    const priceUnit = cleanString(body.priceUnit)
    const availableRooms = Number(body.availableRooms)

    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: 'Listing name must be between 2 and 120 characters.' })
    if (!propertyTypes.has(propertyType)) return res.status(400).json({ message: 'Choose hostel, PG, hotel, or lodge.' })
    if (description.length < 10 || description.length > 3000) return res.status(400).json({ message: 'Description must be between 10 and 3,000 characters.' })
    if (!area || area.length > 100 || !city || city.length > 100 || address.length > 300) return res.status(400).json({ message: 'Add a valid area and city. Address must be under 300 characters.' })
    if (coordinates === null) return res.status(400).json({ message: 'Enter both a valid latitude and longitude for the map pin.' })
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
      location: { area, city, address, ...(coordinates ? { coordinates } : {}) },
      price,
      priceUnit,
      roomType,
      amenities,
      photos,
      available: body.available !== false && availableRooms > 0,
      availableRooms: body.available === false ? 0 : availableRooms,
      isActive: true,
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

export async function updateListing(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Listing not found.' })
    }

    const body = req.body || {}
    const name = cleanString(body.name)
    const propertyType = cleanString(body.propertyType).toLowerCase()
    const description = cleanString(body.description)
    const area = cleanString(body.location?.area)
    const city = cleanString(body.location?.city)
    const address = cleanString(body.location?.address)
    const coordinates = readCoordinates(body.location?.coordinates)
    const roomType = cleanString(body.roomType)
    const price = Number(body.price)
    const priceUnit = cleanString(body.priceUnit)
    const availableRooms = Number(body.availableRooms)

    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: 'Listing name must be between 2 and 120 characters.' })
    if (!propertyTypes.has(propertyType)) return res.status(400).json({ message: 'Choose hostel, PG, hotel, or lodge.' })
    if (description.length < 10 || description.length > 3000) return res.status(400).json({ message: 'Description must be between 10 and 3,000 characters.' })
    if (!area || area.length > 100 || !city || city.length > 100 || address.length > 300) return res.status(400).json({ message: 'Add a valid area and city. Address must be under 300 characters.' })
    if (coordinates === null) return res.status(400).json({ message: 'Enter both a valid latitude and longitude for the map pin.' })
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

    const listing = await Listing.findOne({ _id: req.params.id, owner: req.auth.userId })
    if (!listing) return res.status(404).json({ message: 'Listing not found.' })

    const owner = await User.findById(req.auth.userId)
    if (!owner || owner.role !== 'owner') return res.status(401).json({ message: 'Your owner account could not be verified. Please sign in again.' })

    listing.name = name
    listing.propertyType = propertyType
    listing.typeLabel = propertyType === 'pg' ? 'Paying guest' : propertyType[0].toUpperCase() + propertyType.slice(1)
    listing.description = description
    listing.location = { ...listing.location.toObject(), area, city, address, coordinates }
    listing.price = price
    listing.priceUnit = priceUnit
    listing.roomType = roomType
    listing.amenities = amenities
    listing.photos = photos
    listing.available = body.available !== false && availableRooms > 0
    listing.availableRooms = listing.available ? availableRooms : 0
    listing.ownerDetails = { name: owner.name, phones: phone ? [phone] : [] }
    listing.isDemo = false

    await listing.save()
    return res.json({ listing: listing.toJSON() })
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check the listing details and try again.' })
    return next(error)
  }
}

export async function deleteListing(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Listing not found.' })
    }

    const ownedListing = await Listing.findOne({ _id: req.params.id, owner: req.auth.userId })
    if (!ownedListing) return res.status(404).json({ message: 'Listing not found.' })
    const hasOpenBookings = await Booking.exists({ listing: ownedListing._id, status: { $in: ['pending', 'confirmed'] } })
    if (hasOpenBookings) return res.status(409).json({ message: 'This stay has pending or active bookings. Resolve them before deleting the listing.' })
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, owner: req.auth.userId })
    if (!listing) return res.status(404).json({ message: 'Listing not found.' })

    return res.json({ message: 'Listing deleted.' })
  } catch (error) {
    return next(error)
  }
}

export async function setListingActive(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Listing not found.' })
    }
    if (typeof req.body?.isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be true or false.' })
    }

    const listing = await Listing.findOne({ _id: req.params.id, owner: req.auth.userId })
    if (!listing) return res.status(404).json({ message: 'Listing not found.' })

    listing.isActive = req.body.isActive
    await listing.save()
    return res.json({ listing: listing.toJSON() })
  } catch (error) {
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Could not update this listing status.' })
    return next(error)
  }
}
