'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Draft extends Model {
		static associate(models) {
			Draft.belongsTo(models.Student, {
				foreignKey: 'student_id',
				as: 'student',
			})
			Draft.belongsTo(models.Staff, {
				foreignKey: 'reviewed_by',
				as: 'reviewer',
			})
			Draft.hasMany(models.ChangeLog, {
				foreignKey: 'draft_id',
				as: 'changeLogs',
			})
		}
	}

	Draft.init(
		{
			id: {
				type: DataTypes.BIGINT,
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
			},
			student_id: {
				type: DataTypes.STRING,
				allowNull: false,
				references: {
					model: 'Students',
					key: 'student_id',
				},
			},
			version_type: {
				type: DataTypes.ENUM('draft', 'pending'),
				allowNull: false,
				defaultValue: 'draft',
			},
			profile_data: {
				type: DataTypes.JSONB,
				allowNull: false,
			},
			changed_fields: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
			status: {
				type: DataTypes.ENUM('draft', 'submitted', 'checking', 'approved', 'disapproved', 'resubmission_required'),
				allowNull: false,
				defaultValue: 'draft',
			},
			submit_count: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			comments: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			reviewed_by: {
				type: DataTypes.BIGINT,
				allowNull: true,
				references: {
					model: 'Staffs',
					key: 'id',
				},
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
			updated_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			sequelize,
			modelName: 'Draft',
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			indexes: [
				{
					unique: true,
					fields: ['student_id', 'version_type'],
				},
			],
		}
	)

	return Draft
}
