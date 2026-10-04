import { MediaItem, PersonalMediaState, CustomList } from '../types/movie';

// Clean initial state with zero fake data for first-time users
export const INITIAL_MEDIA_ITEMS: MediaItem[] = [];

export const INITIAL_USER_STATES: Record<string, PersonalMediaState> = {};

export const INITIAL_CUSTOM_LISTS: CustomList[] = [];
