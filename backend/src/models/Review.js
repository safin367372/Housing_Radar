import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 2000, default: '' },
}, { timestamps: true })

reviewSchema.set('toJSON', {
  transform(document, result) {
    result.id = result._id.toString()
    delete result._id
    delete result.__v
    return result
  },
})

export default mongoose.model('Review', reviewSchema)
