/**
 * Build target URLs for notifications based on notification type and context
 */

/**
 * Generate a target URL for a notification
 * @param {Object} params - Parameters for URL generation
 * @param {string} params.type - Notification type (draft_submitted, approved, etc)
 * @param {string} params.userRole - User role (student, staff, admin, recruiter)
 * @param {string|number} params.studentId - Student ID (for student-related notifications)
 * @param {string|number} params.relatedId - Related entity ID (draft, student record, etc)
 * @returns {string|null} The target URL or null if not applicable
 */
function buildNotificationUrl({ type, userRole, studentId, relatedId }) {
	// For draft-related notifications
	if (type === 'draft_submitted' || type === 'approved') {
		if (userRole === 'student' && studentId) {
			// Students see their own profile when their draft is approved
			return '/profile/top'
		} else if ((userRole === 'staff' || userRole === 'admin') && studentId) {
			// Staff/Admin can navigate to checkprofile to review
			return `/checkprofile/profile/${studentId}/top`
		}
	}

	// For student profile publication notifications (sent to recruiters)
	if (type === 'etc' && userRole === 'recruiter' && studentId) {
		// Recruiters can view the published student profile
		return `/student/profile/${studentId}/top`
	}

	if (type === 'news' && relatedId) {
		return `/news/${relatedId}`
	}

	// No URL generated for unhandled notification types
	// If a new notification type should have a URL, add explicit handling above
	return null
}

module.exports = { buildNotificationUrl }
