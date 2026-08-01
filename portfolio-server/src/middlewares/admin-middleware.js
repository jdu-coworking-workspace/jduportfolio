/**
 * Guards that restrict a route to privileged user types.
 *
 * Assumes `authMiddleware` has already run and populated `req.user`
 * (with `userType`). Use AFTER authMiddleware in the route chain.
 */

// Admin only
const adminOnly = (req, res, next) => {
	if (req.user?.userType !== 'Admin') {
		return res.status(403).json({ error: 'Admin access required' })
	}
	next()
}

// Admin or Staff (some management actions are shared)
const adminOrStaff = (req, res, next) => {
	const userType = req.user?.userType
	if (userType !== 'Admin' && userType !== 'Staff') {
		return res.status(403).json({ error: 'Admin or Staff access required' })
	}
	next()
}

module.exports = { adminOnly, adminOrStaff }
