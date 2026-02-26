const SettingsService = require('../services/settingService')

class SettingsController {
	static async getSetting(req, res) {
		try {
			const { key } = req.params
			const value = await SettingsService.getSetting(key)
			res.json({ key, value: value ?? '' })
		} catch (error) {
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	static async updateSetting(req, res) {
		try {
			const { key } = req.params
			const { value } = req.body
			const result = await SettingsService.updateSetting(key, value)
			res.json(result)
		} catch (error) {
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	static async getAllSettings(req, res) {
		try {
			const settings = await SettingsService.getAllSettings()
			res.json(settings)
		} catch (error) {
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	static async getSettingsByKeys(req, res) {
		try {
			// console.log(req, "getSettingby KEYS");
			const { keys } = req.body // Expecting an array of keys in the body
			// console.log(keys, "Ushbu get settings by keysga muroojat qilindi");
			if (!Array.isArray(keys)) {
				return res.status(400).json({ error: 'Invalid input: keys should be an array' })
			}

			const settings = await SettingsService.getSettingsByKeys(keys)
			res.json(settings)
		} catch (error) {
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	static async getHomepageSetting(req, res) {
		try {
			const homepageValue = await SettingsService.getSetting('homepage')
			res.json({ key: 'homepage', value: homepageValue ?? '' })
		} catch (error) {
			res.status(500).json({ error: 'Internal server error' })
		}
	}
}

module.exports = SettingsController
