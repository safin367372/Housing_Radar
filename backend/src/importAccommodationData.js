import 'dotenv/config'
import mongoose from 'mongoose'
import Listing from './models/Listing.js'
import fs from 'node:fs'

const records = JSON.parse(fs.readFileSync(new URL('./data/boysAccommodations.json', import.meta.url), 'utf8'))

const amenitiesByRow = [
  ['Wi-Fi', 'Meals', 'Laundry'],
  ['Wi-Fi', 'Study room', 'Power backup'],
  ['Meals', 'Parking', 'Common area'],
  ['Wi-Fi', 'CCTV', 'Laundry'],
  ['Study room', 'Meals', '24-hour access'],
]
const photoIds = [
  'photo-1555854877-bab0e564b8d5', 'photo-1522708323590-d24dbb6b0267',
  'photo-1564013799919-ab600027ffc6', 'photo-1566073771259-6a8506099945',
  'photo-1611892440504-42a792e24d32',
]

function titleCase(value) {
  return value.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

function generatedName(address) {
  const flat = address.replace(/\s+/g, ' ').trim()
  const known = flat.match(/(?:[\w’'-]+\s+){0,2}(?:hostel|hotel|lodge)\b/i)
  if (known) return titleCase(known[0].trim())
  let place = flat.split(/,|\n|\bnear\b|\bbehind\b/i).map(part => part.trim()).find(Boolean) || 'Chengannur'
  place = place.replace(/\b(?:chengannur|kerala|india|alappuzha|689\d{3})\b/ig, '').trim()
  place = place.split(/\s+/).slice(0, 4).join(' ').replace(/[.]+$/,'').trim() || 'Chengannur'
  return 'Boys Hostel near ' + titleCase(place)
}

function makeRecord(row, index) {
  const name = generatedName(row.address)
  const lines = row.address.split(/[\n,]+/).map(part => part.trim()).filter(Boolean)
  const area = (lines[0] || 'Chengannur').slice(0, 100)
  const price = 3000 + ((index * 997) % 4001)
  const rowId = String(row.sourceRow).replace(/[^a-z0-9-]/gi, '').toLowerCase()
  const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70)
  return {
    name,
    slug: 'boys-accommodation-' + rowId + '-' + slugName,
    sourceKey: 'boys-accommodation-row-' + rowId,
    propertyType: 'hostel',
    typeLabel: 'Boys hostel · sample listing',
    description: 'A boys’ hostel in ' + area + ', Chengannur. Contact the owner for details about room options, amenities, and current availability.',
    location: { area, city: 'Chengannur', address: row.address },
    price,
    priceUnit: 'month',
    roomType: ['Shared room', '2 sharing', '3 sharing', '4 sharing'][index % 4],
    amenities: amenitiesByRow[index % amenitiesByRow.length],
    photos: [0, 1, 2].map(offset => 'https://images.unsplash.com/' + photoIds[(index + offset) % photoIds.length] + '?auto=format&fit=crop&w=1200&q=85'),
    available: true,
    availableRooms: 1 + ((index * 7) % 9),
    isActive: true,
    rating: 0,
    reviewCount: 0,
    ownerDetails: { name: row.ownerName, phones: row.phones },
    isDemo: true,
  }
}

try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing; configure backend/.env first.')
  await mongoose.connect(process.env.MONGODB_URI)
  const operations = records.map((row, index) => {
    const listing = makeRecord(row, index)
    return {
      updateOne: {
        filter: { sourceKey: listing.sourceKey },
        update: { $set: listing },
        upsert: true,
      },
    }
  })
  const result = await Listing.bulkWrite(operations, { ordered: false })
  console.log('Accommodation import complete:', result.upsertedCount, 'added and', result.modifiedCount, 'updated.')
} catch (error) {
  console.error('Could not import accommodation data:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
