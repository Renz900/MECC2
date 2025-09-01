import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Accounts.css';
import DepositWithdrawForm from '../DepositWithdrawForm/DepositWithdrawForm';
import { PiHandDepositFill } from 'react-icons/pi';
import { BiMoneyWithdraw } from 'react-icons/bi';

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionType, setActionType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshArchives, setRefreshArchives] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [accountLoans, setAccountLoans] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const formatNumber = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat('en-US').format(number);
  };

  useEffect(() => {
    fetchAccounts();
    fetchLoans();
  }, []);

  useEffect(() => {
    axios.get('http://localhost:8000/archives/?archive_type=Account')
      .then(response => setArchivedAccounts(response.data || []))
      .catch(error => console.error('Error fetching archived accounts:', error));
  }, [refreshArchives]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/accounts/');
      setAccounts(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await axios.get('http://localhost:8000/loans/');
      setAccountLoans(response.data);
    } catch (err) {
      console.error('Error fetching loans:', err.response || err);
    }
  };

  const has_ongoing_loan = (account_number) => {
    return accountLoans.some(loan => {
      const isThisAccount = loan.account === account_number;
      const isOngoing = loan.status.toLowerCase() === 'ongoing';
      const isFullyPaid = loan.payment_schedules?.every(
        (schedule) => schedule.status?.toLowerCase() === 'paid'
      );
      return isThisAccount && isOngoing && !isFullyPaid;
    });
  };

  const openForm = (account, type) => {
    if (type === 'withdraw') {
      setModalContent({
        message: `Do you want to withdraw the full amount of ${Number(account.shareCapital).toLocaleString()}?\n\nNotice!: Your Account will be marked Inactive.`,
        onConfirm: () => {
          setSelectedAccount({ ...account, fullWithdrawal: account.shareCapital });
          setActionType(type);
          setShowForm(true);
          closeModal();
        },
        onConfirmHalf: () => {
          setSelectedAccount({
            ...account,
            fullWithdrawal: String(Number(account.shareCapital) / 2),
            shareCapital: String(Number(account.shareCapital) / 2),
          });
          setActionType(type);
          setShowForm(true);
          closeModal();
        },
      });
      setShowModal(true);
    } else {
      setSelectedAccount(account);
      setActionType(type);
      setShowForm(true);
    }
  };

  const handleDepositWithdrawErrors = (error) => {
    if (actionType === 'deposit') {
      if (error.response && error.response.data) {
        if (error.response.data.amount < 50000) {
          return 'The deposit amount must be at least 50,000.';
        } else if (error.response.data.amount > 1000000) {
          return 'The account already has the maximum allowed share capital of 1,000,000.';
        }
      }
      return 'Deposits must be between 50,000 and 1,000,000.';
    } else if (actionType === 'withdraw') {
      if (error.response && error.response.data) {
        return 'No share capital available to be withdrawn.';
      }
      return 'You have No Share Capital amount to withdraw.';
    }
    return 'An unexpected error occurred.';
  };

  const openArchiveConfirmation = (account) => {
    setModalContent({
      message: `Are you sure you want to move this account to archive?\n\nThis action will remove the account from active records.`,
      onConfirm: () => {
        archiveAccount(account);
        closeModal();
      },
    });
    setShowModal(true);
  };

