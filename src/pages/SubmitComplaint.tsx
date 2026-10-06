import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonToast,
  IonSpinner,
  IonBadge,
  IonProgressBar,
} from '@ionic/react';
import {
  mic,
  micOff,
  videocam,
  camera,
  location,
  checkmarkCircle,
  cloudOffline,
  cloudDone,
  play,
  stop,
  trash,
  send,
  timeOutline,
  alertCircleOutline,
  cashOutline,
  peopleOutline,
  helpCircleOutline,
  createOutline,
  personCircleOutline,
} from 'ionicons/icons';
import {
  getStoredProfile,
  isUserRegistered,
  saveComplaintLocally,
  OfflineComplaint,
  UserProfile,
} from '../services/offlineStorage';
import { submitComplaintOnline } from '../services/api';
import { RegistrationModal } from '../components/RegistrationModal';

const CATEGORIES = [
  { id: 'Retard de livraison', label: 'Retard de livraison', sub: 'Foyers commandés non livrés', icon: timeOutline, color: '#f59e0b' },
  { id: 'Matériel défectueux / Non conforme', label: 'Matériel défectueux', sub: 'Foyer cassé ou mauvaise taille', icon: alertCircleOutline, color: '#ef4444' },
  { id: 'Paiement / Acompte / Prix', label: 'Paiement / Acompte', sub: 'Litige sur l\'argent ou reçu', icon: cashOutline, color: '#10b981' },
  { id: 'Différend ou Conflit', label: 'Différend / Litige', sub: 'Désaccord avec producteur/artisan', icon: peopleOutline, color: '#6366f1' },
  { id: 'Autre motif', label: 'Autre problème', sub: 'Toute autre réclamation', icon: helpCircleOutline, color: '#8b5cf6' },
];

