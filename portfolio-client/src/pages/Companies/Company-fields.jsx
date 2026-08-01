// Doc 1.1-bo'limdagi company obyekt maydonlari, mantiqiy bo'limlarga guruhlangan.
// name === backenddagi maydon nomi (aynan shunday yuboriladi/qabul qilinadi).

export const COMPANY_SECTIONS = [
	{
		key: 'general',
		title: 'Umumiy ma\u02bclumot',
		fields: [
			{ name: 'tagline', label: 'Tagline', multiline: false },
			{ name: 'company_description', label: 'Kompaniya tavsifi', multiline: true },
			{ name: 'company_website', label: 'Veb-sayt', type: 'url' },
			{ name: 'company_Address', label: 'Manzil' },
			{ name: 'established_Date', label: 'Tashkil topgan sana', type: 'date' },
			{ name: 'employee_Count', label: 'Xodimlar soni' },
			{ name: 'company_capital', label: 'Ustav kapitali' },
			{ name: 'company_revenue', label: 'Yillik aylanma' },
			{ name: 'company_representative', label: 'Kompaniya vakili' },
			{ name: 'business_overview', label: 'Faoliyat yo\u02bbnalishi', multiline: true },
			{ name: 'target_audience', label: 'Maqsadli auditoriya', multiline: true },
		],
	},
	{
		key: 'vacancy',
		title: 'Vakansiya',
		fields: [
			{ name: 'job_title', label: 'Lavozim nomi' },
			{ name: 'job_description', label: 'Ish tavsifi', multiline: true },
			{ name: 'number_of_openings', label: 'Bo\u02bbsh o\u02bbrinlar soni' },
			{ name: 'employment_type', label: 'Ish turi' },
			{ name: 'probation_period', label: 'Sinov muddati' },
			{ name: 'employment_period', label: 'Shartnoma muddati' },
			{ name: 'work_location', label: 'Ish joyi' },
			{ name: 'work_hours', label: 'Ish vaqti' },
		],
	},
	{
		key: 'compensation',
		title: 'Maosh va imtiyozlar',
		fields: [
			{ name: 'salary', label: 'Maosh' },
			{ name: 'salary_increase', label: 'Maosh oshishi' },
			{ name: 'bonus', label: 'Bonus' },
			{ name: 'allowances', label: 'Qo\u02bbshimcha to\u02bblovlar' },
			{ name: 'holidays_vacation', label: 'Dam olish kunlari / ta\u02bctil' },
			{ name: 'benefits', label: 'Ijtimoiy paket', multiline: true },
			{ name: 'retirement_benefit', label: 'Pensiya nafaqasi' },
		],
	},
	{
		key: 'requirements',
		title: 'Talablar va tanlov jarayoni',
		fields: [
			{ name: 'required_skills', label: 'Majburiy ko\u02bbnikmalar', multiline: true },
			{ name: 'welcome_skills', label: 'Xush kelibsiz ko\u02bbnikmalar', multiline: true },
			{ name: 'recommended_skills', label: 'Tavsiya etiladigan ko\u02bbnikmalar', multiline: true },
			{ name: 'recommended_licenses', label: 'Tavsiya etiladigan sertifikatlar' },
			{ name: 'recommended_other', label: 'Boshqa tavsiyalar' },
			{ name: 'japanese_level', label: 'Yapon tili darajasi' },
			{ name: 'application_requirements_other', label: 'Boshqa talablar', multiline: true },
			{ name: 'selection_process', label: 'Tanlov jarayoni', multiline: true },
			{ name: 'interview_method', label: 'Intervyu usuli' },
		],
	},
	{
		key: 'support',
		title: 'Qo\u02bbshimcha qo\u02bblab-quvvatlash',
		fields: [
			{ name: 'telework_availability', label: 'Masofaviy ish imkoniyati' },
			{ name: 'housing_availability', label: 'Turar-joy bilan ta\u02bcminlash' },
			{ name: 'relocation_support', label: 'Ko\u02bbchishga yordam' },
			{ name: 'airport_pickup', label: 'Aeroportdan kutib olish' },
			{ name: 'other_notes', label: 'Qo\u02bbshimcha izohlar', multiline: true },
		],
	},
	{
		key: 'media',
		title: 'Media',
		fields: [{ name: 'intro_page_thumbnail', label: 'Taniqli sahifa rasmi (URL)', type: 'url' }],
	},
]

// Top-level ro'yxat/qidiruv/kartochkalarda ishlatiladigan asosiy maydonlar
export const COMPANY_LIST_COLUMNS = [
	{ name: 'company_name', label: 'Nomi' },
	{ name: 'company_representative', label: 'Vakil' },
	{ name: 'company_Address', label: 'Manzil' },
	{ name: 'employee_Count', label: 'Xodimlar' },
]

export const emptyCompanyProfile = () =>
	COMPANY_SECTIONS.reduce((acc, section) => {
		section.fields.forEach(f => {
			acc[f.name] = ''
		})
		return acc
	}, {})
