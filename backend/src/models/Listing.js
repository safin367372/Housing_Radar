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

const listingSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  propertyType: {
    type: String,
    required: true,
    enum: ['hostel', 'pg', 'hotel', 'lodge'],
    index: true,
  },
  typeLabel: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  location: { type: locationSchema, required: true },
  price: { type: Number, required: true, min: 0 },
  priceUnit: { type: String, required: true, enum: ['night', 'month'], index: true },
  roomType: { type: String, required: true, trim: true, maxlength: 80 },
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
}, { timestamps: true })

listingSchema.index({ propertyType: 1, priceUnit: 1, price: 1 })
listingSchema.set('toJSON', {
  transform(document, result) {
    result.id = result._id.toString()
    delete result._id
    delete result.__v
    return result
  },
})

export default mongoose.model('Listing', listingSchema)
