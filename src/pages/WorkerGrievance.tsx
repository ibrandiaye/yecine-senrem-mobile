import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonToast,
  IonSpinner,
} from '@ionic/react';
import { getStoredProfile } from '../services/offlineStorage';
import { submitWorkerComplaintApi } from '../services/api';

const OBJECTS = [
  'Demande d’informations',
  'Doléances',
  'Réclamations',
  'Défaut de paiement ou retard de salaire',
  'Litige ou différend entre collègues',
  'Condition de travail inadaptées',
  'Litige ou différend avec supérieur hiérarchique',
  'Défaut de prise en charge sociale',
  'Accident de travail',
  'Différend entre l’UGP et les partenaires de mise en œuvre du projet',
  'Différend entre l’UGP et les contractuels du projet',
  'Plaintes liées à la mise en œuvre des activités',
  'VBG/HS/EAS',
  'Autres à préciser',
];

const WorkerGrievance: React.FC = () => {
  const [profile, setProfile] = useState(getStoredProfile());

  const [complainantName, setComplainantName] = useState(profile.name || `${profile.prenom} ${profile.nom}`.trim());
  const [complainantContacts, setComplainantContacts] = useState(profile.phone || '');
  const [complainantPosition, setComplainantPosition] = useState(profile.role === 'membre_equipe' ? 'Équipe Projet SENREM' : '');
  const [complainantAddress, setComplainantAddress] = useState(profile.region_name ? `Région de ${profile.region_name}` : '');
  const [recordingLocation, setRecordingLocation] = useState(profile.region_name ? `Bureau d'appui ${profile.region_name}` : "Siège de l'UGP");
  const [receptionChannel, setReceptionChannel] = useState('Application Mobile YECITE');
  const [complaintObject, setComplaintObject] = useState('Condition de travail inadaptées');
  const [complaintOrigin, setComplaintOrigin] = useState("Personnel de l'UGP");
  const [complaintCategory, setComplaintCategory] = useState<'Générales' | 'Sensibles'>('Générales');
  const [description, setDescription] = useState('');
  const [proposedSolutions, setProposedSolutions] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      const p = getStoredProfile();
      setProfile(p);
      if (p.name) setComplainantName(p.name);
      if (p.phone) setComplainantContacts(p.phone);
      if (p.region_name) setComplainantAddress(`Région de ${p.region_name}`);
    };
    handleUpdate();
    window.addEventListener('yecite-profile-updated', handleUpdate);
    return () => window.removeEventListener('yecite-profile-updated', handleUpdate);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complainantName || !description) {
      setToastMessage('Veuillez remplir votre nom et la description des faits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('complainant_name', complainantName);
      formData.append('complainant_contacts', complainantContacts);
      formData.append('complainant_position', complainantPosition);
      formData.append('complainant_address', complainantAddress);
      formData.append('recording_location', recordingLocation);
      formData.append('reception_channel', receptionChannel);
      formData.append('complaint_object', complaintObject);
      formData.append('complaint_origin', complaintOrigin);
      formData.append('complaint_category', complaintCategory);
      formData.append('description', description);
      formData.append('proposed_solutions', proposedSolutions);
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const res = await submitWorkerComplaintApi(formData);
      setToastMessage(`Formulaire transmis directement au Coordonnateur ! Réf : ${res.reference_number}`);
      setDescription('');
      setProposedSolutions('');
      setAttachmentFile(null);
    } catch (err: any) {
      setToastMessage(err.message || 'Erreur lors de la transmission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTeamMember = profile.role === 'membre_equipe';

  if (!isTeamMember) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar style={{ '--background': '#0f172a', color: '#fff' } as React.CSSProperties}>
            <IonTitle style={{ fontWeight: 800, fontSize: '18px' }}>Espace Réservé</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
          <div style={{ maxWidth: '420px', margin: '40px auto', background: '#fff', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px auto' }}>
              🔒
            </div>
            <h3 style={{ fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0', fontSize: '17px' }}>Accès Réservé à l'Équipe Enda ECOPOP</h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Cette fiche est exclusivement dédiée aux travailleurs et contractuels du projet. En tant que producteur ou distributeur, vos doléances s'effectuent depuis l'onglet <strong>Déposer</strong>.
            </p>
            <IonButton routerLink="/submit" style={{ '--background': '#15803d', '--border-radius': '14px', fontWeight: 800 } as React.CSSProperties}>
              Aller au formulaire de plainte
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#0f172a', color: '#fff' } as React.CSSProperties}>
          <IonTitle style={{ fontWeight: 800, fontSize: '18px' }}>Fiche Travailleur & Contractuel</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as React.CSSProperties}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: '#0f172a', color: '#fff', borderRadius: '18px', padding: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase' }}>
              Formulaire Officiel UGP SENREM
            </span>
            <h2 style={{ margin: '4px 0', fontSize: '16px', fontWeight: 800 }}>Plaintes Internes & Doléances</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Cette fiche est transmise <strong>directement au Coordonnateur National</strong> sans passer par les bureaux régionaux.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '20px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Nom complet *</label>
              <input
                type="text"
                required
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Téléphone / Email *</label>
                <input
                  type="text"
                  required
                  value={complainantContacts}
                  onChange={(e) => setComplainantContacts(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Fonction / Poste</label>
                <input
                  type="text"
                  value={complainantPosition}
                  onChange={(e) => setComplainantPosition(e.target.value)}
                  placeholder="Ex: Formateur, Expert..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Provenance</label>
              <select
                value={complaintOrigin}
                onChange={(e) => setComplaintOrigin(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}>
                <option value="Personnel de l'UGP">Personnel de l'UGP</option>
                <option value="Partenaires de mise en œuvre du projet">Partenaires de mise en œuvre</option>
                <option value="Contractuels du projet (assistance techniques, entrepreneurs, etc)">Contractuels du projet</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Objet de la plainte *</label>
              <select
                value={complaintObject}
                onChange={(e) => setComplaintObject(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}>
                {OBJECTS.map((obj) => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Catégorie</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setComplaintCategory('Générales')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: complaintCategory === 'Générales' ? '2px solid #0f172a' : '1px solid #cbd5e1',
                    background: complaintCategory === 'Générales' ? '#f1f5f9' : '#fff',
                  }}>
                  Générale
                </button>
                <button
                  type="button"
                  onClick={() => setComplaintCategory('Sensibles')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: complaintCategory === 'Sensibles' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    background: complaintCategory === 'Sensibles' ? '#fef2f2' : '#fff',
                    color: complaintCategory === 'Sensibles' ? '#dc2626' : '#64748b',
                  }}>
                  Sensible (Alerte)
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Description des faits *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détaillez les événements, la date, les personnes impliquées et les préjudices..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Solutions proposées par le plaignant</label>
              <textarea
                rows={2}
                value={proposedSolutions}
                onChange={(e) => setProposedSolutions(e.target.value)}
                placeholder="Quelle issue équitable suggérez-vous ?"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Pièce justificative (optionnelle)</label>
              <input
                type="file"
                onChange={(e) => setAttachmentFile(e.target.files ? e.target.files[0] : null)}
                style={{ fontSize: '12px' }}
              />
            </div>

            <IonButton
              type="submit"
              expand="block"
              disabled={isSubmitting}
              style={{
                '--background': '#0f172a',
                '--border-radius': '14px',
                height: '48px',
                fontWeight: 800,
                marginTop: '10px',
              } as React.CSSProperties}>
              {isSubmitting ? <IonSpinner name="crescent" /> : 'Transmettre à la Coordination'}
            </IonButton>
          </form>

        </div>

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage || ''}
          duration={4000}
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default WorkerGrievance;
