import mongoose from 'mongoose'
import Listing from '../models/Listing.js'

function escapeRegex(value) {
  return value.replace(/[.*+?^$|{}()[\]\\]/g, '\\$&')
}

function numberParam(value, name, res) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    res.status(400).json({ message: name + ' must be a non-negative whole number.' })
    return null
  }
  return parsed
}

export async function getListings(req, res, next) {
  try {
    // Treat older records without isActive as active until they are migrated.
    const filter = { isActive: { $ne: false } }
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
    const location = typeof req.query.location === 'string' ? req.query.location.trim().slice(0, 100) : ''

    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { name: pattern },
        { description: pattern },
        { typeLabel: pattern },
        { 'location.area': pattern },
        { 'location.city': pattern },
        { 'location.address': pattern },
      ]
    }
    if (location) {
      const pattern = new RegExp(escapeRegex(location), 'i')
      filter.$and = (filter.$and || []).concat([{
        $or: [
          { 'location.area': pattern },
          { 'location.city': pattern },
          { 'location.address': pattern },
        ],
      }])
    }

    if (req.query.propertyType) {
      const allowed = ['hostel', 'pg', 'hotel', 'lodge']
      if (!allowed.includes(req.query.propertyType)) {
        return res.status(400).json({ message: 'propertyType must be hostel, pg, hotel, or lodge.' })
      }
      filter.propertyType = req.query.propertyType
    }
    if (req.query.rateUnit) {
      if (!['night', 'month'].includes(req.query.rateUnit)) {
        return res.status(400).json({ message: 'rateUnit must be night or month.' })
      }
      filter.priceUnit = req.query.rateUnit
    }
    if (req.query.available !== undefined) {
      if (!['true', 'false'].includes(req.query.available)) {
        return res.status(400).json({ message: 'available must be true or false.' })
      }
      filter.available = req.query.available === 'true'
    }
    if (req.query.amenities) {
      const amenities = String(req.query.amenities).split(',').map(value => value.trim()).filter(Boolean).slice(0, 15)
      if (amenities.length) filter.amenities = { $all: amenities }
    }

    const minimum = numberParam(req.query.minPrice, 'minPrice', res)
    if (minimum === null) return
    const maximum = numberParam(req.query.maxPrice, 'maxPrice', res)
    if (maximum === null) return
    if (minimum !== undefined || maximum !== undefined) {
      filter.price = {}
      if (minimum !== undefined) filter.price.$gte = minimum
      if (maximum !== undefined) filter.price.$lte = maximum
    }
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      return res.status(400).json({ message: 'minPrice cannot be greater than maxPrice.' })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(8, Math.max(4, Number.parseInt(req.query.limit, 10) || 6))
    const sortOptions = {
      newest: { createdAt: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      rating: { rating: -1, reviewCount: -1 },
    }
    const sort = sortOptions[req.query.sort] || sortOptions.newest
    const [total, documents] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    ])

    return res.json({
      listings: documents.map(document => document.toJSON()),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return next(error)
  }
}

export async function getListingById(req, res, next) {
  try {
    const value = req.params.id
    const lookup = mongoose.isValidObjectId(value) ? { _id: value } : { slug: value.toLowerCase() }
    const listing = await Listing.findOne({ ...lookup, isActive: { $ne: false } })
    if (!listing) return res.status(404).json({ message: 'Stay not found.' })
    return res.json({ listing: listing.toJSON() })
  } catch (error) {
    return next(error)
  }
}
