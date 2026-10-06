import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonBadge,
  IonToast,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import {
  sync,
  cloudOffline,
  checkmarkCircle,
  time,
  refresh,
  documentText,
  shieldCheckmark,
} from 'ionicons/icons';
import { getStoredComplaints, markComplaintAsSynced, getStoredProfile, OfflineComplaint } from '../services/offlineStorage';
import { syncOfflineBatchApi, fetchMyComplaintsApi } from '../services/api';

const MyComplaints: React.FC = () => {
  const profile = getStoredProfile();
  const [offlineComplaints, setOfflineComplaints] = useState<OfflineComplaint[]>([]);
  const [serverComplaints, setServerComplaints] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    // Load local storage
    const local = getStoredComplaints();
    setOfflineComplaints(local);

    // If phone number exists, fetch server complaints
    if (profile.phone && navigator.onLine) {
      setIsLoading(true);
      try {
        const res = await fetchMyComplaintsApi(profile.phone);
        if (res.success) {
          setServerComplaints(res.complaints);
        }
      } catch (e) {
        console.error('Cannot fetch server complaints', e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNow = async () => {
    const pending = offlineComplaints.filter((c) => !c.synced);
    if (pending.length === 0) {
      setToastMessage('Toutes vos plaintes locales sont déjà synchronisées.');
      return;
    }

    if (!navigator.onLine) {
      setToastMessage('Connexion Internet requise pour la synchronisation.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncOfflineBatchApi(pending);
      if (res.success && res.results) {
        res.results.forEach((r: any) => {
          markComplaintAsSynced(r.offline_client_id, r.tracking_code);
        });
        setToastMessage(`${res.synced_count} plainte(s) synchronisée(s) avec succès !`);
        loadData();
      }
    } catch (e: any) {
      setToastMessage('Erreur lors de la synchronisation : ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return { label: 'Reçue par le bureau régional', color: '#f59e0b', bg: '#fef3c7', icon: time };
      case 'documented':
        return { label: 'En attente de validation', color: '#2563eb', bg: '#dbeafe', icon: documentText };
      case 'validated':
        return { label: 'Validée par le Chef de Bureau', color: '#7c3aed', bg: '#ede9fe', icon: shieldCheckmark };
      case 'in_progress':
        return { label: 'Traitement en cours', color: '#0284c7', bg: '#e0f2fe', icon: time };
      case 'closed':
        return { label: 'Résolue / Clôturée', color: '#16a34a', bg: '#dcfce7', icon: checkmarkCircle };
      default:
        return { label: status, color: '#64748b', bg: '#f1f5f9', icon: time };
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#15803d', color: '#fff' } as React.CSSProperties}>
          <IonTitle style={{ fontWeight: 800, fontSize: '18px' }}>Mes Plaintes & Suivi</IonTitle>
          <IonButton slot="end" fill="clear" onClick={loadData} style={{ color: '#fff' }}>
            <IonIcon icon={refresh} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
        <IonRefresher slot="fixed" onIonRefresh={(e) => { loadData().then(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Offline Sync Banner if pending complaints */}
          {offlineComplaints.some((c) => !c.synced) && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '18px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={cloudOffline} style={{ fontSize: '28px', color: '#d97706' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#92400e' }}>
                    {offlineComplaints.filter((c) => !c.synced).length} plainte(s) en attente d'envoi
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#b45309' }}>
                    Ces plaintes sont stockées sur votre appareil hors connexion.
                  </p>
                </div>
              </div>

              <IonButton
                expand="block"
                onClick={handleSyncNow}
                disabled={isSyncing}
                style={{
                  marginTop: '12px',
                  '--background': '#d97706',
                  '--border-radius': '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                } as React.CSSProperties}>
                {isSyncing ? <IonSpinner name="dots" /> : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IonIcon icon={sync} />
                    <span>Synchroniser maintenant</span>
                  </div>
                )}
              </IonButton>
            </div>
          )}

          {/* List of Offline Complaints */}
          {offlineComplaints.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Plaintes sur cet appareil ({offlineComplaints.length})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {offlineComplaints.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{c.category}</span>
                      <IonBadge color={c.synced ? 'success' : 'warning'} style={{ borderRadius: '8px', padding: '4px 8px' }}>
                        {c.synced ? 'Synchronisé' : 'En attente réseau'}
                      </IonBadge>
                    </div>

                    {c.tracking_code && (
                      <span style={{ display: 'block', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#4338ca', marginTop: '4px' }}>
                        Code : {c.tracking_code}
                      </span>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                      <span>🗓️ {new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                      {c.audio_base64 && <span>🎙️ Vocal</span>}
                      {c.video_base64 && <span>🎥 Vidéo 10s</span>}
                      {c.photo_base64 && <span>📸 Photo</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Server Complaints */}
          {serverComplaints.length > 0 && (
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Historique officiel ECOPOP ({serverComplaints.length})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {serverComplaints.map((c) => {
                  const badge = getStatusBadge(c.status);
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ display: 'block', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{c.category}</span>
                          <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{c.tracking_code}</span>
                        </div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '10px',
                          background: badge.bg,
                          color: badge.color,
                        }}>
                          <IonIcon icon={badge.icon} />
                          {badge.label}
                        </span>
                      </div>

                      {c.documentation?.comments && (
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px', color: '#334155', fontStyle: 'italic' }}>
                          💬 Réponse ECOPOP : "{c.documentation.comments}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {offlineComplaints.length === 0 && serverComplaints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <IonIcon icon={documentText} style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '8px' }} />
              <p style={{ fontWeight: 700, color: '#64748b', margin: 0 }}>Aucune plainte enregistrée pour le moment.</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Utilisez le premier onglet pour envoyer votre première réclamation.</p>
            </div>
          )}

        </div>

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={3500}
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default MyComplaints;
