import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import Complaint from '../models/Complaint.js'
import Listing from '../models/Listing.js'
import Review from '../models/Review.js'

function asDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function ownerListingFilter(req, res) {
  const listingId = req.query.listingId
  if (!listingId) return { owner: req.auth.userId }
  if (!mongoose.isValidObjectId(listingId)) {
    res.status(400).json({ message: 'Invalid listing ID.' })
    return null
  }
  const owned = await Listing.exists({ _id: listingId, owner: req.auth.userId })
  if (!owned) {
    res.status(404).json({ message: 'Listing not found.' })
    return null
  }
  return { owner: req.auth.userId, listing: listingId }
}

export async function createBooking(req, res, next) {
  try {
    const listing = await Listing.findOne({ _id: req.params.listingId, isActive: { $ne: false } })
    if (!listing) return res.status(404).json({ message: 'Stay not found.' })
    if (!listing.owner) return res.status(400).json({ message: 'This sample stay is not accepting booking requests yet. Please contact the listing host.' })
    if (!listing.available || listing.availableRooms < 1) return res.status(409).json({ message: 'This stay currently has no rooms available.' })

    const rooms = Number(req.body?.rooms)
    const startDate = asDate(req.body?.startDate)
    const endDate = asDate(req.body?.endDate)
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 20) return res.status(400).json({ message: 'Choose between 1 and 20 rooms.' })
    if (rooms > listing.availableRooms) return res.status(409).json({ message: 'The requested room count is higher than the current availability.' })
    if (!startDate || !endDate || startDate <= new Date() || endDate <= startDate) return res.status(400).json({ message: 'Choose a future start date and an end date after it.' })
    if (endDate - startDate > 366 * 24 * 60 * 60 * 1000) return res.status(400).json({ message: 'A booking request can be at most one year long.' })
    if (message.length > 1000) return res.status(400).json({ message: 'Message must be under 1,000 characters.' })

    const booking = await Booking.create({ listing: listing._id, student: req.auth.userId, owner: listing.owner, rooms, startDate, endDate, message })
    const populated = await Booking.findById(booking._id).populate('listing', 'name slug photos propertyType price priceUnit roomType').populate('owner', 'name')
    return res.status(201).json({ booking: populated.toJSON() })
  } catch (error) {
    return next(error)
  }
}

export async function getMyBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ student: req.auth.userId }).populate('listing', 'name slug photos propertyType price priceUnit roomType').populate('owner', 'name').sort({ createdAt: -1 }).limit(100)
    const reviews = await Review.find({ student: req.auth.userId, booking: { $in: bookings.map(booking => booking._id) } })
    const complaints = await Complaint.find({ student: req.auth.userId, booking: { $in: bookings.map(booking => booking._id) } }).sort({ createdAt: -1 })
    const reviewByBooking = new Map(reviews.map(review => [review.booking.toString(), review.toJSON()]))
    const complaintsByBooking = new Map()
    for (const complaint of complaints) {
      const key = complaint.booking.toString()
      complaintsByBooking.set(key, [...(complaintsByBooking.get(key) || []), complaint.toJSON()])
    }
    return res.json({ bookings: bookings.map(booking => ({ ...booking.toJSON(), review: reviewByBooking.get(booking.id) || null, complaints: complaintsByBooking.get(booking.id) || [] })) })
  } catch (error) {
    return next(error)
  }
}

export async function cancelMyBooking(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Booking not found.' })
    const booking = await Booking.findOne({ _id: req.params.id, student: req.auth.userId })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (!['pending', 'confirmed'].includes(booking.status)) return res.status(409).json({ message: 'This booking can no longer be cancelled.' })
    const wasConfirmed = booking.status === 'confirmed'
    if (wasConfirmed && booking.startDate <= new Date()) return res.status(409).json({ message: 'A confirmed stay cannot be cancelled after its start date.' })
    const cancelled = await Booking.findOneAndUpdate({ _id: booking._id, student: req.auth.userId, status: booking.status }, { $set: { status: 'cancelled' } }, { new: true })
    if (!cancelled) return res.status(409).json({ message: 'The booking changed before it could be cancelled. Refresh and try again.' })
    if (wasConfirmed) await releaseRooms(booking)
    return res.json({ booking: cancelled.toJSON() })
  } catch (error) {
    return next(error)
  }
}

