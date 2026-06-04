module.exports = (sequelize, DataTypes) => {
	const ShareableLink = sequelize.define('ShareableLink', {
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		studentId: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		language: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: 'ja',
		},
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		translatedPayload: {
			type: DataTypes.JSONB,
			allowNull: true,
		},
		translatedAt: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		translationStatus: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: 'not_required',
		},
		translationError: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		sourceProfileHash: {
			type: DataTypes.STRING,
			allowNull: true,
		},
	})
	return ShareableLink
}
