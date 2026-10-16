import { Router } from 'express'
import { getListingById, getListings } from '../controllers/listingController.js'
import { createListing, getMyListings } from '../controllers/ownerListingController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRole } from '../middleware/requireRole.js'

const router = Router()

router.get('/', getListings)
router.get('/mine', requireAuth, requireRole('owner'), getMyListings)
router.post('/', requireAuth, requireRole('owner'), createListing)
router.get('/:id', getListingById)

export default router
