// Offline Storage Service for YECITE - SENREM
export interface OfflineComplaint {
  id: string; // UUID client
  complainant_name: string;
  complainant_phone?: string;
  complainant_type: 'producteur' | 'distributeur';
  category: string;
  text_content?: string;
  audio_base64?: string;
  photo_base64?: string;
  video_base64?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  region_id: number;
  department_id?: number;
  commune_id?: number;
  created_at: string;
  synced: boolean;
  tracking_code?: string;
}

const STORAGE_KEY = 'yecite_offline_complaints_v1';
const USER_PROFILE_KEY = 'yecite_user_profile_v2';

export const getStoredComplaints = (): OfflineComplaint[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading stored complaints:', e);
    return [];
  }
};

export const saveComplaintLocally = (complaint: OfflineComplaint): void => {
  const list = getStoredComplaints();
  list.unshift(complaint);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const markComplaintAsSynced = (clientId: string, trackingCode: string): void => {
  const list = getStoredComplaints();
  const updated = list.map(c => {
    if (c.id === clientId) {
      return { ...c, synced: true, tracking_code: trackingCode };
    }
    return c;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const getPendingSyncCount = (): number => {
  return getStoredComplaints().filter(c => !c.synced).length;
};

// Profile settings (Saved upon first-use registration)
export interface UserProfile {
  nom: string;
  prenom: string;
  name: string; // Combined full name
  phone: string;
  role: 'producteur' | 'distributeur' | 'membre_equipe';
  region_id: number;
  region_name?: string;
  department_id?: number;
  department_name?: string;
  commune_id?: number;
  commune_name?: string;
  isRegistered: boolean;
  token?: string;
  api_url?: string;
}

export const getStoredProfile = (): UserProfile => {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    nom: '',
    prenom: '',
    name: '',
    phone: '',
    role: 'producteur',
    region_id: 1, // Kédougou
    region_name: 'Kédougou',
    isRegistered: false,
    api_url: 'http://localhost:8080',
  };
};

export const isUserRegistered = (): boolean => {
  const profile = getStoredProfile();
  return Boolean(profile.isRegistered && (profile.nom || profile.prenom) && profile.phone);
};

export const saveStoredProfile = (profile: UserProfile): void => {
  profile.name = profile.name || `${profile.prenom} ${profile.nom}`.trim();
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yecite-profile-updated', { detail: profile }));
  }
};
