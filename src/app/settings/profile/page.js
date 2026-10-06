// Profile page: profile details first, then the Data section below it. Author: Satvik Hemant Gupta
import ProfileTab from '../../../components/settings/ProfileTab/ProfileTab.jsx';
import DataTab from '../../../components/settings/DataTab/DataTab.jsx';
import styles from './ProfilePage.module.css';

export const metadata = { title: 'Profile' };

export default function SettingsProfilePage() {
  return (
    <div className={styles.stack}>
      <ProfileTab />
      <DataTab />
    </div>
  );
}