export async function getOwnerBookings(req, res, next) {
  try {
    const filter = await ownerListingFilter(req, res)
    if (!filter) return
    const bookings = await Booking.find(filter).populate('listing', 'name slug').populate('student', 'name email').sort({ createdAt: -1 }).limit(200)
    const activeBookings = bookings.filter(booking => booking.status === 'confirmed')
    const occupiedByListing = new Map()
    for (const booking of activeBookings) {
      const key = booking.listing?._id?.toString()
      if (key) occupiedByListing.set(key, (occupiedByListing.get(key) || 0) + booking.rooms)
    }
    return res.json({ bookings: bookings.map(booking => ({ ...booking.toJSON(), occupiedRoomsForListing: occupiedByListing.get(booking.listing?._id?.toString()) || 0 })) })
  } catch (error) {
    return next(error)
  }
}

export async function updateOwnerBooking(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Booking not found.' })
    const nextStatus = req.body?.status
    const statusNote = typeof req.body?.statusNote === 'string' ? req.body.statusNote.trim().slice(0, 500) : ''
    const booking = await Booking.findOne({ _id: req.params.id, owner: req.auth.userId })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })

    if (booking.status === 'pending' && nextStatus === 'confirmed') {
      if (booking.startDate <= new Date()) return res.status(409).json({ message: 'This request has already passed its requested start date.' })
      const listing = await Listing.findOneAndUpdate(
        { _id: booking.listing, owner: req.auth.userId, availableRooms: { $gte: booking.rooms } },
        { $inc: { availableRooms: -booking.rooms } },
        { new: true },
      )
      if (!listing) return res.status(409).json({ message: 'There are not enough rooms left to confirm this request.' })
      const confirmed = await Booking.findOneAndUpdate({ _id: booking._id, owner: req.auth.userId, status: 'pending' }, { $set: { status: 'confirmed', statusNote } }, { new: true })
      if (!confirmed) {
        const restored = await Listing.findByIdAndUpdate(listing._id, { $inc: { availableRooms: booking.rooms }, $set: { available: true } }, { new: true })
        if (restored && restored.availableRooms > 999) await Listing.updateOne({ _id: restored._id }, { $set: { availableRooms: 999 } })
        return res.status(409).json({ message: 'This booking was already updated. Refresh and review the current status.' })
      }
      await Listing.updateOne({ _id: listing._id }, { $set: { available: listing.availableRooms > 0 } })
      return res.json({ booking: confirmed.toJSON() })
    } else if (booking.status === 'pending' && nextStatus === 'rejected') {
      const rejected = await Booking.findOneAndUpdate({ _id: booking._id, owner: req.auth.userId, status: 'pending' }, { $set: { status: 'rejected', statusNote } }, { new: true })
      if (!rejected) return res.status(409).json({ message: 'This booking was already updated. Refresh and review the current status.' })
      return res.json({ booking: rejected.toJSON() })
    } else if (booking.status === 'confirmed' && nextStatus === 'completed') {
      if (booking.endDate > new Date()) return res.status(409).json({ message: 'A stay can be marked complete after its end date.' })
      const completed = await Booking.findOneAndUpdate({ _id: booking._id, owner: req.auth.userId, status: 'confirmed' }, { $set: { status: 'completed', statusNote } }, { new: true })
      if (!completed) return res.status(409).json({ message: 'This booking was already updated. Refresh and review the current status.' })
      await releaseRooms(completed)
      return res.json({ booking: completed.toJSON() })
    } else {
      return res.status(409).json({ message: 'That status change is not allowed.' })
    }

  } catch (error) {
    return next(error)
  }
}

async function releaseRooms(booking) {
  const listing = await Listing.findByIdAndUpdate(booking.listing, { $inc: { availableRooms: booking.rooms }, $set: { available: true } }, { new: true })
  if (listing && listing.availableRooms > 999) {
    listing.availableRooms = 999
    await listing.save()
  }
}

