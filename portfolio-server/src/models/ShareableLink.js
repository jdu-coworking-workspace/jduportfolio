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
		expiresAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
	})
	return ShareableLink
}
