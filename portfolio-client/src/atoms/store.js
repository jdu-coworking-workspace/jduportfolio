import { atom } from 'jotai'

export const tableScrollPositionAtom = atom(null)
export const studentsBackPageAtom = atom(null)
export const studentsSortByAtom = atom(null)
export const studentsSortOrderAtom = atom(null)

/** Page, sort state when leaving checkprofile list for profile (for in-app Back). */
export const checkprofileBackPageAtom = atom(null)
export const checkprofileSortByAtom = atom(null)
export const checkprofileSortOrderAtom = atom(null)

/** Where to return when clicking Back from profile: '/student' | '/checkprofile'. */
export const listReturnPathAtom = atom(null)
