import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Archive from '../Archive/Archive';
import AuditT from '../AuditT/AuditT';
import Usermgmt from '../Usermgmt/Usermgmt';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaArchive, FaUsers, FaHistory } from 'react-icons/fa';

const SystemSettings = () => {
    const [settings, setSettings] = useState({
        interest_rate: 0,
        service_fee_rate_emergency: 0,
        penalty_rate: 0,
        service_fee_rate_regular_1yr: 0,
        service_fee_rate_regular_2yr: 0,
        service_fee_rate_regular_3yr: 0,
        service_fee_rate_regular_4yr: 0,
    });

    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('Settings'); // <- New state
    const navigate = useNavigate();

useEffect(() => {
  if (activeView === 'Settings') {
    axios.get('http://127.0.0.1:8000/api/system-settings/')
      .then(({ data }) => {
        const normalized = Object.fromEntries(
          Object.entries(data).map(([k, v]) => {
            const lk = k.toLowerCase();
            const n = Number(v ?? 0);
            if (['id', 'admincost_r', 'notarialfee_r'].includes(lk)) {
              return [k, n];
            }
            // convert to decimal if it's already percent
            return [k, n >= 1 ? n / 100 : n];
          })
        );
        setSettings(normalized);
      })
      .catch(err => {
        setError('Error fetching system settings.');
        console.error('System Settings API Error:', err.response || err);
      });
  }
}, [activeView]);


    const handleChange = e => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleUpdate = () => {
        axios
            .put('http://127.0.0.1:8000/api/system-settings/', settings)
            .then(response => {
                setSettings(response.data);
                setIsEditing(false);
            })
            .catch(err => {
                setError('Error updating system settings.');
                console.error('Update Settings Error:', err.response || err);
            });
    };

    const handleMenuItemClick = menuItem => {
        setActiveView(menuItem);
    };

    return (
        <div>
            {/* Navbar */}
            <nav className="navbar" style={{ display: 'flex', justifyContent: 'center', padding: '10px', gap: '430px' }}>
                <a className="nav-item" onClick={() => handleMenuItemClick('Settings')} style={{
        ...navStyle,
        ...(activeView === 'Settings' ? activeNavStyle : {})
    }}>
                    <FaCog /> System Settings
                </a>
                <a className="nav-item" onClick={() => handleMenuItemClick('Archive')} style={{
        ...navStyle,
        ...(activeView === 'Archive' ? activeNavStyle : {})
    }}>
                    <FaArchive /> Archive Records
                </a>
                <a className="nav-item" onClick={() => handleMenuItemClick('Usermgmt')} style={{
        ...navStyle,
        ...(activeView === 'Usermgmt' ? activeNavStyle : {})
    }}>
                    <FaUsers /> User 
                </a>
            </nav>

            {/* Conditional Views */}
            {activeView === 'Settings' && (
                <div className="system-settings" style={{ padding: '5px' }}>
                    <h2 style={{ color: 'black', textAlign: 'center', marginTop: '20px' }}>System Settings</h2>
                    {error && <div className="error" style={{ color: 'red', textAlign: 'center' }}>{error}</div>}

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px',  boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)'}}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid black'}}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Setting</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Value</th>
                            </tr>
                        </thead>
<tbody>
  {Object.keys(settings).map((key) => {
    const lowerKey = key.toLowerCase();

    // classify fields
    const isPercentField = !['id', 'admincost_r', 'notarialfee_r'].includes(lowerKey);
    const isMoneyField = ['admincost_r', 'notarialfee_r'].includes(lowerKey);

    // raw number from backend (already decimal for percent fields)
    const rawNum = Number(settings[key] ?? 0);

    // value for display in table
    const displayValue = isPercentField
      ? `${(rawNum * 100).toFixed(2)}%`
      : isMoneyField
        ? `₱${rawNum.toFixed(2)}`
        : rawNum.toFixed(2);

    // value for editing input (percent shown as 9, not 0.09)
    const inputValue = isPercentField
      ? (rawNum * 100).toString() // convert decimal back to whole percent
      : rawNum.toString();

    return (
      <tr key={key}>
        <td style={{ padding: '5px' }}>{key.replace(/_/g, ' ').toUpperCase()}:</td>
        <td style={{ padding: '5px' }}>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              name={key}
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setSettings((prev) => ({
                  ...prev,
                  [key]: val === ""
                    ? "" // allow empty input without forcing 0
                    : isPercentField
                      ? Number(val) / 100 // store decimal
                      : Number(val)
                }));
              }}
              style={inputStyle}
            />
          ) : (
            <span>{displayValue}</span>
          )}
        </td>
      </tr>
    );
  })}
</tbody>



                    </table>

                    <div style={{ marginTop: '20px', textAlign: 'center'}}>
                        {isEditing ? (
                            <>
                                <button onClick={handleUpdate} style={buttonStyle('#4CAF50')}>Save Changes</button>
                                <button onClick={() => setIsEditing(false)} style={buttonStyle('#f44336')}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsEditing(true)} style={buttonStyle('#D2B450')}>Edit Settings</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeView === 'Archive' && (
                <div className="archive-section" style={{ marginTop: '20px' }}>
                    <Archive />
                </div>
            )}
            {activeView === 'AuditT' && (
                <div className="logs-section" style={{ marginTop: '20px' }}>
                    <AuditT />
                </div>
            )}

            {activeView === 'Usermgmt' && (
                <div className="usermgmt-section" style={{ marginTop: '20px' }}>
                    <Usermgmt/>
                </div>
            )}
        </div>
    );
};

export default SystemSettings;

// Style helpers
const navStyle = {
    color: 'black',
    fontSize: '18px',
    textDecoration: 'none',
    cursor: 'pointer',
    padding: '10px',
    transition: 'all 0.3s ease',
    color: '#6c7378',
};

const activeNavStyle = {
    boxShadow: 'rgba(0, 0, 0, 0.15) 0 0 0.625rem',
    backgroundColor: '#ede9c7', // optional for clearer visual
    borderRadius: '25px',
    color: 'black',
};

const inputStyle = {
    width: '70px',
    padding: '5px',
    borderRadius: '5px',
    border: '1px solid black',
    height: '20px',
};

const buttonStyle = (bgColor) => ({
    padding: '10px 20px',
    margin: '0 10px',
    backgroundColor: bgColor,
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
});
