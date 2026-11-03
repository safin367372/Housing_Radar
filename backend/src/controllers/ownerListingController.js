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

function readRoomTypes(input, legacy = {}) {
  let values = input
  if (typeof values === 'string') {
    try { values = JSON.parse(values) } catch { return { error: 'Room types must be valid.' } }
  }
  if (!Array.isArray(values) || values.length < 1 || values.length > 20) return { error: 'Add between 1 and 20 room types.' }
  const types = []
  for (const [index, item] of values.entries()) {
    const name = cleanString(item?.name)
    const price = Number(item?.price)
    const priceUnit = cleanString(item?.priceUnit)
    const capacity = Number(item?.capacity)
    const totalRooms = Number(item?.totalRooms)
    const key = cleanString(item?.key) || (index === 0 && legacy.key ? legacy.key : randomUUID().replaceAll('-', '').slice(0, 8))
    if (!/^[a-zA-Z0-9_-]{1,12}$/.test(key) || name.length < 1 || name.length > 80) return { error: 'Each room type needs a name under 80 characters.' }
    if (!Number.isInteger(price) || price < 1 || price > 10000000) return { error: 'Each room type price must be between ₹1 and ₹1,00,00,000.' }
    if (!priceUnits.has(priceUnit)) return { error: 'Choose a monthly or nightly price for every room type.' }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return { error: 'Room capacity must be from 1 to 20.' }
    if (!Number.isInteger(totalRooms) || totalRooms < 1 || totalRooms > 999) return { error: 'Each room type must have 1 to 999 rooms.' }
    types.push({ key, name, price, priceUnit, capacity, totalRooms, amenities: listValues(item?.amenities, 20, 60) })
  }
  if (new Set(types.map(type => type.key)).size !== types.length) return { error: 'Each room type needs a unique key.' }
  if (new Set(types.map(type => type.priceUnit)).size > 1) return { error: 'Use the same price period for every room type in a listing.' }
  return { types }
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
    const guestPolicy = ['hostel', 'pg'].includes(propertyType) ? (cleanString(body.guestPolicy) || 'all') : 'all'
    const description = cleanString(body.description)
    const area = cleanString(body.location?.area)
    const city = cleanString(body.location?.city)
    const address = cleanString(body.location?.address)
    const coordinates = readCoordinates(body.location?.coordinates)
    const roomTypesResult = readRoomTypes(body.roomTypes || [{ key: 'legacy', name: body.roomType, price: body.price, priceUnit: body.priceUnit, capacity: 1, totalRooms: body.availableRooms, amenities: [] }])
    if (roomTypesResult.error) return res.status(400).json({ message: roomTypesResult.error })
    const roomTypes = roomTypesResult.types
    const price = Math.min(...roomTypes.map(type => type.price))
    const priceUnit = roomTypes[0].priceUnit
    const roomType = roomTypes[0].name
    const availableRooms = roomTypes.reduce((sum, type) => sum + type.totalRooms, 0)

    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: 'Listing name must be between 2 and 120 characters.' })
    if (!propertyTypes.has(propertyType)) return res.status(400).json({ message: 'Choose hostel, PG, hotel, or lodge.' })
    if (!['all', 'men', 'women', 'mixed'].includes(guestPolicy)) return res.status(400).json({ message: 'Choose who this hostel or PG accepts.' })
    if (description.length < 10 || description.length > 3000) return res.status(400).json({ message: 'Description must be between 10 and 3,000 characters.' })
    if (!area || area.length > 100 || !city || city.length > 100 || address.length > 300) return res.status(400).json({ message: 'Add a valid area and city. Address must be under 300 characters.' })
    if (coordinates === null) return res.status(400).json({ message: 'Enter both a valid latitude and longitude for the map pin.' })
    if (availableRooms > 999) return res.status(400).json({ message: 'The total number of rooms across types cannot exceed 999.' })

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
      guestPolicy,
      typeLabel: propertyType === 'pg' ? 'Paying guest' : propertyType[0].toUpperCase() + propertyType.slice(1),
      description,
      location: { area, city, address, ...(coordinates ? { coordinates } : {}) },
      price,
      priceUnit,
      roomType,
      roomTypes,
      amenities,
      photos,
      available: body.available !== false && availableRooms > 0,
      availableRooms,
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
    const guestPolicy = ['hostel', 'pg'].includes(propertyType) ? (cleanString(body.guestPolicy) || 'all') : 'all'
    const description = cleanString(body.description)
    const area = cleanString(body.location?.area)
    const city = cleanString(body.location?.city)
    const address = cleanString(body.location?.address)
    const coordinates = readCoordinates(body.location?.coordinates)
    const roomTypesResult = readRoomTypes(body.roomTypes || [{ key: 'legacy', name: body.roomType, price: body.price, priceUnit: body.priceUnit, capacity: 1, totalRooms: body.availableRooms, amenities: [] }])
    if (roomTypesResult.error) return res.status(400).json({ message: roomTypesResult.error })
    const roomTypes = roomTypesResult.types
    const price = Math.min(...roomTypes.map(type => type.price))
    const priceUnit = roomTypes[0].priceUnit
    const roomType = roomTypes[0].name
    const availableRooms = roomTypes.reduce((sum, type) => sum + type.totalRooms, 0)

    if (name.length < 2 || name.length > 120) return res.status(400).json({ message: 'Listing name must be between 2 and 120 characters.' })
    if (!propertyTypes.has(propertyType)) return res.status(400).json({ message: 'Choose hostel, PG, hotel, or lodge.' })
    if (!['all', 'men', 'women', 'mixed'].includes(guestPolicy)) return res.status(400).json({ message: 'Choose who this hostel or PG accepts.' })
    if (description.length < 10 || description.length > 3000) return res.status(400).json({ message: 'Description must be between 10 and 3,000 characters.' })
    if (!area || area.length > 100 || !city || city.length > 100 || address.length > 300) return res.status(400).json({ message: 'Add a valid area and city. Address must be under 300 characters.' })
    if (coordinates === null) return res.status(400).json({ message: 'Enter both a valid latitude and longitude for the map pin.' })
    if (availableRooms > 999) return res.status(400).json({ message: 'The total number of rooms across types cannot exceed 999.' })

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
    const activeBookings = await Booking.find({ listing: listing._id, status: { $in: ['pending', 'confirmed'] }, selectedRoomIds: { $ne: [] } }).select('roomTypeKey selectedRoomIds').lean()
    for (const booking of activeBookings) {
      const roomTypeData = roomTypes.find(type => type.key === (booking.roomTypeKey || 'legacy'))
      if (!roomTypeData) return res.status(409).json({ message: 'A room type with an open booking cannot be removed. Resolve its bookings first.' })
      const highestIndex = Math.max(...booking.selectedRoomIds.map(id => Number(id.split('-').at(-1)) || 0))
      if (highestIndex > roomTypeData.totalRooms) return res.status(409).json({ message: 'Room count cannot be reduced below rooms with open booking requests.' })
    }

    listing.name = name
    listing.propertyType = propertyType
    listing.guestPolicy = guestPolicy
    listing.typeLabel = propertyType === 'pg' ? 'Paying guest' : propertyType[0].toUpperCase() + propertyType.slice(1)
    listing.description = description
    listing.location = { ...listing.location.toObject(), area, city, address, coordinates }
    listing.price = price
    listing.priceUnit = priceUnit
    listing.roomType = roomType
    listing.roomTypes = roomTypes
    listing.amenities = amenities
    listing.photos = photos
    listing.available = body.available !== false && availableRooms > 0
    listing.availableRooms = availableRooms
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
