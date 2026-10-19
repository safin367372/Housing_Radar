import { Router } from 'express'
import { cancelMyBooking, createBooking, createComplaint, createReview, getMyBookings } from '../controllers/bookingController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()
router.use(requireAuth, requireRole('student'))
router.get('/mine', getMyBookings)
router.post('/listings/:listingId', createBooking)
router.patch('/:id/cancel', cancelMyBooking)
router.post('/:bookingId/reviews', createReview)
router.post('/:bookingId/complaints', createComplaint)

export default router
