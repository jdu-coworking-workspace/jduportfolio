import { atom } from 'jotai'
// import { atomWithStorage } from 'jotai/utils'

export const editModeAtom = atom(false)

export const editDataAtom = atom({})

export const saveStatusAtom = atom({
	isSaving: false,
	lastSaved: null,
	hasUnsavedChanges: false,
})

export const persistedDataAtom = atom({
	exists: false,
	data: null,
	timestamp: null,
})

export const hobbiesInputAtom = atom('')
export const specialSkillsInputAtom = atom('')
export const showHobbiesInputAtom = atom(false)
export const showSpecialSkillsInputAtom = atom(false)

export const deliverableImagesAtom = atom({})
export const newImagesAtom = atom([])
export const deletedUrlsAtom = atom([])

export const activeUniverAtom = atom('JDU')
export const subTabIndexAtom = atom('selfIntroduction')

export const updateQAAtom = atom(true)
