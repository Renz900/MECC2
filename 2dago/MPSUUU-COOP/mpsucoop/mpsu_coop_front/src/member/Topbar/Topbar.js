import React, { useState } from 'react'; // Import useState
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTachometerAlt,faExchangeAlt,faUser,faPowerOff,faCreditCard,faHandHoldingUsd} from '@fortawesome/free-solid-svg-icons';
import './Topbar.css';
import coopLogo from './COOP.png'; 

const Topbar = () => {
  const navigate = useNavigate();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false); // State for logout confirmation

  const handleLogout = () => {
    setShowLogoutPopup(true); // Show logout confirmation popup
  };

  const handleLogoutConfirm = () => {
    // Perform logout actions like clearing session, tokens, etc.
    localStorage.clear();
    navigate('/'); // Redirect to login page
  };

  const handleLogoutCancel = () => {
    setShowLogoutPopup(false); // Close the popup without logging out
  };

  const topbarStyle = {
    height: '80px',
    backgroundColor: '#0d512c',
    color: 'goldenrod',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: '0 30px 30px 0',
    position: 'fixed',
    top: '0px',
    left: 0,
    width: '99%',
  };

  const logoContainerStyle = {
    display: 'flex',
    alignItems: 'center',
  };

  const navHeaderStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    margin: 0,
  };

  const navTopbarStyle = {
    listStyle: 'none',
    display: 'flex',
    alignItems: 'center',
    margin: 0,
    padding: 0,
  };

  const navItemStyle = {
    margin: '0 20px',
    cursor: 'pointer'
  };

  const navLinkStyle = {
    textDecoration: 'none',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: '20px',
    gap: 0,
  };

  const navIconStyle = {
    fontSize: '18px',
    marginBottom: '-5px',
  };

  return (
    <div style={topbarStyle}>
      <div style={logoContainerStyle}>
        <img
          src={coopLogo}
          alt="MPSPC COOP Logo"
          style={{
            width: '90px',
            height: '90px',
            marginRight: '10px',
            borderRadius: '47%', 
            marginTop: '1px'
          }}
        />
        <div style={navHeaderStyle}>MPSPC EMPLOYEES CREDIT COOP</div>
      </div>
      <ul style={navTopbarStyle}>
        <li style={navItemStyle}>
          <Link to="/Home" style={navLinkStyle}>
            <FontAwesomeIcon icon={faTachometerAlt} style={navIconStyle} />
            <p>Home</p>
          </Link>
        </li>
        <li style={navItemStyle}>
          <Link to="/infos" style={navLinkStyle}>
            <FontAwesomeIcon icon={faUser} style={navIconStyle} />
            <p>Account</p>
          </Link>
        </li>
        <li style={navItemStyle}>
          <Link to="/accounts" style={navLinkStyle}>
            <FontAwesomeIcon icon={faExchangeAlt} style={navIconStyle} />
            <p>Transaction</p>
          </Link>
        </li>
        {/* <li style={navItemStyle}>
          <Link to="/payments" style={navLinkStyle}>
            <FontAwesomeIcon icon={faCreditCard} style={navIconStyle} />
            <p>Payment</p>
          </Link>
        </li> */}
        <li style={navItemStyle}>
          <Link to="/Loans" style={navLinkStyle}>
            <FontAwesomeIcon icon={faHandHoldingUsd} style={navIconStyle} />
            <p>Loan</p>
          </Link>
        </li>
        {/* Log out button */}
        <li style={navItemStyle}>
          <div onClick={handleLogout} style={navLinkStyle}>
            <FontAwesomeIcon icon={faPowerOff} style={navIconStyle} />
            <p>Log Out</p>
          </div>
        </li>
      </ul>

      {/* Popup Overlay for Logout Confirmation */}
      {showLogoutPopup && (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)',
          color: 'black',
          padding: '20px', 
          borderRadius: '10px', 
          textAlign: 'center', 
          fontSize: '20px'
        }}>
          <p>Are you sure you want to log out?</p>
          <button onClick={handleLogoutConfirm} style={{ marginRight: '10px' }}>Yes</button>
          <button onClick={handleLogoutCancel}>Cancel</button>
        </div>
      </div>
    )}
    </div>
  );
};

export default Topbar;