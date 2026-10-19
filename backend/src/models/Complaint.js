import mongoose from 'mongoose'

const complaintSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['room', 'cleanliness', 'facilities', 'conduct', 'billing', 'other'], default: 'other' },
  message: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  status: { type: String, enum: ['open', 'in_review', 'resolved'], default: 'open', index: true },
  ownerResponse: { type: String, trim: true, maxlength: 2000, default: '' },
}, { timestamps: true })

complaintSchema.set('toJSON', {
  transform(document, result) {
    result.id = result._id.toString()
    delete result._id
    delete result.__v
    return result
  },
})

export default mongoose.model('Complaint', complaintSchema)
