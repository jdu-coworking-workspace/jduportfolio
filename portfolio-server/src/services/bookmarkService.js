const { Bookmark, Student } = require('../models')

class BookmarkService {
	// Service method to create or remove a bookmark
	static async toggleBookmark(recruiterId, studentId) {
		try {
			const bookmark = await Bookmark.findOne({
				where: { recruiterId, studentId },
			})

			if (bookmark) {
				await bookmark.destroy()
				return bookmark
			} else {
				const newBookmark = await Bookmark.create({ recruiterId, studentId })
				return newBookmark
			}
		} catch (error) {
			throw error
		}
	}

	static async checkBookmarkStatus(recruiterId, studentId) {
		try {
			const bookmark = await Bookmark.findOne({
				where: { recruiterId, studentId },
			})
			return !!bookmark
		} catch (error) {
			throw error
		}
	}

	// Service method to retrieve all students with bookmark status for a recruiter
	static async getStudentsWithBookmarkStatus(recruiterId) {
		try {
			const students = await Student.findAll({
				include: [
					{
						model: Bookmark,
						as: 'bookmarks',
						where: { recruiterId },
						required: false, // Allows students without bookmarks to be included
					},
				],
			})

			// Add `isBookmarked` field to each student
			const studentsWithBookmarkStatus = students.map(student => {
				const isBookmarked = student.bookmarks.length > 0
				return { ...student.toJSON(), isBookmarked }
			})

			return studentsWithBookmarkStatus
		} catch (error) {
			throw error
		}
	}
}

module.exports = BookmarkService
