import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonToast,
  IonIcon,
} from '@ionic/react';
import {
  saveStoredProfile,
  getStoredProfile,
  getStoredComplaints,
  UserProfile,
} from '../services/offlineStorage';
import { fetchTaxonomy, registerUserOnline } from '../services/api';
import { checkmark, trashOutline, personOutline } from 'ionicons/icons';

const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(getStoredProfile());
  const [regions, setRegions] = useState<any[]>([
    { id: 1, name: 'Kédougou' },
    { id: 2, name: 'Tambacounda' },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTaxonomy()
      .then((data) => {
        if (data && data.regions && data.regions.length > 0) {
          setRegions(data.regions);
        }
      })
      .catch((err) => console.warn('Offline fallback for taxonomy in settings', err));
  }, []);

  const handleSave = async () => {
    const updatedProfile = {
      ...profile,
      name: `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.name,
      isRegistered: true,
    };

    saveStoredProfile(updatedProfile);
    setProfile(updatedProfile);

    // Sync online if available
    try {
      await registerUserOnline(updatedProfile);
      setToastMessage('Profil enregistré et synchronisé avec le serveur !');
    } catch (e) {
      setToastMessage('Profil enregistré localement (mode hors-ligne actif).');
    }
  };

  const handleClearLocal = () => {
    if (window.confirm('Voulez-vous réinitialiser les plaintes locales stockées sur cet appareil ?')) {
      localStorage.removeItem('yecite_offline_complaints_v1');
      setToastMessage('Historique local réinitialisé.');
    }
  };

  const totalLocal = getStoredComplaints().length;
  const pendingLocal = getStoredComplaints().filter((c) => !c.synced).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#1e293b', color: '#fff' } as React.CSSProperties}>
          <IonTitle style={{ fontWeight: 800, fontSize: '18px' }}>Paramètres & Profil</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: '#fff', borderRadius: '20px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={personOutline} style={{ color: '#16a34a', fontSize: '18px' }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                Vos Coordonnées Enregistrées
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Prénom</label>
                <input
                  type="text"
                  value={profile.prenom || ''}
                  onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                  placeholder="Ex: Samba"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Nom</label>
                <input
                  type="text"
                  value={profile.nom || ''}
                  onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                  placeholder="Ex: Diallo"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>N° Téléphone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="Ex: 77 123 45 67"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Votre Rôle</label>
              <select
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value as any })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}>
                <option value="producteur">🌾 Producteur</option>
                <option value="distributeur">🚚 Distributeur</option>
                <option value="membre_equipe">👷 Membre de l'équipe terrain</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Région d'intervention</label>
              <select
                value={profile.region_id}
                onChange={(e) => {
                  const reg = regions.find((r) => r.id === Number(e.target.value));
                  setProfile({ ...profile, region_id: Number(e.target.value), region_name: reg?.name });
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>Région de {r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Adresse API Serveur</label>
              <input
                type="text"
                value={profile.api_url || 'http://localhost:8080'}
                onChange={(e) => setProfile({ ...profile, api_url: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>URL du serveur backend Laravel</span>
            </div>

            <IonButton
              expand="block"
              onClick={handleSave}
              style={{
                '--background': '#15803d',
                '--border-radius': '14px',
                height: '46px',
                fontWeight: 800,
                marginTop: '6px',
              } as React.CSSProperties}>
              <IonIcon icon={checkmark} slot="start" />
              Enregistrer mes coordonnées
            </IonButton>
          </div>

          {/* Offline Storage Status */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
              Mémoire & Mode Hors-ligne
            </span>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px', color: '#334155' }}>
              <span>Total plaintes enregistrées :</span>
              <strong>{totalLocal}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px', color: '#b45309' }}>
              <span>En attente de synchronisation :</span>
              <strong>{pendingLocal}</strong>
            </div>

            <button
              type="button"
              onClick={handleClearLocal}
              style={{
                marginTop: '16px',
                width: '100%',
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '10px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}>
              <IonIcon icon={trashOutline} />
              Vider le cache des plaintes locales
            </button>
          </div>

          {/* App Info Footer */}
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', padding: '10px 0' }}>
            <p style={{ margin: 0 }}><strong>YECITE - SENREM v1.0.0</strong></p>
            <p style={{ margin: '2px 0' }}>Projet SENREM &middot; Enda ECOPOP Sénégal (Kédougou & Tambacounda)</p>
          </div>

        </div>

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