const archiveAccount = async (account) => {
  try {
    // 1. Archive the Account
    const archivePayload = {
      archive_type: 'Account',
      archived_data: account,
      id: account.id,
      account_number: account.account_number,
    };

    const accountArchiveResponse = await axios.post('http://localhost:8000/archives/', archivePayload);
    await axios.delete(`http://localhost:8000/accounts/${account.account_number}/`);
    console.log(`✅ Account ${account.account_number} archived.`);

    // 2. Prepare Member Archiving
    const holder = account.account_holder;

    if (!holder) {
      console.warn(`⚠️ No account_holder found for account ${account.account_number}. Member will not be archived.`);
    } else {
      const memberId = holder.memId || holder.member_id || holder.id;
      if (!memberId) {
        console.warn(`⚠️ Could not extract member ID for account ${account.account_number}`);
      } else {
        try {
          const memberDetails = await axios.get(`http://localhost:8000/members/${memberId}/`);
          const memberArchivePayload = {
            archive_type: 'Member',
            archived_data: memberDetails.data,
          };
          await axios.post('http://localhost:8000/archives/', memberArchivePayload);
          console.log(`👤 Member ${memberId} archived.`);
        } catch (memberErr) {
          console.error(`❌ Failed to fetch/archive member ${memberId}:`, memberErr.response?.data || memberErr.message);
        }
      }
    }

    // 3. Update State
    setNotificationMessage('Account and Member successfully archived.');
    setTimeout(() => setNotificationMessage(''), 4000);
    setAccounts(prev => prev.filter(acc => acc.account_number !== account.account_number));
    setRefreshArchives(prev => !prev);

  } catch (err) {
    console.error('❌ Error archiving account/member:', err.response?.data || err.message);
    setNotificationMessage(`An error occurred: ${err.response?.data?.message || err.message || 'Unknown error'}`);
    setTimeout(() => setNotificationMessage(''), 4000);
  }
};

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedAccount(null);
    setActionType('');
  };

  const Modal = ({ isOpen, content }) => {
    if (!isOpen || !content) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        textAlign: 'center',
        width: '420px'
      }}>
        <p style={{ fontSize: '18px', marginBottom: '20px' }}>
          {content.message.split('\n').map((line, index) => {
            if (line.trim().toLowerCase().startsWith('notice')) {
              const [noticeWord, ...rest] = line.split(':');
              return (
                <React.Fragment key={index}>
                  <span style={{ color: 'red', fontWeight: 'bold' }}>{noticeWord}:</span>
                  <span> {rest.join(':')}</span>
                  <br />
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            );
          })}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button onClick={content.onConfirm} style={{ padding: '8px 16px' }}>Yes</button>
          {/* Optional: <button onClick={content.onConfirmHalf}>50%</button> */}
          <button onClick={closeModal} style={{ padding: '8px 16px' }}>No</button>
        </div>
      </div>
    </div>
  );
  };

  const NotificationBox = ({ message, onClose }) => {
    if (!message) return null;

    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '10px 10px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        zIndex: 1,
        textAlign: 'center',
        width: '300px',
      }}>
        <p style={{ fontSize: '18px', color: 'black', marginBottom: '20px' }}>{message}</p>
        <button onClick={onClose} style={{
          padding: '6px 20px',
          border: 'none',
          backgroundColor: '#007BFF',
          color: 'white',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>OK</button>
      </div>
    );
  };

  const getAccountHolderName = (member) => {
    if (member && member.first_name && member.middle_name && member.last_name) {
      return `${member.first_name} ${member.middle_name} ${member.last_name}`;
    }
    return 'Account Holder Not Found';
  };

  const filteredAccounts = accounts.filter((account) => {
    const accountNumber = account.account_number.toString();
    const accountHolderName = getAccountHolderName(account.account_holder).toLowerCase();
    return (
      accountNumber.includes(searchQuery.toLowerCase()) ||
      accountHolderName.includes(searchQuery.toLowerCase())
    );
  });

  if (loadingAccounts) {
    return <div>Loading...</div>;
  }

  if (error) {
    const errorMessage = handleDepositWithdrawErrors(error);
    return <div style={{ fontSize: '30px' }}>{errorMessage}</div>;
  }

  return (
    <div style={{ width: '99%', padding: '10px' }}>
      <h2 style={{ width: '97%', padding: '20px', textAlign: 'center', color: 'black', fontSize: '30px' }}>
        ACCOUNTS
      </h2>

      {!showForm && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <input
              type="text"
              placeholder="Search Accounts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 10px',
                fontSize: '16px',
                borderRadius: '4px',
                width: '250px',
                marginBottom: '10px',
              }}
            />
          </div>

          <div
            style={{
              maxHeight: '460px',
              overflowY: 'auto',
              boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)',
              marginTop: '20px',
              padding: '5px',
              borderRadius: '5px',
            }}
          >
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid black', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Account Number</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Account Holder</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Share Capital</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => {
                  const disabledWithdraw = has_ongoing_loan(account.account_number);
                  return (
                    <tr key={account.account_number} style={{ fontSize: '16px' }}>
                      <td style={{ padding: '5px' }}>{account.account_number}</td>
                      <td style={{ padding: '5px' }}>{getAccountHolderName(account.account_holder)}</td>
                      <td style={{ padding: '5px' }}>{Number(account.shareCapital).toLocaleString()}</td>
                      <td style={{ padding: '5px',color: account.status.toLowerCase() === 'active' ? 'green' : 'red',fontWeight: 'bold',textTransform: 'capitalize'}}>{account.status}</td>
                      <td style={{ padding: '5px', display: 'flex', gap: '5px' }}>
                        {account.status.toLowerCase() === 'active' ? (
                          <>
                            <button
                              onClick={() => openForm(account, 'deposit')}
                              style={{
                                border: '0px',
                                padding: '5px',
                                cursor: 'pointer',
                                color: 'black',
                                width: '60px',
                              }}
                            >
                              <PiHandDepositFill /> Deposit
                            </button>
                            <button
                              onClick={() => openForm(account, 'withdraw')}
                              disabled={disabledWithdraw}
                              title={disabledWithdraw ? 'Cannot withdraw with ongoing loan' : ''}
                              style={{
                                border: '0px',
                                padding: '5px',
                                cursor: disabledWithdraw ? 'not-allowed' : 'pointer',
                                color: 'black',
                                width: '60px',
                              }}
                            >
                              <BiMoneyWithdraw /> Withdraw
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openArchiveConfirmation(account)}
                            style={{
                              border: '0px',
                              padding: '5px',
                              cursor: 'pointer',
                              color: 'black',
                              backgroundColor: 'goldenrod',
                              width: '100px',
                            }}
                          >
                            Move to Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <DepositWithdrawForm
          onClose={closeForm}
          account={selectedAccount}
          actionType={actionType}
          fetchAccounts={fetchAccounts}
          setError={setError}
        />
      )}

      <Modal isOpen={showModal} content={modalContent} />
      <NotificationBox message={notificationMessage} onClose={() => setNotificationMessage('')} />
    </div>
  );
}

export default Accounts;