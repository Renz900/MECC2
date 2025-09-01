import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Archive.css';
import { BsFillPrinterFill } from "react-icons/bs";
import { FaEye, FaCog, FaExclamationTriangle } from "react-icons/fa";

const ArchivedRecords = () => {
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedLoans, setArchivedLoans] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [archivedPayments, setArchivedPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('members');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const handleViewComakers = (loan) => {
    setSelectedLoan(loan);
    setActiveTab('loanDetails');
  };

  // AUTO DELETE STATES
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(
    localStorage.getItem('autoDeleteEnabled') === 'true'
  );
  const [deletionDays, setDeletionDays] = useState(
    parseInt(localStorage.getItem('deletionDays')) || 30
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [warningRecords, setWarningRecords] = useState([]);

  useEffect(() => {
    fetchArchivedData();
    if (autoDeleteEnabled) {
      checkAndAutoDelete();
      const interval = setInterval(checkAndAutoDelete, 3600000);
      return () => clearInterval(interval);
    }
  }, [autoDeleteEnabled, deletionDays]);

  // AUTO DELETE CONFIG COMPONENT
  const AutoDeleteConfig = () => (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', border: '2px solid #ccc', borderRadius: '12px', padding: '30px', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', zIndex: 2000, minWidth: '400px' }}>
      <h3 style={{ marginTop: '0', textAlign: 'center', color: 'black' }}>Auto-Delete Configuration</h3>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <input
            type="checkbox"
            checked={autoDeleteEnabled}
            onChange={(e) => setAutoDeleteEnabled(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontSize: '16px' }}>Enable automatic deletion of archived records</span>
        </label>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Delete records after (days):
        </label>
        <input
          type="number"
          min="1"
          max="365"
          value={deletionDays}
          onChange={(e) => setDeletionDays(parseInt(e.target.value) || 30)}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
          disabled={!autoDeleteEnabled}
        />
        <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
          Records will be automatically deleted after this many days from archive date.
        </small>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setShowConfig(false)}
          style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: '6px', background: '#f5f5f5', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button 
          onClick={handleConfigSave}
          style={{ padding: '10px 20px', border: 'none', borderRadius: '6px', background: '#4CAF50', color: 'white', cursor: 'pointer' }}
        >
          Save Configuration
        </button>
      </div>
      
      {autoDeleteEnabled && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffeaa7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <FaExclamationTriangle style={{ color: '#856404' }} />
            <strong style={{ color: '#856404' }}>Manual Deletion</strong>
          </div>
          <p style={{ margin: '0 0 15px 0', color: '#856404', fontSize: '14px' }}>
            Delete all archive records older than {deletionDays} days right now.
          </p>
          <button
            onClick={handleManualAutoDelete}
            disabled={isDeleting}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#dc3545', color: 'white', cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Expired Records Now'}
          </button>
        </div>
      )}
    </div>
  );

  // WARNING NOTIFICATION COMPONENT
  const WarningNotification = () => (
    warningRecords.length > 0 && (
      <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, maxWidth: '350px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <FaExclamationTriangle style={{ color: '#856404' }} />
          <strong style={{ color: '#856404' }}>Archive Deletion Warning</strong>
        </div>
        <p style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '14px' }}>
          {warningRecords.length} archive records will be automatically deleted in {5 - Math.floor((new Date() - new Date(warningRecords[0]?.archived_at)) / (24 * 60 * 60 * 1000))} day(s).
        </p>
        <button 
          onClick={() => setWarningRecords([])}
          style={{ background: 'none', border: 'none', color: '#856404', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
        >
          Dismiss
        </button>
      </div>
    )
  );

  // SAVE CONFIGURATION
  const handleConfigSave = () => {
    localStorage.setItem('autoDeleteEnabled', autoDeleteEnabled.toString());
    localStorage.setItem('deletionDays', deletionDays.toString());
    setShowConfig(false);
    alert('Auto-delete configuration saved successfully!');
    
    if (autoDeleteEnabled) {
      checkAndAutoDelete();
    }
  };

  // GET TOKEN HELPER
  const getAuthToken = () => {
    const token = localStorage.getItem('accessToken') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('accessToken') || 
                  sessionStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
    
    return token;
  };

  // REMOVE DUPLICATES HELPER
  const removeDuplicates = (array, getKey) => {
    const seen = new Set();
    return array.filter(item => {
      const key = getKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // FETCH ARCHIVED DATA
  const fetchArchivedData = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const [membersResponse, loansResponse, accountsResponse, paymentsResponse] = await Promise.all([
        axios.get('http://localhost:8000/archives/?archive_type=Member', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/archives/?archive_type=Loan', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/archives/?archive_type=Account', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/archives/?archive_type=Payment', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setArchivedUsers(removeDuplicates(membersResponse.data || [], (member) => member.archived_data?.memId || member.id));
      setArchivedLoans(removeDuplicates(loansResponse.data || [], (loan) => loan.archived_data?.control_number || loan.id));
      setArchivedAccounts(removeDuplicates(accountsResponse.data || [], (account) => account.archived_data?.account_number || account.id));
      setArchivedPayments(removeDuplicates(paymentsResponse.data || [], (payment) => payment.id));

    } catch (err) {
      console.error('Error fetching archived data:', err);
      setError('Failed to fetch archived data.');
    } finally {
      setLoading(false);
    }
  };

  // CHECK FOR EXPIRED RECORDS
  const checkAndAutoDelete = async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deletionDays);
      
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() - (deletionDays - 5));
      
      // Find expiring records
      const expiringRecords = [
        ...archivedUsers.filter(u => {
          const archivedDate = new Date(u.archived_at);
          return archivedDate < warningDate && archivedDate > cutoffDate;
        }),
        ...archivedLoans.filter(l => {
          const archivedDate = new Date(l.archived_at);
          return archivedDate < warningDate && archivedDate > cutoffDate;
        }),
        ...archivedAccounts.filter(a => {
          const archivedDate = new Date(a.archived_at);
          return archivedDate < warningDate && archivedDate > cutoffDate;
        }),
        ...archivedPayments.filter(p => {
          const archivedDate = new Date(p.archived_at);
          return archivedDate < warningDate && archivedDate > cutoffDate;
        })
      ];
      
      setWarningRecords(expiringRecords);
      
      // Find and delete expired records
      const expiredRecords = [
        ...archivedUsers.filter(user => new Date(user.archived_at) < cutoffDate),
        ...archivedLoans.filter(loan => new Date(loan.archived_at) < cutoffDate),
        ...archivedAccounts.filter(account => new Date(account.archived_at) < cutoffDate),
        ...archivedPayments.filter(payment => new Date(payment.archived_at) < cutoffDate)
      ];
      
      if (expiredRecords.length > 0) {
        await deleteExpiredRecords(expiredRecords);
      }

    } catch (error) {
      console.error('Error in auto-delete check:', error);
    }
  };

  // DELETE EXPIRED RECORDS
  const deleteExpiredRecords = async (expiredRecords) => {
    try {
      const token = getAuthToken();
      
      await Promise.all(expiredRecords.map(async (record) => {
        try {
          await axios.delete(`http://localhost:8000/archives/${record.id}/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Failed to delete expired record:', err);
        }
      }));

      await fetchArchivedData();
    } catch (error) {
      console.error('Error deleting expired records:', error);
    }
  };

  // MANUAL DELETE HANDLER
  const handleManualAutoDelete = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - deletionDays);

    const expiredCount = [
      ...archivedUsers.filter(u => new Date(u.archived_at) < cutoffDate),
      ...archivedLoans.filter(l => new Date(l.archived_at) < cutoffDate),
      ...archivedAccounts.filter(a => new Date(a.archived_at) < cutoffDate),
      ...archivedPayments.filter(p => new Date(p.archived_at) < cutoffDate)
    ].length;

    if (expiredCount === 0) {
      alert('No archive records older than ' + deletionDays + ' days found.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${expiredCount} archive records older than ${deletionDays} days? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await checkAndAutoDelete();
      alert('Successfully deleted expired archive records.');
    } catch (error) {
      console.error('Error during manual auto-delete:', error);
      alert('Failed to delete expired archives. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // GENERATE OR NUMBER
  const generateOrNumber = (schedule) => {
    if (schedule.OR) return schedule.OR;

    const now = new Date(schedule.date_paid || Date.now());
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const seedString = `${schedule.id}_${schedule.account_number}_${schedule.loan_type}_${schedule.principal_amount}_${schedule.due_date}`;
    
    const simpleHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    const hash = simpleHash(seedString);
    const threeDigits = (hash % 900) + 100;
    return `${year}-${month}-${threeDigits}`;
  };

  // FORMAT NUMBER HELPER
  const formatNumber = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat('en-US').format(number);
  };

  const fetchPaymentHistory = async (loan) => {
    setLoading(true);
    setError('');
    
    try {
      // Check if payments are stored in archived data
      if (loan.archived_data?.payments) {
        const payments = loan.archived_data.payments.map(payment => ({
          ...payment,
          or_number: payment.OR || generateOrNumber(payment),
          loan_type: loan.archived_data.loan_type,
          status: 'Paid',
          is_paid: true
        }));
        setPaymentHistory(payments);
        setSelectedLoan(loan);
        setActiveTab('paymentHistory');
        return;
      }

      // Fetch from payment schedules
      const token = getAuthToken();
      const response = await axios.get(
        `http://localhost:8000/payment-schedules/`, 
        {
          params: {
            loan_id: loan.archived_data.control_number,
            account_number: loan.archived_data.account_number
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data && response.data.length > 0) {
        const paidPayments = response.data
          .filter(payment => payment.is_paid)
          .map(payment => ({
            ...payment,
            or_number: payment.OR || generateOrNumber(payment),
            loan_type: loan.archived_data.loan_type,
            status: 'Paid',
            is_paid: true,
            payment_amount: payment.principal_amount
          }));

        setPaymentHistory(paidPayments);
        setSelectedLoan(loan);
        setActiveTab('paymentHistory');
      } else {
        setError('No payment records found for this loan.');
        setPaymentHistory([]);
      }

    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('Failed to fetch payment history. Please try again.');
      setPaymentHistory([]);
    } finally {
      setLoading(false);
    }
  };

// Update the getGroupedArchivedPayments function
const getGroupedArchivedPayments = () => {
  const grouped = {};
  
  archivedPayments.forEach(payment => {
    // Extract account details from payment data
    const archiveData = payment.archived_data || {};
    
    // Get account number - check all possible fields
    const accountNumber = 
      archiveData.account_number || 
      archiveData.account || 
      archiveData.control_number || 
      'Unknown';
    
    // Get account holder name
    const accountHolder = 
      archiveData.account_holder ||
      (archiveData.first_name && archiveData.last_name ? 
        `${archiveData.first_name} ${archiveData.last_name}` : 
        'Unknown');

    // Create or update group
    if (!grouped[accountNumber]) {
      grouped[accountNumber] = {
        account_number: accountNumber,
        account_holder: accountHolder,
        payments: [],
        archived_at: payment.archived_at,
        id: payment.id
      };
    }
    
    // Add payment to group with enhanced data
    grouped[accountNumber].payments.push({
      ...payment,
      archived_data: {
        ...archiveData,
        account_number: accountNumber,
        account_holder: accountHolder,
        payment_amount: archiveData.payment_amount || 
                       archiveData.amount || 
                       archiveData.principal_amount || 
                       0,
        loan_type: archiveData.loan_type || 'N/A',
        date_paid: archiveData.date_paid || 
                  archiveData.payment_date || 
                  payment.archived_at,
        OR: archiveData.OR || 
            archiveData.or_number || 
            generateOrNumber(archiveData)
      }
    });
  });
  
  return Object.values(grouped);
};

// Update the fetchPaymentHistoryFromArchivedPayments function
const fetchPaymentHistoryFromArchivedPayments = async (paymentAccount) => {
  setLoading(true);
  setError('');
  
  try {
    const accountPayments = paymentAccount.payments || [];
    
    if (accountPayments.length > 0) {
      const formattedPayments = accountPayments.map(payment => {
        const data = payment.archived_data || {};
        return {
          id: payment.id,
          loan_type: data.loan_type || 'N/A',
          payment_amount: parseFloat(data.payment_amount || 
                                  data.amount || 
                                  data.principal_amount || 
                                  0),
          due_date: data.date_paid || 
                   data.payment_date || 
                   payment.archived_at,
          is_paid: true,
          status: 'Paid',
          or_number: data.OR || 
                    data.or_number || 
                    generateOrNumber(data)
        };
      });

      // Sort payments by date
      formattedPayments.sort((a, b) => 
        new Date(b.due_date) - new Date(a.due_date)
      );

      setPaymentHistory(formattedPayments);
      setSelectedPaymentAccount(paymentAccount);
      setActiveTab('archivedPaymentHistory');
    } else {
      setError('No payment records found for this account.');
      setPaymentHistory([]);
    }
  } catch (err) {
    console.error('Error fetching archived payment history:', err);
    setError('Failed to fetch payment history. Please try again.');
    setPaymentHistory([]);
  } finally {
    setLoading(false);
  }
};

  // FILTER DATA HELPERS
  const filterData = (data, keys) => {
    if (!searchTerm.trim()) return data;
    return data.filter((item) =>
      keys.some((key) =>
        item.archived_data?.[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const filterGroupedPayments = (groupedData, keys) => {
    if (!searchTerm.trim()) return groupedData;
    return groupedData.filter((item) =>
      keys.some((key) =>
        item[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  // FILTERED DATA
  const filteredArchivedUsers = filterData(archivedUsers, ['memId', 'first_name', 'last_name', 'email',]);
  const filteredArchivedLoans = filterData(archivedLoans, ['control_number', 'account_holder', 'loan_amount', 'status']);
  const filteredArchivedAccounts = filterData(archivedAccounts, ['account_number', 'status']);
  const groupedPayments = getGroupedArchivedPayments();
  const filteredGroupedPayments = filterGroupedPayments(groupedPayments, ['account_number', 'account_holder']);

  return (
    <div className="archived-records">
      <WarningNotification />
      {showConfig && <AutoDeleteConfig />}
      
      {!selectedMember && !selectedLoan && !selectedPaymentAccount && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="dropdown">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="dropdown-select"
            >
              <option value="members">Archived Members</option>
              <option value="accounts">Archived Accounts</option>
              <option value="loan">Archived Loans</option>
              {/* <option value="payments">Archived Payments</option> */}
            </select>
          </div>
          
          <button
            onClick={() => setShowConfig(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 1px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', marginRight: '950px' }}
            title="Configure Auto-Delete Settings"
          >
            <FaCog />
            Auto-Delete Settings
          </button>
        </div>
      )}

      {/* ARCHIVED MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="records-box">
          <input
            type="text"
            placeholder="Search Records"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <h2 style={{ textAlign: 'center', fontSize: '22px'}}>
            Archived Members ({filteredArchivedUsers.length})
          </h2>
          <div style={{ marginBottom: '70px', marginTop: '-50px' }}></div>
          <div style={{overflowY: 'auto' }}>
            <table
              className="records-table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', textAlign: 'left', tableLayout: 'fixed', scrollbarWidth: 'none', msOverflowStyle: 'none', }} >
              <thead>
                <tr>
                  <th style={{ padding: '12px 20px', width: '250px', borderBottom: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '12px 20px', width: '220px', borderBottom: '1px solid #ddd' }}>Email</th>
                  <th style={{ padding: '12px 20px', width: '150px', borderBottom: '1px solid #ddd' }}>Phone</th>
                  <th style={{ padding: '12px 20px', width: '200px', borderBottom: '1px solid #ddd' }}>Archived Date</th>
                  <th style={{ padding: '12px 20px', width: '150px', borderBottom: '1px solid #ddd' }}>Auto-Delete In</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchivedUsers.length > 0 ? (
                  filteredArchivedUsers.map((user, index) => {
                    const archivedDate = new Date(user.archived_at);
                    const deleteDate = new Date(archivedDate);
                    deleteDate.setDate(deleteDate.getDate() + deletionDays);
                    const daysUntilDeletion = Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={`member-${user.archived_data?.memId || user.id}-${index}`}>
                        <td
                          style={{ padding: '12px 20px', cursor: 'pointer', color: 'blue', width: '250px', borderBottom: '1px solid #eee' }}
                          onClick={() => {
                            setSelectedMember(user);
                            setActiveTab("Account");
                          }}
                        >
                          {`${user.archived_data?.first_name || ''} ${user.archived_data?.middle_name || ''} ${user.archived_data?.last_name || ''}`}
                        </td>
                        <td style={{ padding: '12px 20px', width: '220px', borderBottom: '1px solid #eee' }}>
                          {user.archived_data?.email}
                        </td>
                        <td style={{ padding: '12px 20px', width: '150px', borderBottom: '1px solid #eee' }}>
                          {user.archived_data?.phone_number}
                        </td>
                        <td style={{ padding: '12px 20px', width: '200px', borderBottom: '1px solid #eee' }}>
                          {new Date(user.archived_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 20px', width: '150px', borderBottom: '1px solid #eee', color: daysUntilDeletion <= 5 ? 'red' : daysUntilDeletion <= 10 ? 'orange' : 'green', fontWeight: daysUntilDeletion <= 5 ? 'bold' : 'normal' }}>
                          {daysUntilDeletion > 0 ? `${daysUntilDeletion} days` : 'Expired'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                      No archived members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* MEMBER DETAILS VIEW */}
      {selectedMember && (
        <div style={{ marginTop: '-50px', paddingTop: '20px' }}>
          <h3>
            Records of: {selectedMember.archived_data?.first_name} {selectedMember.archived_data?.middle_name} {selectedMember.archived_data?.last_name}
          </h3>
          <nav style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <span
              onClick={() => {
                setSelectedMember(null);
                setActiveTab('members');
              }}
              style={{cursor: 'pointer',fontWeight: 'bold',color: 'green',fontSize: '18px'}}>← Back to list
            </span>
          </nav>
          <div>
            {activeTab === 'Account' && selectedMember && (
              <div
                style={{display: 'flex',flexDirection: 'row',justifyContent: 'space-between',alignItems: 'flex-start',gap: '50px',padding: '30px',border: '1px solid #ccc',borderRadius: '12px',boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',margin: '0 auto',width: '115%',height: '370px'}}>
                {/* LEFT: MEMBER INFORMATION */}
                <div
                  style={{flex: '1',maxHeight: '335px', border: '1px solid #ccc',borderRadius: '10px',padding: '25px',backgroundColor: '#fef7f7ff',maxWidth: '100%',scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'auto'}}>
                  <h3 style={{ marginTop: '-10px', textAlign: 'center' }}>📋 Member Information</h3>
                  <div style={{ flexDirection: 'column',display: 'grid',gridTemplateColumns: 'repeat(2, 1fr)',gap: '15px',}}>
                    <div><strong>Member ID:</strong> {selectedMember.archived_data?.memId}</div>
                    <div><strong>First Name:</strong> {selectedMember.archived_data?.first_name}</div>
                    <div><strong>Middle Name:</strong> {selectedMember.archived_data?.middle_name}</div>
                    <div><strong>Last Name:</strong> {selectedMember.archived_data?.last_name}</div>
                    <div><strong>Birth Date:</strong> {selectedMember.archived_data?.birth_date}</div>
                    <div><strong>Email:</strong> {selectedMember.archived_data?.email}</div>
                    <div><strong>Phone Number:</strong> {selectedMember.archived_data?.phone_number}</div>
                    <div><strong>Gender:</strong> {selectedMember.archived_data?.gender}</div>
                    <div><strong>Religion:</strong> {selectedMember.archived_data?.religion}</div>
                    <div><strong>Status:</strong> {selectedMember.archived_data?.pstatus}</div>
                    <div><strong>Address:</strong> {selectedMember.archived_data?.address}</div>
                    <div><strong>Birth Place:</strong> {selectedMember.archived_data?.birth_place}</div>
                    <div><strong>Age:</strong> {selectedMember.archived_data?.age}</div>
                    <div><strong>ZIP Code:</strong> {selectedMember.archived_data?.zip_code}</div>
                    <div><strong>Height:</strong> {selectedMember.archived_data?.height}</div>
                    <div><strong>Weight:</strong> {selectedMember.archived_data?.weight}</div>
                    <div><strong>Annual Income:</strong> {selectedMember.archived_data?.ann_com}</div>
                    <div><strong>Other Coop Member:</strong> {selectedMember.archived_data?.mem_co}</div>
                    <div><strong>TIN:</strong> {selectedMember.archived_data?.tin}</div>
                    <div><strong>Valid ID:</strong> {selectedMember.archived_data?.valid_id}</div>
                    <div><strong>ID Number:</strong> {selectedMember.archived_data?.id_no}</div>
                    <div><strong>Initial Deposit:</strong> {selectedMember.archived_data?.in_dep}</div>
                  </div>
                </div>
                <div
                  style={{flex: '1',border: '1px solid #ccc',borderRadius: '10px',padding: '25px',backgroundColor: '#fef7f7ff',minWidth: '350px', maxWidth: '100%',marginTop: '40px'}}>
                  <h3 style={{ marginTop: '-10px', textAlign: 'center' }}>👨‍👩‍👧 Beneficiaries</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <strong>Beneficiary 1:</strong> {selectedMember.archived_data?.beneficiary}<br />
                      <strong>Relationship:</strong> {selectedMember.archived_data?.relationship}<br />
                      <strong>Birth Date:</strong> {selectedMember.archived_data?.birth_date1}
                    </div>
                    <div>
                      <strong>Beneficiary 2:</strong> {selectedMember.archived_data?.beneficiary2}<br />
                      <strong>Relationship:</strong> {selectedMember.archived_data?.relationship2}<br />
                      <strong>Birth Date:</strong> {selectedMember.archived_data?.birth_date2}
                    </div>
                    <div>
                      <strong>Beneficiary 3:</strong> {selectedMember.archived_data?.beneficiary3}<br />
                      <strong>Relationship:</strong> {selectedMember.archived_data?.relationship3}<br />
                      <strong>Birth Date:</strong> {selectedMember.archived_data?.birth_date3}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ARCHIVED ACCOUNTS TAB */}
      {activeTab === 'accounts' && (
        <div className="records-box">
          <input
            type="text"
            placeholder="Search Accounts"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <h2 style={{ textAlign: 'center', fontSize:'22px' }}>
            Archived Accounts ({filteredArchivedAccounts.length})
          </h2>
          <div style={{overflowY: 'auto' }}>
            <table className="records-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', textAlign: 'left', tableLayout: 'fixed' }}>
              <thead style={{ backgroundColor: '#f2f2f2' }}>
                <tr>
                  <th style={{ padding: '12px 20px', border: '0px', width: '200px' }}>Account Number</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '250px' }}>Account Holder</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '150px' }}>Status</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '200px' }}>Archived At</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '120px' }}>Delete In</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchivedAccounts.length > 0 ? (
                  filteredArchivedAccounts.map((account, index) => {
                    const archivedDate = new Date(account.archived_at);
                    const deleteDate = new Date(archivedDate);
                    deleteDate.setDate(deleteDate.getDate() + deletionDays);
                    const daysUntilDeletion = Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={`account-${account.archived_data?.account_number || account.id}-${index}`}>
                        <td style={{ padding: '12px 20px', width: '200px', borderBottom: '1px solid #eee' }}>
                          {account.archived_data?.account_number}
                        </td>
                        <td style={{ padding: '12px 20px', width: '250px', borderBottom: '1px solid #eee' }}>
                          {account.archived_data?.account_holder ? 
                            `${account.archived_data.account_holder.first_name || ''} ${account.archived_data.account_holder.middle_name || ''} ${account.archived_data.account_holder.last_name || ''}` : 
                            'N/A'
                          }
                        </td>
                        <td style={{ 
                          padding: '12px 20px',
                          width: '150px',
                          borderBottom: '1px solid #eee',
                          color: account.archived_data?.status?.toLowerCase() === 'inactive' ? 'red' : 'inherit', 
                          fontWeight: account.archived_data?.status?.toLowerCase() === 'inactive' ? 'bold' : 'normal'
                        }}>
                          {account.archived_data?.status || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 20px', width: '200px', borderBottom: '1px solid #eee' }}>
                          {new Date(account.archived_at).toLocaleString()}
                        </td>
                        <td style={{ 
                          padding: '12px 20px', 
                          width: '120px', 
                          borderBottom: '1px solid #eee',
                          color: daysUntilDeletion <= 5 ? 'red' : daysUntilDeletion <= 10 ? 'orange' : 'green',
                          fontWeight: daysUntilDeletion <= 5 ? 'bold' : 'normal'
                        }}>
                          {daysUntilDeletion > 0 ? `${daysUntilDeletion} days` : 'Expired'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', border: '0px' }}>
                      No archived accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ARCHIVED LOANS TAB */}
      {activeTab === 'loan' && (
        <div className="records-box">
          <input
            type="text"
            placeholder="Search Loans"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <h2 style={{ textAlign: 'center', fontSize:'22px' }}>
            Archived Loans ({filteredArchivedLoans.length})
          </h2>
          <div style={{ marginBottom: '65px', marginTop: '-60px' }}></div>
          <div style={{overflowY: 'auto' }}>
            <table
              className="records-table"
              style={{width: '100%', borderCollapse: 'collapse', fontSize: '16px', textAlign: 'left', tableLayout: 'fixed', scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              <thead style={{ backgroundColor: '#f2f2f2' }}>
                <tr>
                  <th style={{ padding: '12px', border: '0px' }}>Control Number</th>
                  <th style={{ padding: '12px', border: '0px' }}>Account Holder</th>
                  <th style={{ padding: '12px', border: '0px' }}>Loan Amount</th>
                  <th style={{ padding: '12px', border: '0px' }}>Status</th>
                  <th style={{ padding: '12px', border: '0px' }}>Archived At</th>
                  <th style={{ padding: '12px', border: '0px' }}>Delete In</th>
                  <th style={{ padding: '12px', border: '0px' }}>Actions</th>
                </tr>
              </thead>
            </table>
            <div style={{overflowY: 'auto' }}>
              <table
                className="records-table"
                style={{width: '100%',borderCollapse: 'collapse',fontSize: '16px',textAlign: 'left',tableLayout: 'fixed',scrollbarWidth: 'none',msOverflowStyle: 'none'}}>
                <tbody>
                  {filteredArchivedLoans.length > 0 ? (
                    filteredArchivedLoans.map((loan, index) => {
                      const archivedDate = new Date(loan.archived_at);
                      const deleteDate = new Date(archivedDate);
                      deleteDate.setDate(deleteDate.getDate() + deletionDays);
                      const daysUntilDeletion = Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <tr key={`loan-${loan.archived_data?.control_number || loan.id}-${index}`}>
                          <td style={{ padding: '10px' }}> {loan.archived_data?.control_number || 'N/A'} </td>
                          <td style={{ padding: '10px' }}>{loan.archived_data?.account_holder || 'N/A'}</td>
                          <td style={{ padding: '10px' }}> ₱{formatNumber(parseFloat(loan.archived_data?.loan_amount || 0).toFixed(2))} </td>
                          <td style={{ padding: '10px', color: loan.archived_data?.status?.toLowerCase() === 'ongoing' ? 'red' : loan.archived_data?.status?.toLowerCase() === 'paid-off' ? 'green' : 'black' }}> {loan.archived_data?.status || 'N/A'} </td>
                          <td style={{ padding: '1px' }}>{new Date(loan.archived_at).toLocaleString()}</td>
                          <td style={{ textAlign: 'center', color: daysUntilDeletion <= 5 ? 'red' : daysUntilDeletion <= 10 ? 'orange' : 'green', fontWeight: daysUntilDeletion <= 5 ? 'bold' : 'normal' }}> {daysUntilDeletion > 0 ? `${daysUntilDeletion} days` : 'Expired'} </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}> 
                            <button onClick={() => handleViewComakers(loan)} className="actionButton actionButtonView" > 
                              <FaEye /> <span className="buttonText">View Comakers</span> 
                            </button> 
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '12px' }}>
                        No archived loans found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* LOAN DETAILS VIEW */}
      {selectedLoan &&(
        <div style={{ marginTop: '-50px', paddingTop: '20px' }}>
          <h3>
            Records of:{selectedLoan.archived_data?.account_holder}</h3>
          <nav style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <span
              onClick={() => {
                setSelectedLoan(null);
                setActiveTab('loan');
              }}
              style={{ cursor: 'pointer', fontWeight: 'bold', color: 'green', fontSize: '18px' }}
            >
              ← Back to List
            </span>
          </nav>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: '50px', padding: '30px', border: '1px solid #ccc', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', margin: '0 auto', width: '115%', height: '370px' }}>
            {/* LEFT: LOAN DETAILS */}
            <div style={{ flex: '1', maxHeight: '335px', border: '1px solid #ccc', borderRadius: '10px', padding: '25px', backgroundColor: '#fef7f7ff', maxWidth: '100%', scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'auto' }}>
              <h3 style={{ marginTop: '-10px', textAlign: 'center' }}>📋 Loan Information</h3>
              <div style={{ flexDirection: 'column', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div><strong>Account Number:</strong> {selectedLoan.archived_data?.account}</div>
                <div><strong>Loan Type:</strong> {selectedLoan.archived_data?.loan_type}</div>
                <div><strong>Purpose:</strong> {selectedLoan.archived_data?.purpose}</div>
                <div><strong>Take Home Pay:</strong> ₱{formatNumber(selectedLoan.archived_data?.takehomePay)}</div>
                <div><strong>Service Fee:</strong> ₱{formatNumber(selectedLoan.archived_data?.service_fee)}</div>
                <div><strong>Interest Amount:</strong> ₱{formatNumber(selectedLoan.archived_data?.interest_amount)}</div>
                <div><strong>Admin Cost:</strong> ₱{formatNumber(selectedLoan.archived_data?.admincost)}</div>
                <div><strong>Notarial Fee:</strong> ₱{formatNumber(selectedLoan.archived_data?.notarial)}</div>
                <div><strong>CISP:</strong> ₱{formatNumber(selectedLoan.archived_data?.cisp)}</div>
              </div>
            </div>

            {/* RIGHT: COMAKERS */}
            <div style={{ flex: '1', border: '1px solid #ccc', borderRadius: '10px', padding: '25px', backgroundColor: '#fef7f7ff', minWidth: '350px', maxWidth: '100%', marginTop: '40px' }}>
              <h3 style={{ marginTop: '-10px', textAlign: 'center' }}>👥 Co-Makers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {selectedLoan.archived_data?.co_maker && ( <div><strong>Co-Maker 1:</strong> {selectedLoan.archived_data.co_maker}</div> )}
                {selectedLoan.archived_data?.co_maker_2 && ( <div><strong>Co-Maker 2:</strong> {selectedLoan.archived_data.co_maker_2}</div> )}
                {selectedLoan.archived_data?.co_maker_3 && ( <div><strong>Co-Maker 3:</strong> {selectedLoan.archived_data.co_maker_3}</div> )}
                {selectedLoan.archived_data?.co_maker_4 && ( <div><strong>Co-Maker 4:</strong> {selectedLoan.archived_data.co_maker_4}</div> )}
                {selectedLoan.archived_data?.co_maker_5 && ( <div><strong>Co-Maker 5:</strong> {selectedLoan.archived_data.co_maker_5}</div> )}
                {!selectedLoan.archived_data?.co_maker && 
                !selectedLoan.archived_data?.co_maker_2 && 
                !selectedLoan.archived_data?.co_maker_3 && 
                !selectedLoan.archived_data?.co_maker_4 && 
                !selectedLoan.archived_data?.co_maker_5 && (
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    No co-makers found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVED PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="records-box">
          <input
            type="text"
            placeholder="Search Payments"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <h2 style={{ textAlign: 'center', fontSize:'22px' }}>
            Archived Payments ({filteredGroupedPayments.length})
          </h2>
          <div style={{overflowY: 'auto', marginTop: '20px'}}>
            <table className="records-table" style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '16px',
              textAlign: 'left'
            }}>
              <thead style={{ backgroundColor: '#f2f2f2', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '12px 20px' }}>Account Number</th>
                  <th style={{ padding: '12px 20px' }}>Account Holder</th>
                  <th style={{ padding: '12px 20px' }}>Total Payments</th>
                  <th style={{ padding: '12px 20px' }}>Archived At</th>
                  <th style={{ padding: '12px 20px' }}>Delete In</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroupedPayments.length > 0 ? (
                  filteredGroupedPayments.map((paymentGroup, index) => {
                    const archivedDate = new Date(paymentGroup.archived_at);
                    const deleteDate = new Date(archivedDate);
                    deleteDate.setDate(deleteDate.getDate() + deletionDays);
                    const daysUntilDeletion = Math.ceil((deleteDate - new Date()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={`payment-group-${paymentGroup.account_number}-${index}`}>
                        <td style={{ padding: '12px 20px' }}>{paymentGroup.account_number}</td>
                        <td style={{ padding: '12px 20px' }}>{paymentGroup.account_holder}</td>
                        <td style={{ padding: '12px 20px' }}>{paymentGroup.payments.length}</td>
                        <td style={{ padding: '12px 20px' }}>{new Date(paymentGroup.archived_at).toLocaleString()}</td>
                        <td style={{ 
                          padding: '12px 20px',
                          color: daysUntilDeletion <= 5 ? 'red' : daysUntilDeletion <= 10 ? 'orange' : 'green',
                          fontWeight: daysUntilDeletion <= 5 ? 'bold' : 'normal'
                        }}>
                          {daysUntilDeletion > 0 ? `${daysUntilDeletion} days` : 'Expired'}
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}> 
                          <button 
                            onClick={() => fetchPaymentHistoryFromArchivedPayments(paymentGroup)}
                            className="actionButton actionButtonView"
                            style={{
                              padding: '8px 16px',
                              fontSize: '14px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          > 
                            <FaEye /> View Payments
                          </button> 
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                      No archived payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARCHIVED PAYMENT HISTORY VIEW */}
      {activeTab === 'archivedPaymentHistory' && selectedPaymentAccount && (
        <div className="payment-history-section">
          <div style={{ marginTop: '-50px', paddingTop: '20px' }}>
            <h3>Payment History of: {selectedPaymentAccount.account_holder}</h3>
            <nav style={{ display: 'flex', gap: '20px', marginBottom: '10px', alignItems: 'center' }}>
              <span
                onClick={() => {
                  setSelectedPaymentAccount(null);
                  setPaymentHistory([]);
                  setActiveTab('payments');
                  setError('');
                }}
                style={{ cursor: 'pointer', fontWeight: 'bold', color: 'green', fontSize: '18px' }}
              >
                ← Back to List
              </span>
              <button
                onClick={() => {
                  const printContent = document.querySelector('.archived-payment-table-print');
                  const accountHolder = selectedPaymentAccount.account_holder || 'N/A';
                  const accountNumber = selectedPaymentAccount.account_number || 'N/A';
                  
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                            <title>Archived Payment History - ${accountHolder}</title>
                            <style> body { font-family: Arial, sans-serif; margin: 20px; color: #000; } h2 { text-align: center; margin-bottom: 20px; color: black; } .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; padding: 10px; border: 1px solid black; border-radius: 10px; max-width: 450px; font-family: Arial, sans-serif; font-size: 14px; margin: 0 0 20px 0; text-align: left; } table { width: 100%; border-collapse: collapse; margin: 0 auto; } th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; } th { background-color: #4CAF50; color: white; font-weight: bold; } tbody tr:nth-child(even) { background-color: #f9f9f9; } @media print { body { margin: 0; } table { font-size: 10px; } th, td { padding: 6px; } } </style>
                        </head>
                        <body>
                            <h2>Archived Payment History</h2>
                            <div class="info-grid">
                                <div><strong>Account Number:</strong> ${accountNumber}</div>
                                <div><strong>Account Holder:</strong> ${accountHolder}</div>
                                <div><strong>Date Today:</strong> ${new Date().toLocaleDateString()}</div>
                                <div><strong>Total Payments:</strong> ${paymentHistory.length}</div>
                            </div>
                            ${printContent.innerHTML}
                        </body>
                        </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                    printWindow.close();
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', backgroundColor: '#ede9c7', fontSize: '25px', cursor: 'pointer', border: 'none', position: 'fixed', right: '20px', top: '230px', zIndex: '1000', padding: '10px' }}
                title="Print Archived Payment History"
              >
                <BsFillPrinterFill />
              </button>
            </nav>
            
            <div className="print-container" style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '30px',
        padding: '25px',
        border: '1px solid #ccc',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        marginLeft: '-30px',
        width: '101%',
        overflowX: 'auto',
        height: '370px'
      }}>
        {/* Account Details Section */}
        <div style={{
          flex: '1',
          border: '1px solid #ccc',
          borderRadius: '10px',
          padding: '25px',
          backgroundColor: '#fef7f7ff',
          minWidth: '300px',
          marginTop: '70px'
        }}>
          <h4 style={{fontWeight: 'bold', fontSize: '20px', marginTop: '-10px'}}>Account Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <div><strong>Account Number:</strong> {selectedPaymentAccount.account_number}</div>
            <div><strong>Account Holder:</strong> {selectedPaymentAccount.account_holder}</div>
            <div><strong>Total Payments:</strong> {paymentHistory.length}</div>
            <div><strong>Archived Date:</strong> {new Date(selectedPaymentAccount.archived_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Payments Table Section */}
        <div style={{
          flex: '2',
          backgroundColor: '#fef7f7ff',
          border: '1px solid #ccc',
          borderRadius: '10px',
          maxHeight: '360px',
          overflowY: 'auto',
          padding: '5px'
        }}>
          {loading && <div style={{textAlign: 'center', padding: '20px'}}>Loading...</div>}
          
          {error && <div style={{textAlign: 'center', padding: '20px', color: 'red'}}>{error}</div>}
          
          {!loading && !error && paymentHistory.length === 0 && 
            <div style={{textAlign: 'center', padding: '20px'}}>No payment records found.</div>
          }
          
          {!loading && !error && paymentHistory.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#4CAF50', color: 'white', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '12px' }}>Loan Type</th>
                  <th style={{ padding: '12px' }}>Paid Amount</th>
                  <th style={{ padding: '12px' }}>Date Paid</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>OR Number</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment, index) => (
                  <tr key={`payment-${payment.id}-${index}`}>
                    <td style={{ padding: '8px' }}>{payment.loan_type}</td>
                    <td style={{ padding: '8px' }}>₱{formatNumber(payment.payment_amount)}</td>
                    <td style={{ padding: '8px' }}>{new Date(payment.due_date).toLocaleDateString()}</td>
                    <td style={{ padding: '8px', color: 'green' }}>Paid</td>
                    <td style={{ padding: '8px' }}>{payment.or_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default ArchivedRecords;