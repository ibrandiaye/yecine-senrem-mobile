import React, { useState, useEffect } from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { addCircle, list, briefcase, settings } from 'ionicons/icons';
import SubmitComplaint from './pages/SubmitComplaint';
import MyComplaints from './pages/MyComplaints';
import WorkerGrievance from './pages/WorkerGrievance';
import SettingsPage from './pages/SettingsPage';
import { getStoredProfile, UserProfile } from './services/offlineStorage';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(getStoredProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getStoredProfile());
    };

    window.addEventListener('yecite-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('yecite-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const isTeamMember = profile.role === 'membre_equipe';

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/submit" element={<SubmitComplaint />} />
            <Route path="/my-complaints" element={<MyComplaints />} />
            <Route
              path="/worker"
              element={isTeamMember ? <WorkerGrievance /> : <Navigate to="/submit" replace />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/submit" replace />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom" style={{ '--background': '#ffffff', borderTop: '1px solid #e2e8f0', height: '60px' } as any}>
            <IonTabButton tab="submit" href="/submit" style={{ '--color-selected': '#15803d' } as any}>
              <IonIcon aria-hidden="true" icon={addCircle} />
              <IonLabel style={{ fontWeight: 700, fontSize: '11px' }}>Déposer</IonLabel>
            </IonTabButton>
            <IonTabButton tab="my-complaints" href="/my-complaints" style={{ '--color-selected': '#15803d' } as any}>
              <IonIcon aria-hidden="true" icon={list} />
              <IonLabel style={{ fontWeight: 700, fontSize: '11px' }}>Mes Plaintes</IonLabel>
            </IonTabButton>

            {/* Fiche réservée exclusivement à l'équipe Enda ECOPOP (masquée pour producteurs et distributeurs) */}
            {isTeamMember && (
              <IonTabButton tab="worker" href="/worker" style={{ '--color-selected': '#15803d' } as any}>
                <IonIcon aria-hidden="true" icon={briefcase} />
                <IonLabel style={{ fontWeight: 700, fontSize: '11px' }}>Équipe UGP</IonLabel>
              </IonTabButton>
            )}

            <IonTabButton tab="settings" href="/settings" style={{ '--color-selected': '#15803d' } as any}>
              <IonIcon aria-hidden="true" icon={settings} />
              <IonLabel style={{ fontWeight: 700, fontSize: '11px' }}>Paramètres</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