export async function createReview(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) return res.status(404).json({ message: 'Booking not found.' })
    const booking = await Booking.findOne({ _id: req.params.bookingId, student: req.auth.userId })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (booking.status !== 'completed') return res.status(403).json({ message: 'You can review this stay after the owner marks the booking complete.' })
    const rating = Number(req.body?.rating)
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : ''
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Choose a rating from 1 to 5.' })
    if (comment.length > 2000) return res.status(400).json({ message: 'Review must be under 2,000 characters.' })
    if (await Review.exists({ booking: booking._id })) return res.status(409).json({ message: 'You have already reviewed this completed stay.' })
    const review = await Review.create({ booking: booking._id, listing: booking.listing, student: booking.student, owner: booking.owner, rating, comment })
    const [summary] = await Review.aggregate([{ $match: { listing: booking.listing } }, { $group: { _id: '$listing', rating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }])
    await Listing.updateOne({ _id: booking.listing }, { $set: { rating: Number(summary.rating.toFixed(1)), reviewCount: summary.reviewCount } })
    return res.status(201).json({ review: review.toJSON() })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already reviewed this completed stay.' })
    return next(error)
  }
}

export async function getListingReviews(req, res, next) {
  try {
    const reviews = await Review.find({ listing: req.params.listingId }).populate('student', 'name').sort({ createdAt: -1 }).limit(100)
    return res.json({ reviews: reviews.map(review => review.toJSON()) })
  } catch (error) {
    return next(error)
  }
}

export async function getOwnerReviews(req, res, next) {
  try {
    const filter = await ownerListingFilter(req, res)
    if (!filter) return
    const reviews = await Review.find(filter).populate('listing', 'name slug').populate('student', 'name').sort({ createdAt: -1 }).limit(200)
    return res.json({ reviews: reviews.map(review => review.toJSON()) })
  } catch (error) {
    return next(error)
  }
}

export async function createComplaint(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) return res.status(404).json({ message: 'Booking not found.' })
    const booking = await Booking.findOne({ _id: req.params.bookingId, student: req.auth.userId })
    if (!booking) return res.status(404).json({ message: 'Booking not found.' })
    if (!['confirmed', 'completed'].includes(booking.status)) return res.status(403).json({ message: 'A complaint can be submitted after a booking is confirmed.' })
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
    const allowedCategories = ['room', 'cleanliness', 'facilities', 'conduct', 'billing', 'other']
    const category = allowedCategories.includes(req.body?.category) ? req.body.category : 'other'
    if (message.length < 10 || message.length > 3000) return res.status(400).json({ message: 'Describe the issue in 10 to 3,000 characters.' })
    const complaint = await Complaint.create({ booking: booking._id, listing: booking.listing, student: booking.student, owner: booking.owner, category, message })
    return res.status(201).json({ complaint: complaint.toJSON() })
  } catch (error) {
    return next(error)
  }
}

export async function getOwnerComplaints(req, res, next) {
  try {
    const filter = await ownerListingFilter(req, res)
    if (!filter) return
    const complaints = await Complaint.find(filter).populate('listing', 'name slug').populate('student', 'name email').populate('booking', 'startDate endDate rooms').sort({ createdAt: -1 }).limit(200)
    return res.json({ complaints: complaints.map(complaint => complaint.toJSON()) })
  } catch (error) {
    return next(error)
  }
}

export async function updateOwnerComplaint(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Complaint not found.' })
    const status = req.body?.status
    const response = typeof req.body?.ownerResponse === 'string' ? req.body.ownerResponse.trim() : ''
    if (!['open', 'in_review', 'resolved'].includes(status)) return res.status(400).json({ message: 'Choose open, in_review, or resolved.' })
    if (response.length > 2000) return res.status(400).json({ message: 'Response must be under 2,000 characters.' })
    const complaint = await Complaint.findOneAndUpdate({ _id: req.params.id, owner: req.auth.userId }, { $set: { status, ownerResponse: response } }, { new: true })
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' })
    return res.json({ complaint: complaint.toJSON() })
  } catch (error) {
    return next(error)
  }
}
