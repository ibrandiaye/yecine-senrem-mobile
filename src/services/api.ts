import { getStoredProfile, OfflineComplaint, UserProfile } from './offlineStorage';

export const getApiBaseUrl = (): string => {
  const profile = getStoredProfile();
  return profile.api_url ? profile.api_url.replace(/\/+$/, '') : 'http://localhost:8080';
};

export const fetchTaxonomy = async () => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/taxonomy`);
  if (!res.ok) throw new Error('Erreur lors du chargement des référentiels');
  return res.json();
};

export const registerUserOnline = async (profile: UserProfile) => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      nom: profile.nom,
      prenom: profile.prenom,
      name: profile.name || `${profile.prenom} ${profile.nom}`.trim(),
      phone: profile.phone,
      role: profile.role,
      region_id: profile.region_id,
      department_id: profile.department_id,
      commune_id: profile.commune_id,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de l\'enregistrement du compte');
  }

  return res.json();
};

export const submitComplaintOnline = async (formData: FormData) => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/complaints`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Échec de la transmission');
  }
  return res.json();
};

export const syncOfflineBatchApi = async (complaints: OfflineComplaint[]) => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/complaints/offline-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      items: complaints.map(c => ({
        offline_client_id: c.id,
        complainant_name: c.complainant_name,
        complainant_phone: c.complainant_phone,
        complainant_type: c.complainant_type,
        category: c.category,
        text_content: c.text_content,
        audio_base64: c.audio_base64,
        photo_base64: c.photo_base64,
        video_base64: c.video_base64,
        latitude: c.latitude,
        longitude: c.longitude,
        location_name: c.location_name,
        region_id: c.region_id,
        department_id: c.department_id,
        commune_id: c.commune_id,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error('Échec de la synchronisation');
  }

  return res.json();
};

export const fetchMyComplaintsApi = async (phone: string) => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/complaints/my?phone=${encodeURIComponent(phone)}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error('Impossible de charger vos plaintes');
  return res.json();
};

export const submitWorkerComplaintApi = async (formData: FormData) => {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/worker-complaints`, {
    method: 'POST',
    body: formData,
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Erreur lors de la soumission de la plainte');
  }
  return res.json();
};