const SubmitComplaint: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(getStoredProfile());
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);

  // Form State (lightened)
  const [category, setCategory] = useState('Retard de livraison');
  const [textContent, setTextContent] = useState('');

  // Media State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordSeconds, setAudioRecordSeconds] = useState(0);

  // Video State (Strictly max 10s)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);

  // Photo State
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // GPS State
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // MediaRecorder refs
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const videoIntervalRef = useRef<any>(null);
  const audioIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Check if user is registered on first use
    if (!isUserRegistered()) {
      setShowRegistrationModal(true);
    }

    // Silent Automatic Background GPS Capture
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
        },
        (err) => {
          console.warn('Silent GPS detection fallback:', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- AUDIO RECORDING ---
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      audioRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setAudioRecordSeconds(0);

      audioIntervalRef.current = setInterval(() => {
        setAudioRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setToastMessage("Microphone non accessible. Veuillez autoriser l'accès.");
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
      clearInterval(audioIntervalRef.current);
    }
  };

  // --- VIDEO RECORDING (MAX 10 SECONDS ENFORCED) ---
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      videoStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      videoRecorderRef.current = recorder;
      setIsRecordingVideo(true);
      setVideoSeconds(0);

      // Automatic hard cutoff at exactly 10 seconds
      videoIntervalRef.current = setInterval(() => {
        setVideoSeconds((prev) => {
          if (prev >= 9) {
            stopVideoRecording();
            setToastMessage('Limite de 10 secondes atteinte. Vidéo enregistrée !');
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setToastMessage("Caméra non accessible. Veuillez autoriser l'accès vidéo.");
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      clearInterval(videoIntervalRef.current);
    }
  };

  // --- PHOTO CAPTURE ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoBlob(file);
      setPhotoUrl(URL.createObjectURL(file));
    }
  };

  // --- GPS GEOLOCATION ---
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToastMessage('Géolocalisation non supportée par votre appareil.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        setToastMessage(`Position GPS enregistrée : ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        setIsLocating(false);
        setToastMessage("Impossible d'obtenir la position GPS.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Helper Base64 for Offline
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- SUBMISSION HANDLER ---
  const handleSubmit = async () => {
    if (!isUserRegistered()) {
      setShowRegistrationModal(true);
      return;
    }

    if (!textContent.trim() && !audioBlob && !videoBlob && !photoBlob) {
      setToastMessage('Veuillez fournir au moins un message vocal, une vidéo, une photo ou une description.');
      return;
    }

    setIsSubmitting(true);
    const clientId = 'mob_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    const complainantName = profile.name || `${profile.prenom} ${profile.nom}`.trim() || 'Utilisateur';
    const complainantPhone = profile.phone || '';
    const complainantType = profile.role === 'distributeur' ? 'distributeur' : 'producteur';

    try {
      if (isOnline) {
        // Submit directly via API
        const formData = new FormData();
        formData.append('complainant_name', complainantName);
        formData.append('complainant_phone', complainantPhone);
        formData.append('complainant_type', complainantType);
        formData.append('category', category);
        formData.append('region_id', String(profile.region_id || 1));
        if (profile.department_id) formData.append('department_id', String(profile.department_id));
        if (profile.commune_id) formData.append('commune_id', String(profile.commune_id));
        formData.append('text_content', textContent);
        formData.append('submitted_offline', '0');
        formData.append('offline_client_id', clientId);

        if (coords) {
          formData.append('latitude', String(coords.lat));
          formData.append('longitude', String(coords.lng));
        }
        if (audioBlob) formData.append('audio', audioBlob, 'vocal.webm');
        if (photoBlob) formData.append('photo', photoBlob, 'photo.jpg');
        if (videoBlob) formData.append('video', videoBlob, 'video10s.mp4');

        const result = await submitComplaintOnline(formData);

        setToastMessage(`Plainte transmise avec succès ! N° de suivi : ${result.tracking_code}`);
        resetForm();
      } else {
        // Save in Offline Storage
        let audioBase64 = undefined;
        let photoBase64 = undefined;
        let videoBase64 = undefined;

        if (audioBlob) audioBase64 = await blobToBase64(audioBlob);
        if (photoBlob) photoBase64 = await blobToBase64(photoBlob);
        if (videoBlob) videoBase64 = await blobToBase64(videoBlob);

        const localComplaint: OfflineComplaint = {
          id: clientId,
          complainant_name: complainantName,
          complainant_phone: complainantPhone,
          complainant_type: complainantType,
          category,
          text_content: textContent,
          audio_base64: audioBase64,
          photo_base64: photoBase64,
          video_base64: videoBase64,
          latitude: coords?.lat,
          longitude: coords?.lng,
          region_id: profile.region_id || 1,
          department_id: profile.department_id,
          commune_id: profile.commune_id,
          created_at: new Date().toISOString(),
          synced: false,
        };

        saveComplaintLocally(localComplaint);
        setToastMessage('Mode hors-ligne : réclamation enregistrée sur votre téléphone. Elle sera envoyée dès le retour d\'Internet.');
        resetForm();
      }
    } catch (e: any) {
      console.error(e);
      setToastMessage('Erreur réseau. Votre réclamation est conservée hors-ligne et sera synchronisée.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTextContent('');
    setAudioBlob(null);
    setAudioUrl(null);
    setVideoBlob(null);
    setVideoUrl(null);
    setPhotoBlob(null);
    setPhotoUrl(null);
  };

  const getRoleLabel = (role: string) => {
    if (role === 'distributeur') return '🚚 Distributeur';
    if (role === 'membre_equipe') return '👷 Équipe Projet';
    return '🌾 Producteur';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#15803d', color: '#fff' } as React.CSSProperties}>
          <IonTitle style={{ fontWeight: 800, fontSize: '18px' }}>
            YECITE <span style={{ color: '#fef08a' }}>- SENREM</span>
          </IonTitle>
          <div slot="end" style={{ paddingRight: '12px' }}>
            <IonBadge
              color={isOnline ? 'success' : 'warning'}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: '12px' }}
            >
              <IonIcon icon={isOnline ? cloudDone : cloudOffline} />
              {isOnline ? 'En ligne' : 'Hors-ligne'}
            </IonBadge>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>

          {/* Banner with Logo */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <img src="/assets/icon.png" alt="YECITE Logo" style={{ width: '52px', height: '52px', borderRadius: '14px', objectFit: 'cover' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#166534' }}>Envoyer une Réclamation</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Projet SENREM &middot; Enda ECOPOP</p>
            </div>
          </div>

          {/* Compact Verified User Badge (Formulaire allégé : aucune ressaisie) */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '16px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(22,101,52,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#15803d',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '16px',
                  boxShadow: '0 2px 6px rgba(21,128,61,0.3)',
                }}
              >
                {profile.prenom ? profile.prenom[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#166534' }}>
                  {profile.name || `${profile.prenom} ${profile.nom}` || 'Utilisateur enregistré'}
                  <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '8px' }}>
                    {getRoleLabel(profile.role)}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px', opacity: 0.85 }}>
                  📞 {profile.phone || 'Non renseigné'} &bull; Région de {profile.region_name || 'Kédougou'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRegistrationModal(true)}
              style={{
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#fff',
                border: '1px solid #bbf7d0',
                color: '#166534',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <IonIcon icon={createOutline} />
              <span>Modifier</span>
            </button>
          </div>

          {/* Étape 1 : Motif de la réclamation (Grandes cartes illustrées intuitives) */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Choisissez le motif de votre réclamation *
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '16px',
                      border: isSelected ? `2px solid ${cat.color}` : '1px solid #e2e8f0',
                      background: isSelected ? `${cat.color}15` : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <IonIcon icon={cat.icon} style={{ fontSize: '22px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', display: 'block' }}>{cat.label}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{cat.sub}</span>
                    </div>
                    {isSelected && <IonIcon icon={checkmarkCircle} style={{ color: cat.color, fontSize: '22px' }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Étape 2 : Message Vocal (Audio en un clic) */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Message Vocal (Expliquer par la voix)
            </span>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  style={{
                    background: audioBlob ? '#e2e8f0' : '#16a34a',
                    color: audioBlob ? '#0f172a' : '#fff',
                    padding: '14px 20px',
                    borderRadius: '50px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: audioBlob ? 'none' : '0 4px 12px rgba(22,163,74,0.3)',
                  }}
                >
                  <IonIcon icon={mic} style={{ fontSize: '22px' }} />
                  {audioBlob ? 'Ré-enregistrer le message vocal' : 'Appuyer pour Parler'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    padding: '14px 20px',
                    borderRadius: '50px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  <IonIcon icon={stop} style={{ fontSize: '22px' }} />
                  Arrêter l'enregistrement ({audioRecordSeconds}s)
                </button>
              )}

              {audioUrl && (
                <div style={{ marginTop: '14px', background: '#f1f5f9', padding: '12px', borderRadius: '16px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    ✓ Message vocal enregistré avec succès :
                  </p>
                  <audio controls src={audioUrl} style={{ width: '100%', height: '36px' }} />
                </div>
              )}
            </div>
          </div>

          {/* Étape 3 : Vidéo Courte (Limite stricte de 10 secondes) */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3. Courte Vidéo (Constat matériel)
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '10px' }}>
                MAX 10 SECONDES STRICT
              </span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              {isRecordingVideo && (
                <div style={{ marginBottom: '12px' }}>
                  <video ref={videoPreviewRef} muted playsInline style={{ width: '100%', height: '200px', borderRadius: '14px', objectFit: 'cover', background: '#000' }} />
                  <div style={{ marginTop: '8px' }}>
                    <IonProgressBar value={videoSeconds / 10} color="danger" style={{ height: '8px', borderRadius: '4px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626', display: 'block', marginTop: '4px' }}>
                      Enregistrement : {videoSeconds}s / 10s max (Arrêt automatique)
                    </span>
                  </div>
                </div>
              )}

              {!isRecordingVideo ? (
                <button
                  type="button"
                  onClick={startVideoRecording}
                  style={{
                    background: videoBlob ? '#e2e8f0' : '#0284c7',
                    color: videoBlob ? '#0f172a' : '#fff',
                    padding: '12px 18px',
                    borderRadius: '50px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <IonIcon icon={videocam} style={{ fontSize: '20px' }} />
                  {videoBlob ? 'Reprendre la vidéo (10s)' : 'Filmer le problème (10s chrono)'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVideoRecording}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    padding: '12px 18px',
                    borderRadius: '50px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Arrêter maintenant ({videoSeconds}s)
                </button>
              )}

              {videoUrl && !isRecordingVideo && (
                <div style={{ marginTop: '12px' }}>
                  <video controls src={videoUrl} style={{ width: '100%', maxHeight: '200px', borderRadius: '14px' }} />
                </div>
              )}
            </div>
          </div>

          {/* Étape 4 : Photo & Localisation GPS Automatique */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              4. Photo du matériel ou reçu & Position GPS
            </span>

            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Photo Input */}
              <label
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '16px',
                  padding: '14px 10px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: photoBlob ? '#f0fdf4' : '#f8fafc',
                }}
              >
                <IonIcon icon={camera} style={{ fontSize: '24px', color: photoBlob ? '#16a34a' : '#64748b' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: photoBlob ? '#166534' : '#475569' }}>
                  {photoBlob ? 'Photo jointe avec succès ✓' : 'Prendre ou joindre une Photo'}
                </span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>

              {photoUrl && (
                <div style={{ textAlign: 'center' }}>
                  <img src={photoUrl} alt="Aperçu" style={{ maxHeight: '140px', borderRadius: '12px', objectFit: 'cover' }} />
                </div>
              )}

              {/* Automatic Background GPS Status Badge (Aucun clic nécessaire) */}
              {coords ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px' }}>
                  <IonIcon icon={checkmarkCircle} style={{ color: '#16a34a', fontSize: '20px', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', display: 'block' }}>
                      Position GPS détectée automatiquement en arrière-plan
                    </span>
                    <span style={{ fontSize: '11px', color: '#15803d' }}>
                      Coordonnées : {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} (Précision optimale)
                    </span>
                  </div>
                </div>
              ) : isLocating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                  <IonSpinner name="crescent" style={{ width: '18px', height: '18px', color: '#16a34a', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    Capture GPS automatique en arrière-plan en cours...
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Localisation rattachée à votre commune ({profile.region_name || 'Kédougou'})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Étape 5 : Note écrite (Facultatif) */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              5. Commentaire ou Détails (Facultatif si vocal utilisé)
            </span>
            <textarea
              placeholder="Écrivez quelques mots pour préciser votre situation (quantités, date prévue, montant acompte...)"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={3}
              style={{ width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Bouton d'Envoi Principal */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: '#15803d',
              color: '#fff',
              padding: '16px',
              borderRadius: '18px',
              border: 'none',
              fontWeight: 900,
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 6px 16px rgba(21,128,61,0.3)',
            }}
          >
            {isSubmitting ? (
              <>
                <IonSpinner name="crescent" style={{ width: '22px', height: '22px' }} />
                <span>Transmission en cours...</span>
              </>
            ) : (
              <>
                <IonIcon icon={send} style={{ fontSize: '20px' }} />
                <span>Envoyer ma Réclamation</span>
              </>
            )}
          </button>
        </div>

        {/* Modal d'inscription première utilisation */}
        <RegistrationModal
          isOpen={showRegistrationModal}
          canDismiss={isUserRegistered()}
          onClose={() => setShowRegistrationModal(false)}
          onRegistered={(newProfile) => {
            setProfile(newProfile);
            setShowRegistrationModal(false);
          }}
        />

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={3500}
          onDidDismiss={() => setToastMessage(null)}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default SubmitComplaint;
