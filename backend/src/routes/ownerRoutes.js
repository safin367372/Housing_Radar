import { Router } from 'express'
import { getOwnerBookings, getOwnerComplaints, getOwnerReviews, updateOwnerBooking, updateOwnerComplaint } from '../controllers/bookingController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()
router.use(requireAuth, requireRole('owner'))
router.get('/bookings', getOwnerBookings)
router.patch('/bookings/:id', updateOwnerBooking)
router.get('/reviews', getOwnerReviews)
router.get('/complaints', getOwnerComplaints)
router.patch('/complaints/:id', updateOwnerComplaint)

export default router
