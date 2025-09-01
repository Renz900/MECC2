import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLandmark, faUsers, faSignOutAlt, faCalendarAlt, faGear, faArchive, faCreditCardAlt, faHistory, faUsersCog, } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import styles from './AdminNavbar.module.css';
import coopLogo from './COOP.png';  

const navItems = [
  { icon: faUsers, label: 'Members', key: 'members' },
  { icon: faLandmark, label: 'Accounts', key: 'accounts' },
  { icon: faCreditCardAlt, label: 'Loans', key: 'loans' },
  { icon: faHistory, label: 'Payments Overview', key: 'payments' },
  { icon: faCalendarAlt, label: 'Payment Schedules', key: 'payment-schedules' },
  // { icon: faArchive, label: 'Archive', key: 'archived-records' },
  // { icon: faUsersCog, label: 'Usermgmt', key: 'user-mgmt' },
  { icon: faGear, label: 'Settings', key: 'system-settings' },
  
];

function AdminNavbar({ onLinkClick }) {
  const navigate = useNavigate(); // Initialize useNavigate hook
  const [showLogoutPopup, setShowLogoutPopup] = useState(false); // State for controlling popup visibility

  const handleLogoutClick = () => {
    setShowLogoutPopup(true); // Show the popup when logout button is clicked
  };

  const handleLogoutConfirm = () => {
    console.log('Log out confirmed');
    navigate('/'); // Perform logout action here (e.g., clearing session, redirecting)
    setShowLogoutPopup(false); // Close the popup after confirmation
  };

  const handleLogoutCancel = () => {
    setShowLogoutPopup(false); // Close the popup if the user cancels
  };

  return (
    <nav className={styles.adminNavbar}>
      <div className={styles.logoContainer}>
        <img
          src={coopLogo}
          alt="MPSPC COOP Logo"
          className={styles.logoImage}
          style={{
            width: '135px',
            height: '130px',
            marginRight: '10px',
            borderRadius: '47%', 
            marginTop: '10px'
          }}
        />
        <h1 className={styles.logoText}>MPSPC EMPLOYEES <br /> CREDIT COOP</h1>
      </div>
      <ul className={styles.navList}>
        {navItems.map((item, index) => (
          <li key={index} className={styles.navItem} onClick={() => onLinkClick(item.key)}>
            <FontAwesomeIcon icon={item.icon} className={styles.navIcon} />
            <span className={styles.navLabel}>{item.label}</span>
          </li>
        ))}
      </ul>
      <div className={styles.logOut} onClick={handleLogoutClick}>
        <FontAwesomeIcon icon={faSignOutAlt} className={styles.logOutIcon} />
        <span className={styles.logOutText}>Log out</span>
      </div>

      {/* Popup Overlay for Logout Confirmation */}
      {showLogoutPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <p>Are you sure you want to log out?</p>
            <button className={styles.popupButton} onClick={handleLogoutConfirm}>Yes</button>
            <button className={styles.popupButton} onClick={handleLogoutCancel}>Cancel</button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default AdminNavbar;
