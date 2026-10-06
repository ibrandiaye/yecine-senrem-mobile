import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import { checkmarkCircle, personCircleOutline, closeOutline, shieldCheckmark } from 'ionicons/icons';
import { UserProfile, getStoredProfile, saveStoredProfile } from '../services/offlineStorage';
import { fetchTaxonomy, registerUserOnline } from '../services/api';

interface RegistrationModalProps {
  isOpen: boolean;
  canDismiss?: boolean;
  onClose?: () => void;
  onRegistered: (profile: UserProfile) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  canDismiss = false,
  onClose,
  onRegistered,
}) => {
  const currentProfile = getStoredProfile();

  const [prenom, setPrenom] = useState(currentProfile.prenom || '');
  const [nom, setNom] = useState(currentProfile.nom || '');
  const [phone, setPhone] = useState(currentProfile.phone || '');
  const [role, setRole] = useState<'producteur' | 'distributeur' | 'membre_equipe'>(
    currentProfile.role || 'producteur'
  );

  const [regions, setRegions] = useState<any[]>([
    {
      id: 1,
      name: 'Kédougou',
      departments: [
        { id: 1, name: 'Kédougou', communes: [{ id: 1, name: 'Kédougou' }, { id: 2, name: 'Dindéfélo' }, { id: 3, name: 'Bandafassi' }] },
        { id: 2, name: 'Saraya', communes: [{ id: 4, name: 'Saraya' }, { id: 5, name: 'Bembou' }] },
        { id: 3, name: 'Salémata', communes: [{ id: 6, name: 'Salémata' }, { id: 7, name: 'Dakately' }] },
      ],
    },
    {
      id: 2,
      name: 'Tambacounda',
      departments: [
        { id: 4, name: 'Tambacounda', communes: [{ id: 8, name: 'Tambacounda' }, { id: 9, name: 'Missirah' }] },
        { id: 5, name: 'Bakel', communes: [{ id: 10, name: 'Bakel' }, { id: 11, name: 'Diawara' }] },
        { id: 6, name: 'Goudiry', communes: [{ id: 12, name: 'Goudiry' }, { id: 13, name: 'Bala' }] },
        { id: 7, name: 'Koumpentoum', communes: [{ id: 14, name: 'Koumpentoum' }] },
      ],
    },
  ]);

  const [selectedRegionId, setSelectedRegionId] = useState<number>(currentProfile.region_id || 1);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(currentProfile.department_id);
  const [selectedCommuneId, setSelectedCommuneId] = useState<number | undefined>(currentProfile.commune_id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load taxonomy from API if available
    fetchTaxonomy()
      .then((data) => {
        if (data && data.regions && data.regions.length > 0) {
          setRegions(data.regions);
          if (!selectedRegionId) {
            setSelectedRegionId(data.regions[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Taxonomy offline, fallback used:', err);
      });
  }, []);

  const activeRegion = regions.find((r) => r.id === Number(selectedRegionId)) || regions[0];
  const activeDepartments = activeRegion?.departments || [];
  const activeDepartment = activeDepartments.find((d: any) => d.id === Number(selectedDeptId));
  const activeCommunes = activeDepartment?.communes || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prenom.trim() || !nom.trim()) {
      setToastMessage('Veuillez renseigner votre prénom et votre nom.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setToastMessage('Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    setIsSubmitting(true);

    const updatedProfile: UserProfile = {
      ...currentProfile,
      prenom: prenom.trim(),
      nom: nom.trim(),
      name: `${prenom.trim()} ${nom.trim()}`,
      phone: cleanPhone,
      role,
      region_id: activeRegion ? activeRegion.id : 1,
      region_name: activeRegion ? activeRegion.name : 'Kédougou',
      department_id: selectedDeptId,
      department_name: activeDepartment ? activeDepartment.name : undefined,
      commune_id: selectedCommuneId,
      commune_name: activeCommunes.find((c: any) => c.id === Number(selectedCommuneId))?.name,
      isRegistered: true,
    };

    try {
      // 1. Sauvegarde locale immédiate (fonctionnement hors-ligne garanti)
      saveStoredProfile(updatedProfile);

      // 2. Synchronisation en ligne si réseau disponible
      try {
        const res = await registerUserOnline(updatedProfile);
        if (res && res.token) {
          updatedProfile.token = res.token;
          saveStoredProfile(updatedProfile);
        }
      } catch (networkErr) {
        console.warn('Network sync skipped (offline mode active):', networkErr);
      }

      setToastMessage('Inscription enregistrée avec succès !');
      onRegistered(updatedProfile);
      if (onClose) onClose();
    } catch (err: any) {
      setToastMessage('Erreur lors de l\'enregistrement : ' + (err.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} backdropDismiss={canDismiss}>
      <IonHeader>
        <IonToolbar style={{ '--background': '#15803d', color: '#fff' } as React.CSSProperties}>
          <IonTitle style={{ fontWeight: 800, fontSize: '16px' }}>
            Identification <span style={{ color: '#fef08a' }}>&bull; Première Utilisation</span>
          </IonTitle>
          {canDismiss && onClose && (
            <IonButton slot="end" fill="clear" color="light" onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
        <div style={{ maxWidth: '520px', margin: '0 auto', paddingBottom: '30px' }}>

          {/* Banner */}
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                flexShrink: 0,
              }}
            >
              <IonIcon icon={shieldCheckmark} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#166534' }}>
                Inscription Rapide
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                Renseignez vos coordonnées <strong>une seule fois</strong>. Vos futures plaintes seront pré-remplies automatiquement sans ressaisie !
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* 1. Rôle / Profil */}
            <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                1. Vous êtes ? *
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRole('producteur')}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '12px',
                    border: role === 'producteur' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: role === 'producteur' ? '#dcfce7' : '#f8fafc',
                    color: role === 'producteur' ? '#166534' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🌾</span>
                  <span>Producteur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('distributeur')}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '12px',
                    border: role === 'distributeur' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: role === 'distributeur' ? '#dcfce7' : '#f8fafc',
                    color: role === 'distributeur' ? '#166534' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🚚</span>
                  <span>Distributeur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('membre_equipe')}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    fontSize: '12px',
                    border: role === 'membre_equipe' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: role === 'membre_equipe' ? '#dcfce7' : '#f8fafc',
                    color: role === 'membre_equipe' ? '#166534' : '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>👷</span>
                  <span>Équipe SENREM</span>
                </button>
              </div>
            </div>

            {/* 2. Nom, Prénom & Téléphone */}
            <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                2. Vos Coordonnées *
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Prénom *</span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Samba"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginTop: '4px',
                    }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nom *</span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Diallo"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginTop: '4px',
                    }}
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Numéro de téléphone *</span>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    marginTop: '4px',
                  }}
                />
              </div>
            </div>

            {/* 3. Région & Localisation */}
            <div style={{ background: '#fff', borderRadius: '18px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                3. Votre Région d'Intervention *
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Région *</span>
                  <select
                    value={selectedRegionId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedRegionId(id);
                      setSelectedDeptId(undefined);
                      setSelectedCommuneId(undefined);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      background: '#fff',
                      marginTop: '4px',
                    }}
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        Région de {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeDepartments.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Département</span>
                    <select
                      value={selectedDeptId || ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : undefined;
                        setSelectedDeptId(id);
                        setSelectedCommuneId(undefined);
                      }}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        background: '#fff',
                        marginTop: '4px',
                      }}
                    >
                      <option value="">-- Choisir le département --</option>
                      {activeDepartments.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeCommunes.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Commune</span>
                    <select
                      value={selectedCommuneId || ''}
                      onChange={(e) => setSelectedCommuneId(e.target.value ? Number(e.target.value) : undefined)}
                      style={{
                        width: '100%',
                        padding: '11px 12px',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        background: '#fff',
                        marginTop: '4px',
                      }}
                    >
                      <option value="">-- Choisir la commune --</option>
                      {activeCommunes.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '16px',
                background: '#15803d',
                color: '#fff',
                fontWeight: 900,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(21,128,61,0.25)',
                transition: 'all 0.2s',
              }}
            >
              {isSubmitting ? (
                <>
                  <IonSpinner name="crescent" style={{ width: '20px', height: '20px' }} />
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <>
                  <IonIcon icon={checkmarkCircle} style={{ fontSize: '20px' }} />
                  <span>Valider mon inscription & Commencer</span>
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Fonctionne en mode hors-ligne. Vous pourrez modifier ces informations à tout moment dans l'onglet Paramètres.
            </p>
          </form>
        </div>

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={3500}
          onDidDismiss={() => setToastMessage(null)}
          position="bottom"
        />
      </IonContent>
    </IonModal>
  );
};
