// src/models/index.js

const { Sequelize } = require('sequelize')
const config = require('../config/config') // Adjust the path as needed
const Log = require('./Log')
const userFile = require('./userFile')
const News = require('./News')

const env = process.env.NODE_ENV || 'development'

let sequelize

if (config.use_env_variable) {
	sequelize = new Sequelize(process.env[config.use_env_variable], config[config.use_env_variable])
} else {
	sequelize = new Sequelize(config[env].database, config[env].username, config[env].password, {
		...config[env],
	})
}

const db = {}

// Load models
db.Admin = require('./Admin')(sequelize, Sequelize)
db.Recruiter = require('./Recruiter')(sequelize, Sequelize)
db.Staff = require('./Staff')(sequelize, Sequelize)
db.Student = require('./Student')(sequelize, Sequelize)
db.Bookmark = require('./Bookmark')(sequelize, Sequelize)
db.QA = require('./QA')(sequelize, Sequelize)
db.Setting = require('./Settings')(sequelize, Sequelize)
db.Draft = require('./Draft')(sequelize, Sequelize)
db.Log = require('./Log')(sequelize, Sequelize)
db.Notification = require('./Notification')(sequelize, Sequelize)
db.Image = require('./Image')(sequelize, Sequelize)
db.UserFile = require('./userFile')(sequelize, Sequelize)
db.News = require('./News')(sequelize, Sequelize)
db.ItSkill = require('./itskill')(sequelize, Sequelize)
db.Skill = require('./skill')(sequelize, Sequelize)
db.NewsViews = require('./NewsViews')(sequelize, Sequelize)
db.Maintenance = require('./Maintenance')(sequelize, Sequelize)

// Load other models here if needed
// db.User = require('./User')(sequelize, Sequelize);

// Apply associations here if needed
// Example:

db.Admin.hasMany(db.News, {
	foreignKey: 'authorId',
	constraints: false,
	scope: { authorType: 'Admin' },
	as: 'newsByAdmin',
})
db.Staff.hasMany(db.News, {
	foreignKey: 'authorId',
	constraints: false,
	scope: { authorType: 'Staff' },
	as: 'newsByStaff',
})
db.Recruiter.hasMany(db.News, {
	foreignKey: 'authorId',
	constraints: false,
	scope: { authorType: 'Recruiter' },
	as: 'newsByRecruiter',
})

db.News.belongsTo(db.Admin, {
	foreignKey: 'authorId',
	constraints: false,
	as: 'authorAdmin',
})
db.News.belongsTo(db.Staff, {
	foreignKey: 'authorId',
	constraints: false,
	as: 'authorStaff',
})
db.News.belongsTo(db.Recruiter, {
	foreignKey: 'authorId',
	constraints: false,
	as: 'authorRecruiter',
})

db.Admin.hasMany(db.News, {
	foreignKey: 'moderatorId',
	constraints: false,
	scope: { moderatorType: 'Admin' },
	as: 'moderatedByAdmin',
})
db.Staff.hasMany(db.News, {
	foreignKey: 'moderatorId',
	constraints: false,
	scope: { moderatorType: 'Staff' },
	as: 'moderatedByStaff',
})

db.News.belongsTo(db.Admin, {
	foreignKey: 'moderatorId',
	constraints: false,
	as: 'moderatorAdmin',
})
db.News.belongsTo(db.Staff, {
	foreignKey: 'moderatorId',
	constraints: false,
	as: 'moderatorStaff',
})

db.News.hasMany(db.NewsViews, { foreignKey: 'news_id', as: 'views' })
db.NewsViews.belongsTo(db.News, { foreignKey: 'news_id', as: 'news' })

db.Recruiter.hasMany(db.Bookmark, {
	foreignKey: 'recruiterId',
	as: 'bookmarks',
})
db.Student.hasMany(db.Bookmark, { foreignKey: 'studentId', as: 'bookmarks' })
db.Student.hasMany(db.Draft, {
	foreignKey: 'student_id',
	sourceKey: 'student_id',
	as: 'drafts',
})
db.Student.hasOne(db.Draft, {
	foreignKey: 'student_id',
	sourceKey: 'student_id',
	as: 'draft',
	scope: {
		version_type: 'draft',
	},
})
db.Student.hasOne(db.Draft, {
	foreignKey: 'student_id',
	sourceKey: 'student_id',
	as: 'pendingDraft',
	scope: {
		version_type: 'pending',
	},
})

db.Bookmark.belongsTo(db.Recruiter, {
	foreignKey: 'recruiterId',
	as: 'recruiter',
})
db.Bookmark.belongsTo(db.Student, { foreignKey: 'studentId', as: 'student' })
db.Draft.belongsTo(db.Student, {
	foreignKey: 'student_id', // This tells Drafts how to reference Student
	targetKey: 'student_id', // Ensures it joins using Student.student_id, not Student.id
	as: 'student',
})
db.Draft.belongsTo(db.Staff, {
	foreignKey: 'reviewed_by',
	as: 'reviewer',
})
db.Staff.hasMany(db.Draft, {
	foreignKey: 'reviewed_by',
	as: 'reviewedDrafts',
})

module.exports = {
	sequelize,
	Sequelize,
	Admin: db.Admin,
	Recruiter: db.Recruiter,
	Staff: db.Staff,
	Student: db.Student,
	Bookmark: db.Bookmark,
	QA: db.QA,
	Setting: db.Setting,
	Draft: db.Draft,
	Log: db.Log,
	Notification: db.Notification,
	Image: db.Image,
	UserFile: db.UserFile,
	News: db.News,
	ItSkill: db.ItSkill,
	Skill: db.Skill,
	NewsViews: db.NewsViews, // ← Bu qator qo'shildi!
	Maintenance: db.Maintenance,
}
