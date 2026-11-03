import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rooms: { type: Number, required: true, min: 1, max: 20 },
  selectedRoomIds: [{ type: String, trim: true, maxlength: 24 }],
  roomTypeKey: { type: String, trim: true, maxlength: 12, default: '' },
  roomTypeName: { type: String, trim: true, maxlength: 80, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'], default: 'pending', index: true },
  statusNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true })

bookingSchema.set('toJSON', {
  transform(document, result) {
    result.id = result._id.toString()
    delete result._id
    delete result.__v
    return result
  },
})

export default mongoose.model('Booking', bookingSchema)
