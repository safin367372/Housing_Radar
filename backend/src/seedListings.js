import 'dotenv/config'
import mongoose from 'mongoose'
import Listing from './models/Listing.js'
import { listings as examples } from '../../src/data/listings.js'

function toSeedRecord(item) {
  const lowerType = item.type.toLowerCase()
  const propertyType = lowerType.includes('hostel') ? 'hostel'
    : lowerType.includes('pg') ? 'pg'
      : lowerType.includes('hotel') ? 'hotel' : 'lodge'
  const locationParts = item.area.split(',').map(part => part.trim())
  const nameSlug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return {
    name: item.name,
    slug: nameSlug,
    propertyType,
    typeLabel: item.type,
    description: 'Sample listing used to preview HousingRadar while the real property details are being added.',
    location: {
      area: locationParts[0] || 'Area not provided',
      city: locationParts[1] || locationParts[0] || 'City not provided',
      address: '',
    },
    price: item.price,
    priceUnit: item.priceUnit,
    roomType: item.beds,
    amenities: item.tags,
    photos: ['https://images.unsplash.com/' + item.image + '?auto=format&fit=crop&w=1200&q=85'],
    available: item.available,
    availableRooms: item.available ? 1 + ((Number(item.id) * 3) % 9) : 0,
    isActive: true,
    rating: item.rating,
    reviewCount: 0,
    isDemo: true,
  }
}

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing; configure backend/.env first.')
  await mongoose.connect(process.env.MONGODB_URI)
  const existingCount = await Listing.countDocuments()
  if (existingCount > 0) {
    console.log('Listings already exist; no sample records were added.')
  } else {
    const inserted = await Listing.insertMany(examples.map(toSeedRecord))
    console.log('Added ' + inserted.length + ' sample listings.')
  }
} catch (error) {
  console.error('Could not seed listings:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
