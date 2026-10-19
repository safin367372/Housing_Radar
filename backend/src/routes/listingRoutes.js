import { Router } from 'express'
import { getListingById, getListings } from '../controllers/listingController.js'
import { createListing, deleteListing, getMyListings, setListingActive, updateListing } from '../controllers/ownerListingController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'
import { getListingReviews } from '../controllers/bookingController.js'

const router = Router()

router.get('/', getListings)
router.get('/mine', requireAuth, requireRole('owner'), getMyListings)
router.post('/', requireAuth, requireRole('owner'), createListing)
router.put('/:id', requireAuth, requireRole('owner'), updateListing)
router.delete('/:id', requireAuth, requireRole('owner'), deleteListing)
router.patch('/:id/status', requireAuth, requireRole('owner'), setListingActive)
router.get('/:listingId/reviews', getListingReviews)
router.get('/:id', getListingById)

export default router
