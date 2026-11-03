import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  area: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  address: { type: String, trim: true, default: '' },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
}, { _id: false })

const ownerDetailsSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  phones: [{ type: String, trim: true }],
}, { _id: false })

const roomTypeSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 12 },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  price: { type: Number, required: true, min: 1 },
  priceUnit: { type: String, required: true, enum: ['night', 'month'] },
  capacity: { type: Number, required: true, min: 1, max: 20 },
  totalRooms: { type: Number, required: true, min: 1, max: 999 },
  amenities: [{ type: String, trim: true, maxlength: 60 }],
}, { _id: false })

const roomHoldSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  roomIds: [{ type: String, trim: true, maxlength: 20 }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { _id: false })

const listingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  propertyType: {
    type: String,
    required: true,
    enum: ['hostel', 'pg', 'hotel', 'lodge'],
    index: true,
  },
  guestPolicy: { type: String, enum: ['all', 'men', 'women', 'mixed'], default: 'all', index: true },
  typeLabel: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  location: { type: locationSchema, required: true },
  price: { type: Number, required: true, min: 0 },
  priceUnit: { type: String, required: true, enum: ['night', 'month'], index: true },
  roomType: { type: String, required: true, trim: true, maxlength: 80 },
  roomTypes: { type: [roomTypeSchema], default: [] },
  amenities: [{ type: String, trim: true, maxlength: 60 }],
  photos: [{ type: String, trim: true }],
  available: { type: Boolean, default: true, index: true },
  availableRooms: { type: Number, default: 0, min: 0, max: 999 },
  isActive: { type: Boolean, default: true, index: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  ownerDetails: { type: ownerDetailsSchema, default: undefined },
  sourceKey: { type: String, unique: true, sparse: true },
  isDemo: { type: Boolean, default: false },
  roomHolds: { type: [roomHoldSchema], default: [] },
}, { timestamps: true })

listingSchema.index({ propertyType: 1, priceUnit: 1, price: 1 })
listingSchema.set('toJSON', {
  transform(document, result) {
    result.id = result._id.toString()
    delete result._id
    delete result.__v
    delete result.roomHolds
    return result
  },
})

export default mongoose.model('Listing', listingSchema)
