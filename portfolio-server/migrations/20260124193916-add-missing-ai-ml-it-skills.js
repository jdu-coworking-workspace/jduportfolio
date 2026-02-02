'use strict'

/**
 * Migration: Add missing AI/ML/Data Science related IT skills
 *
 * This migration adds commonly used AI and data science related skills
 * that were missing from the initial IT skills seeder.
 *
 * Background:
 * Students' it_skills field contains "Artificial intelligence" and similar
 * skills that weren't in the original ItSkills table, causing filter mismatches.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const additionalSkills = [
			// AI/ML Skills
			{ name: 'Artificial Intelligence', color: '#ff6f61' },
			{ name: 'Machine Learning', color: '#6b5b95' },
			{ name: 'Deep Learning', color: '#88b04b' },
			{ name: 'TensorFlow', color: '#ff6f00' },
			{ name: 'PyTorch', color: '#ee4c2c' },
			{ name: 'Keras', color: '#d00000' },
			{ name: 'Scikit-learn', color: '#f89939' },
			{ name: 'Natural Language Processing', color: '#009688' },
			{ name: 'Computer Vision', color: '#673ab7' },
			{ name: 'Neural Networks', color: '#3f51b5' },

			// Data Science Skills
			{ name: 'Data Science', color: '#5b9bd5' },
			{ name: 'Data Analysis', color: '#70ad47' },
			{ name: 'Data Visualization', color: '#ffc000' },
			{ name: 'Pandas', color: '#150458' },
			{ name: 'NumPy', color: '#013243' },
			{ name: 'Jupyter', color: '#f37726' },
			{ name: 'Apache Spark', color: '#e25a1c' },
			{ name: 'Hadoop', color: '#66ccff' },

			// Other commonly used skills
			{ name: 'Git', color: '#f05032' },
			{ name: 'GitHub', color: '#181717' },
			{ name: 'GitLab', color: '#fc6d26' },
			{ name: 'Linux', color: '#fcc624' },
			{ name: 'Bash', color: '#4eaa25' },
			{ name: 'Jenkins', color: '#d24939' },
			{ name: 'Terraform', color: '#7b42bc' },
			{ name: 'Ansible', color: '#ee0000' },
			{ name: 'Elasticsearch', color: '#005571' },
			{ name: 'Kafka', color: '#231f20' },
			{ name: 'RabbitMQ', color: '#ff6600' },
			{ name: 'Nginx', color: '#009639' },
			{ name: 'Apache', color: '#d22128' },
		]

		const skillsWithTimestamps = additionalSkills.map(skill => ({
			...skill,
			createdAt: new Date(),
			updatedAt: new Date(),
		}))

		// Insert only if they don't already exist (using onConflict to ignore duplicates)
		await queryInterface.bulkInsert('ItSkills', skillsWithTimestamps, {
			ignoreDuplicates: true,
		})
	},

	async down(queryInterface, Sequelize) {
		const skillNames = ['Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Natural Language Processing', 'Computer Vision', 'Neural Networks', 'Data Science', 'Data Analysis', 'Data Visualization', 'Pandas', 'NumPy', 'Jupyter', 'Apache Spark', 'Hadoop', 'Git', 'GitHub', 'GitLab', 'Linux', 'Bash', 'Jenkins', 'Terraform', 'Ansible', 'Elasticsearch', 'Kafka', 'RabbitMQ', 'Nginx', 'Apache']

		await queryInterface.bulkDelete('ItSkills', {
			name: {
				[Sequelize.Op.in]: skillNames,
			},
		})
	},
}
