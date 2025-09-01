import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Archive.css';
import { BsFillPrinterFill } from "react-icons/bs";
import { FaEye, FaCog, FaExclamationTriangle } from "react-icons/fa";

const ArchivedRecords = () => {
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedLoans, setArchivedLoans] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('members'); 
  const [actionType, setActionType] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null); 
  const [archivedPayments, setArchivedPayments] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
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
  const [lastDeleteCheck, setLastDeleteCheck] = useState(
    localStorage.getItem('lastDeleteCheck') || null
  );

    useEffect(() => {
      fetchArchivedData();
  
      if (autoDeleteEnabled) {
        checkAndAutoDelete();
        const interval = setInterval(checkAndAutoDelete, 3600000); // Check every hour
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
  
    // SAVE CONFIGURATION
    const handleConfigSave = () => {
      localStorage.setItem('autoDeleteEnabled', autoDeleteEnabled.toString());
      localStorage.setItem('deletionDays', deletionDays.toString());
      setShowConfig(false);
      alert('Auto-delete configuration saved successfully!');
      
      // Run immediate check if enabled
      if (autoDeleteEnabled) {
        checkAndAutoDelete();
      }
    };
  
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
  
    // CHECK FOR EXPIRING/EXPIRED RECORDS
    const checkAndAutoDelete = async () => {
      console.log("🔍 Running auto-delete check...");
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - deletionDays);
        
        // Warning date (5 days before deletion)
        const warningDate = new Date();
        warningDate.setDate(warningDate.getDate() - (deletionDays - 5));
        
        // Find expiring records (approaching deletion)
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
        
        // Find expired records
        const expiredUsers = archivedUsers.filter(user => new Date(user.archived_at) < cutoffDate);
        const expiredLoans = archivedLoans.filter(loan => new Date(loan.archived_at) < cutoffDate);
        const expiredAccounts = archivedAccounts.filter(account => new Date(account.archived_at) < cutoffDate);
        const expiredPayments = archivedPayments.filter(payment => new Date(payment.archived_at) < cutoffDate);
        
        const totalExpired = expiredUsers.length + expiredLoans.length + expiredAccounts.length + expiredPayments.length;
        
        if (totalExpired > 0) {
          console.log(`🗑️ Found ${totalExpired} expired archive records`);
          await deleteExpiredRecords(expiredUsers, expiredLoans, expiredAccounts, expiredPayments);
        }
        
        // Update last check timestamp
        const now = new Date().toISOString();
        setLastDeleteCheck(now);
        localStorage.setItem('lastDeleteCheck', now);
  
      } catch (error) {
        console.error('❌ Error in auto-delete check:', error);
      }
    };
  
    // DELETE EXPIRED RECORDS
    const deleteExpiredRecords = async (expiredUsers, expiredLoans, expiredAccounts, expiredPayments) => {
      try {
        const token = getAuthToken();
        let deletedCount = 0;
        
        // Delete expired members
        if (expiredUsers.length > 0) {
          await Promise.all(expiredUsers.map(async (member) => {
            try {
              await axios.delete(`http://localhost:8000/archives/${member.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              deletedCount++;
            } catch (err) {
              console.error('Failed to delete expired member:', err);
            }
          }));
          console.log(`✅ Deleted ${expiredUsers.length} expired member archives`);
        }
  
        // Delete expired loans
        if (expiredLoans.length > 0) {
          await Promise.all(expiredLoans.map(async (loan) => {
            try {
              await axios.delete(`http://localhost:8000/archives/${loan.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              deletedCount++;
            } catch (err) {
              console.error('Failed to delete expired loan:', err);
            }
          }));
          console.log(`✅ Deleted ${expiredLoans.length} expired loan archives`);
        }
  
        // Delete expired accounts
        if (expiredAccounts.length > 0) {
          await Promise.all(expiredAccounts.map(async (account) => {
            try {
              await axios.delete(`http://localhost:8000/archives/${account.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              deletedCount++;
            } catch (err) {
              console.error('Failed to delete expired account:', err);
            }
          }));
          console.log(`✅ Deleted ${expiredAccounts.length} expired account archives`);
        }
  
        // Delete expired payments
        if (expiredPayments.length > 0) {
          await Promise.all(expiredPayments.map(async (payment) => {
            try {
              await axios.delete(`http://localhost:8000/archives/${payment.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              deletedCount++;
            } catch (err) {
              console.error('Failed to delete expired payment:', err);
            }
          }));
          console.log(`✅ Deleted ${expiredPayments.length} expired payment archives`);
        }
  
        // Refresh data after deletion
        if (deletedCount > 0) {
          await fetchArchivedData();
        }
  
        return deletedCount;
      } catch (error) {
        console.error('❌ Error deleting expired records:', error);
        throw error;
      }
    };
  
    // MANUAL AUTO-DELETE BUTTON HANDLER
    const handleManualAutoDelete = async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - deletionDays);
  
      // Count records that will be deleted
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
        alert(`Successfully deleted expired archive records.`);
      } catch (error) {
        console.error('Error during manual auto-delete:', error);
        alert('Failed to delete expired archives. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    };

  useEffect(() => {
    console.log("📍 useEffect triggered for archived data");
    fetchArchivedData();
  }, []);

  // Helper function to remove duplicates from loans
  const removeDuplicateLoans = (loans) => {
    const seen = new Set();
    return loans.filter(loan => {
      const identifier = `${loan.archived_data?.control_number}-${loan.id}`;
      if (seen.has(identifier)) {
        console.warn("🔄 Duplicate loan detected:", loan.archived_data?.control_number);
        return false;
      }
      seen.add(identifier);
      return true;
    });
  };

  // Helper function to remove duplicates from any array based on a key
  const removeDuplicates = (array, getKey) => {
    const seen = new Set();
    return array.filter(item => {
      const key = getKey(item);
      if (seen.has(key)) {
        console.warn("🔄 Duplicate detected:", key);
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // IMPROVED TOKEN HANDLING
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

      // Remove duplicates from each dataset
      const uniqueMembers = removeDuplicates(membersResponse.data || [], (member) => member.archived_data?.memId || member.id);
      const uniqueLoans = removeDuplicates(loansResponse.data || [], (loan) => loan.archived_data?.control_number || loan.id);
      const uniqueAccounts = removeDuplicates(accountsResponse.data || [], (account) => account.archived_data?.account_number || account.id);
      const uniquePayments = removeDuplicates(paymentsResponse.data || [], (payment) => payment.id);

      setArchivedUsers(uniqueMembers);
      setArchivedLoans(uniqueLoans);
      setArchivedAccounts(uniqueAccounts);
      setArchivedPayments(uniquePayments);

    } catch (err) {
      console.error('Error fetching archived data:', err);
      setError('Failed to fetch archived data.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced OR number generation
  const generateOrNumber= (schedule) => {
    if (schedule.OR) return schedule.OR; 

    const now = new Date(schedule.date_paid || Date.now());
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const seedString = `${schedule.id}_${schedule.account_number}_${schedule.loan_type}_${schedule.principal_amount}_${schedule.due_date}`;

    const simpleHash = (str) => {
      let hash = 0;
      if (str.length === 0) return hash;
      
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

  // Helper function to format numbers
  const formatNumber = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat('en-US').format(number);
  };

  // DEBUGGING HELPER FUNCTION
  const debugLoanData = (loan) => {
    console.log("🔍 DEBUGGING LOAN DATA:");
    console.log("Full loan object:", loan);
    console.log("Archived data:", loan.archived_data);
    console.log("Available identifiers:", {
      control_number: loan.archived_data?.control_number,
      account_number: loan.archived_data?.account_number,
      member_id: loan.archived_data?.member_id,
      accountN: loan.archived_data?.accountN,
      id: loan.id
    });
  };

  // Strategy 1: Fetch from archived payments
  const fetchFromArchivedPayments = async (loan) => {
    try {
      const loanControlNumber = loan.archived_data?.control_number;
      const loanAccountNumber = loan.archived_data?.account_number;
      
      console.log("🔍 Searching archived payments for:", { loanControlNumber, loanAccountNumber });
      
      // Find related payments in archived data
      const relatedPayments = archivedPayments.filter(payment => {
        const paymentAccountNumber = payment.archived_data?.account_number || 
                                   payment.archived_data?.control_number;
        
        return paymentAccountNumber === loanControlNumber || 
               paymentAccountNumber === loanAccountNumber;
      });

      if (relatedPayments.length > 0) {
        return relatedPayments.map(payment => ({
          ...payment.archived_data,
          id: payment.id,
          or_number: payment.archived_data?.OR || generateOrNumber(payment.archived_data),
          is_paid: true,
          status: 'Paid',
          loan_type: payment.archived_data?.loan_type || loan.archived_data?.loan_type,
          date_paid: payment.archived_data?.date_paid || payment.archived_data?.due_date
        }));
      }

      return [];
    } catch (err) {
      console.error("Error in fetchFromArchivedPayments:", err);
      return [];
    }
  };

  // Strategy 2: Fetch from payment schedules API - FIXED
  const fetchFromPaymentSchedulesAPI = async (loan, token) => {
    const accountNumbers = [
      loan.archived_data?.account_number,
      loan.archived_data?.control_number,
      loan.archived_data?.accountN
    ].filter(Boolean);

    for (const accountNumber of accountNumbers) {
      try {
        console.log("🔍 Trying payment schedules API with account:", accountNumber);
        
        // FIXED: Use consistent localhost URL
        const response = await axios.get(
          `http://localhost:8000/payment-schedules/?account_number=${accountNumber}`,
          { 
            withCredentials: true,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000 // Increased timeout
          }
        );

        const paidSchedules = (response.data || []).filter(schedule => 
          schedule.is_paid || schedule.status === 'Paid'
        );

        if (paidSchedules.length > 0) {
          return await Promise.all(
            paidSchedules.map(async (schedule) => {
              let orNumber = schedule.OR || schedule.or_number;
              
              if (!orNumber) {
                orNumber = generateOrNumber(schedule);
                
                try {
                  // FIXED: Use consistent localhost URL
                  await axios.put(`http://localhost:8000/payment-schedules/${schedule.id}/`, {
                    ...schedule,
                    OR: orNumber,
                  }, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                } catch (error) {
                  console.warn('Could not save OR number:', error);
                }
              }

              return {
                ...schedule,
                or_number: orNumber,
              };
            })
          );
        }
      } catch (err) {
        console.log(`❌ Failed with account ${accountNumber}:`, err.message);
        continue;
      }
    }

    return [];
  };

  // Strategy 3: Fetch from direct payment API - FIXED
  const fetchFromDirectPaymentAPI = async (loan, token) => {
    const searchParams = [
      loan.archived_data?.control_number,
      loan.archived_data?.account_number,
      loan.archived_data?.member_id
    ].filter(Boolean);

    for (const param of searchParams) {
      try {
        console.log("🔍 Trying direct payments API with param:", param);
        
        // FIXED: Use consistent localhost URLs
        const endpoints = [
          `http://localhost:8000/payments/?account_number=${param}`,
          `http://localhost:8000/payments/?control_number=${param}`,
          `http://localhost:8000/payments/?member_id=${param}`
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 15000 // Increased timeout
            });

            if (response.data && response.data.length > 0) {
              return response.data.map(payment => ({
                ...payment,
                or_number: payment.OR || payment.or_number || generateOrNumber(payment),
                is_paid: true,
                status: 'Paid'
              }));
            }
          } catch (err) {
            console.log(`❌ Failed endpoint ${endpoint}:`, err.message);
            continue;
          }
        }
      } catch (err) {
        console.log(`❌ Failed with param ${param}:`, err.message);
        continue;
      }
    }

    return [];
  };

  // Strategy 4: NEW - Alternative endpoints
  const fetchFromAlternativeEndpoints = async (loan, token) => {
    const identifiers = [
      loan.archived_data?.control_number,
      loan.archived_data?.account_number,
      loan.archived_data?.member_id,
      loan.id
    ].filter(Boolean);

    const alternativeEndpoints = [
      'payment-history',
      'loan-payments', 
      'transactions',
      'member-payments',
      'payment-schedules',
      'schedules'
    ];

    for (const endpoint of alternativeEndpoints) {
      for (const identifier of identifiers) {
        try {
          console.log(`🔍 Trying ${endpoint} with ${identifier}`);
          
          const urls = [
            `http://localhost:8000/${endpoint}/?search=${identifier}`,
            `http://localhost:8000/${endpoint}/${identifier}/`,
            `http://localhost:8000/${endpoint}?loan_id=${identifier}`,
            `http://localhost:8000/${endpoint}?account=${identifier}`
          ];

          for (const url of urls) {
            try {
              const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 15000
              });

              if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                return response.data.map(payment => ({
                  ...payment,
                  or_number: payment.OR || payment.or_number || generateOrNumber(payment),
                  is_paid: true,
                  status: 'Paid'
                }));
              }
            } catch (err) {
              continue;
            }
          }
        } catch (err) {
          console.log(`❌ Failed ${endpoint} with ${identifier}:`, err.message);
          continue;
        }
      }
    }

    return [];
  };

  // ENHANCED ERROR HANDLING
  const handlePaymentFetchError = (err, loan) => {
    let errorMessage = 'Failed to fetch payment history.';
    
    // More specific error handling
    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to the server. Please check if the backend is running on localhost:8000.';
    } else if (err.response?.status === 404) {
      errorMessage = 'No payment records found for this archived loan.';
    } else if (err.response?.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
    } else if (err.response?.status === 403) {
      errorMessage = 'Access denied. You may not have permission to view payment history.';
    } else if (err.response?.status === 500) {
      errorMessage = 'Server error occurred. Please try again later.';
    } else if (err.message.includes('token')) {
      errorMessage = 'Authentication token not found. Please log in again.';
    } else if (err.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please check your internet connection and try again.';
    } else if (err.response?.data?.detail) {
      errorMessage = err.response.data.detail;
    } else if (err.response?.data?.error) {
      errorMessage = err.response.data.error;
    }
    
    console.error('Payment fetch error details:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message,
      code: err.code
    });
    
    setError(errorMessage);
    setPaymentHistory([]);
    setSelectedLoan(loan);
    setActiveTab('paymentHistory');
  };

  // MAIN PAYMENT FETCHING FUNCTION - ENHANCED
  const fetchPaymentHistory = async (loan) => {
    console.log("🔍 Starting payment fetch for loan:", loan.archived_data?.control_number);
    debugLoanData(loan); // Add debugging
    setLoading(true);
    setError('');
    
    try {
      const token = getAuthToken();
      
      // Strategy 1: Check archived payments first
      console.log("📋 Strategy 1: Checking archived payments...");
      const archivedPaymentResults = await fetchFromArchivedPayments(loan);
      if (archivedPaymentResults.length > 0) {
        setPaymentHistory(archivedPaymentResults);
        setSelectedLoan(loan);
        setActiveTab('paymentHistory');
        setError('');
        console.log("✅ Found payments in archived data:", archivedPaymentResults.length);
        return;
      }

      // Strategy 2: Try payment schedules API
      console.log("📋 Strategy 2: Trying payment schedules API...");
      const apiResults = await fetchFromPaymentSchedulesAPI(loan, token);
      if (apiResults.length > 0) {
        setPaymentHistory(apiResults);
        setSelectedLoan(loan);
        setActiveTab('paymentHistory');
        setError('');
        console.log("✅ Found payments via API:", apiResults.length);
        return;
      }

      // Strategy 3: Try direct payment API
      console.log("📋 Strategy 3: Trying direct payments API...");
      const directResults = await fetchFromDirectPaymentAPI(loan, token);
      if (directResults.length > 0) {
        setPaymentHistory(directResults);
        setSelectedLoan(loan);
        setActiveTab('paymentHistory');
        setError('');
        console.log("✅ Found payments via direct API:", directResults.length);
        return;
      }

      // Strategy 4: Try alternative endpoint patterns
      console.log("📋 Strategy 4: Trying alternative endpoints...");
      const alternativeResults = await fetchFromAlternativeEndpoints(loan, token);
      if (alternativeResults.length > 0) {
        setPaymentHistory(alternativeResults);
        setSelectedLoan(loan);
        setActiveTab('paymentHistory');
        setError('');
        console.log("✅ Found payments via alternative endpoints:", alternativeResults.length);
        return;
      }

      // If no payments found anywhere
      console.log("❌ No payments found in any source");
      setPaymentHistory([]);
      setSelectedLoan(loan);
      setActiveTab('paymentHistory');
      setError('No payment history found for this archived loan.');

    } catch (err) {
      console.error('❌ Error in fetchPaymentHistory:', err);
      handlePaymentFetchError(err, loan);
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (event) => {
    event.preventDefault();
    if (!actionType || !actionDescription) {
      alert('Both action type and description are required.');
      return;
    }
    try {
      const token = getAuthToken();
      await axios.post(
        'http://localhost:8000/log-action/',
        { action_type: actionType, description: actionDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Action logged successfully!');
      setActionType('');
      setActionDescription('');
    } catch (err) {
      console.error('Error logging action:', err);
      alert('Failed to log action.');
    }
  };

  const viewTransactions = async (member) => {
    setSelectedMember(member);
    const memId = member.archived_data?.memId || member.archived_data?.member_id || member.archived_data?.id;

    setLoading(true);
    try {
      const token = getAuthToken();
      const [accountsResponse, loansResponse, paymentsResponse] = await Promise.all([
        axios.get(`http://localhost:8000/member-accounts/${member.id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:8000/loan?member_id=${memId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:8000/payments?member_id=${memId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSelectedMember({
        ...member,
        accounts: accountsResponse.data,
        loan: loansResponse.data,
        payments: paymentsResponse.data,
      });

      setActiveTab('transactions');
    } catch (err) {
      console.error('Error fetching member details:', err);
      alert('Failed to fetch member details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle view payment button click
  const handleViewPayment = (loan) => {
    console.log("🔍 View Payment clicked for loan:", loan.archived_data?.control_number);
    fetchPaymentHistory(loan);
  };

  const filterData = (data, keys) => {
    if (!searchTerm.trim()) return data;
    return data.filter((item) =>
      keys.some((key) =>
        item.archived_data?.[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const filteredArchivedUsers = filterData(archivedUsers, ['memId', 'first_name', 'last_name', 'email']);
  const filteredArchivedLoans = filterData(archivedLoans, ['control_number', 'account_holder', 'loan_amount', 'status']);
  const filteredArchivedAccounts = filterData(archivedAccounts, ['account_number', 'status']);
  const filteredAuditTrail = filterData(auditTrail, ['action_type', 'description', 'user', 'timestamp']);

  const filteredTransactions = selectedMember
    ? [
        ...filteredArchivedLoans.filter(
          (loan) => loan.archived_data?.member_id === selectedMember.archived_data?.memId
        ),
        ...filteredArchivedAccounts.filter(
          (account) => account.archived_data?.member_id === selectedMember.archived_data?.memId
        ),
        ...filteredAuditTrail.filter(
          (log) => log.user === selectedMember.archived_data?.first_name
        ),
      ]
    : [];
    
  return (
    <div className="archived-records">
      <WarningNotification />
      {showConfig && <AutoDeleteConfig />}
      
      {!selectedMember && !selectedLoan && (
        <>
          {/* TAB SELECTOR AND CONFIG BUTTON */}
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
              </select>
            </div>
            
            {/* Auto-Delete Configuration Button */}
            <button
              onClick={() => setShowConfig(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 1px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', marginRight: '950px' }}
              title="Configure Auto-Delete Settings"
            >
              <FaCog />
              Auto-Delete Settings
            </button>
          </div>
        </>
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
                    <div><strong>Account Number:</strong> {selectedMember.archived_data?.accountN}</div>
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
            <table
              className="records-table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', textAlign: 'left', tableLayout: 'fixed', }}
            >
              <thead style={{ backgroundColor: '#f2f2f2' }}>
                <tr>
                  <th style={{ padding: '12px 20px', border: '0px', width: '200px' }}>Account Number</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '250px' }}>Account Holder</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '150px' }}>Status</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '200px' }}>Archived At</th>
                  <th style={{ padding: '12px 20px', border: '0px', width: '120px' }}>Delete In</th>
                </tr>
              </thead>
            </table>

            <div style={{ overflowY: 'auto' }}>
              <table
                className="records-table"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '16px', textAlign: 'left', tableLayout: 'fixed', scrollbarWidth: 'none', msOverflowStyle: 'none', }}
              >
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
          <div style={{overflowY: 'auto' }}>
            <table
              className="records-table"
              style={{width: '100%',borderCollapse: 'collapse',fontSize: '16px',textAlign: 'left',tableLayout: 'fixed',}}>
              <thead style={{ backgroundColor: '#f2f2f2' }}>
                <tr>
                  <th style={{ padding: '12px', border: '0px' }}>Control Number</th>
                  <th style={{ padding: '12px', border: '0px' }}>Account Holder</th>
                  <th style={{ padding: '12px', border: '0px' }}>Loan Amount</th>
                  <th style={{ padding: '12px', border: '0px' }}>Status</th>
                  <th style={{ padding: '12px', border: '0px' }}>Archived At</th>
                  
                  <th style={{ padding: '12px', border: '0px' }}>Actions</th>
                </tr>
              </thead>
            </table>
            <div style={{overflowY: 'auto' }}>
              <table
                className="records-table"
                style={{width: '100%',borderCollapse: 'collapse',fontSize: '16px',textAlign: 'left',tableLayout: 'fixed',scrollbarWidth: 'none',msOverflowStyle: 'none',}}>
                <tbody>
                  {filteredArchivedLoans.length > 0 ? (
                    filteredArchivedLoans.map((loan, index) => {
                      const archivedDate = new Date(loan.archived_at);
                    
                      
                      return (
                        <tr key={`loan-${loan.archived_data?.control_number || loan.id}-${index}`}>
                          <td style={{ padding: '10px' }}> {loan.archived_data?.control_number || 'N/A'} </td>
                          <td style={{ padding: '10px' }}>{loan.archived_data?.account_holder || 'N/A'}</td>
                          <td style={{ padding: '10px' }}> ₱{formatNumber(parseFloat(loan.archived_data?.loan_amount || 0).toFixed(2))} </td>
                          <td style={{ padding: '10px', color: loan.archived_data?.status?.toLowerCase() === 'ongoing' ? 'red' : loan.archived_data?.status?.toLowerCase() === 'paid-off' ? 'green' : 'black' }}> {loan.archived_data?.status || 'N/A'} </td>
                          <td style={{ padding: '1px' }}>{new Date(loan.archived_at).toLocaleString()}</td>
                          
                          
                          <td style={{ padding: '10px', textAlign: 'center' }}> 
                            <button onClick={() => handleViewPayment(loan)} className="actionButton actionButtonView" > 
                              <FaEye /> <span className="buttonText">View Payments</span> 
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

      {/* PAYMENT HISTORY VIEW */}
      {activeTab === 'paymentHistory' && selectedLoan && (
        <div className="payment-history-section">
          <div style={{ marginTop: '-50px', paddingTop: '20px' }}>
            <h3>Payment History of: {selectedLoan.archived_data?.account_holder}</h3>
            <nav style={{ display: 'flex', gap: '20px', marginBottom: '10px', alignItems: 'center' }}>
              <span
                onClick={() => {
                  setSelectedLoan(null);
                  setPaymentHistory([]);
                  setActiveTab('loan');
                  setError('');
                }}
                style={{ cursor: 'pointer', fontWeight: 'bold', color: 'green', fontSize: '18px' }}
              >
                ← Back to List
              </span>
              {/* Print Button */}
              <button
                onClick={() => {
                  const printContent = document.querySelector('.payment-table-print');
                  const accountHolder = selectedLoan.archived_data?.account_holder || 'N/A';
                  const controlNumber = selectedLoan.archived_data?.control_number || 'N/A';
                  const loanAmount = selectedLoan.archived_data?.loan_amount || 'N/A';
                  
                  if (printContent) {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                            <title>Payment History - ${accountHolder}</title>
                            <style> body { font-family: Arial, sans-serif; margin: 20px; color: #000; } h2 { text-align: center; margin-bottom: 20px; color: black; } .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; padding: 10px; border: 1px solid black; border-radius: 10px; max-width: 450px; font-family: Arial, sans-serif; font-size: 14px; margin: 0 0 20px 0; text-align: left; } table { width: 100%; border-collapse: collapse; margin: 0 auto; } th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; } th { background-color: #4CAF50; color: white; font-weight: bold; } tbody tr:nth-child(even) { background-color: #f9f9f9; } @media print { body { margin: 0; } table { font-size: 10px; } th, td { padding: 6px; } } </style>
                        </head>
                        <body>
                            <h2>Payment History</h2>
                            <div class="info-grid">
                                <div><strong>Control Number:</strong> ${controlNumber}</div>
                                <div><strong>Account Holder:</strong> ${accountHolder}</div>
                                <div><strong>Date Today:</strong> ${new Date().toLocaleDateString()}</div>
                                <div><strong>Loan Amount:</strong> ₱${typeof formatNumber === 'function' ? formatNumber(loanAmount) : loanAmount}</div>
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', backgroundColor: '#ede9c7', fontSize: '25px', cursor: 'pointer', border: 'none', position: 'fixed', right: '20px', top: '230px', zIndex: '1000', padding: '10px', }}
                className="print-button"
                title="Print Payment History"
              >
                <span style={{ marginRight: '8px' }}><BsFillPrinterFill /></span>
              </button>
            </nav>
            {/* Flex Container */}
            <div className="print-container" style={{display: 'flex',flexDirection: 'row',justifyContent: 'space-between',alignItems: 'flex-start',gap: '30px',padding: '25px',backgroundColor: '',border: '1px solid #ccc',borderRadius: '12px',boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',marginLeft: '-30px',width: '101%',overflowX: 'auto',scrollbarWidth: 'none',msOverflowStyle: 'none',height: '370px'}}>
              {/* Loan Details - Left Side */}
              <div className="loan-details-print" style={{flex: '1',border: '1px solid #ccc',borderRadius: '10px',padding: '25px',backgroundColor: '#fef7f7ff',minWidth: '500px',maxWidth: '100%', marginTop: '70px', fontSize: '17px'}}>
                <h4 style={{fontWeight: 'bold', fontSize: '20px', marginTop: '-10px'}}>Loan Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  <div><strong>Control Number:</strong> {selectedLoan.archived_data?.control_number}</div>
                  <div><strong>Account Number:</strong> {selectedLoan.archived_data?.account|| 'N/A'}</div>
                  <div><strong>Account Holder:</strong> {selectedLoan.archived_data?.account_holder}</div>
                  <div><strong>Loan Amount:</strong> ₱{formatNumber(selectedLoan.archived_data?.loan_amount || 0)}</div>
                  <div> 
                    <strong>Status:</strong>{" "} 
                    <span style={{ 
                      padding: "10px", 
                      color: selectedLoan.archived_data?.status?.toLowerCase() === "paid-off" ? "green" : "orange", 
                      fontWeight: "bold", 
                    }}> 
                      {selectedLoan.archived_data?.status || "N/A"} 
                    </span> 
                  </div>
                  <div><strong>Loan Type:</strong> {selectedLoan.archived_data?.loan_type || 'N/A'}</div>
                  <div><strong>Approval Date:</strong> {selectedLoan.archived_data?.loan_date ? new Date(selectedLoan.archived_data.loan_date).toLocaleDateString() : 'N/A'}</div>
                  <div><strong>Archived Date:</strong> {new Date(selectedLoan.archived_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Payment History Table - Right Side */}
              {!loading && !error && paymentHistory.length > 0 && (
                <div className="payment-table-print" style={{ flex: '2', backgroundColor: '#fef7f7ff', border: '1px solid #ccc', borderRadius: '10px', maxHeight: '360px', overflowY: 'auto', padding: '5px', borderRadius: '5px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '16px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#4CAF50', color: 'white', position: 'sticky', top: '-5px', zIndex: '1' }}>
                        <th style={{ padding: '12px' }}>Loan Type</th>
                        <th style={{ padding: '12px' }}>Paid Amount</th>
                        <th style={{ padding: '12px' }}>Date Paid</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>OR Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment, index) => (
                        <tr key={`payment-${payment.id || index}-${index}`} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '10px' }}>{payment.loan_type || 'N/A'}</td>
                          <td style={{ padding: '10px' }}> ₱{formatNumber(parseFloat(payment.payment_amount || 0).toFixed(2))} </td>
                          <td style={{ padding: '10px' }}>{new Date(payment.due_date).toLocaleDateString()}</td>
                          <td style={{ color: payment.is_paid ? 'green' : 'red' }}>{payment.is_paid ? 'Paid!' : 'Ongoing'}</td>
                          <td style={{ padding: '10px' }}>{payment.or_number || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div style={{ flex: '2', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <p>Loading payment history...</p>
                </div>
              )}
              {/* Error State */}
              {error && !loading && (
                <div style={{ flex: '2', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <p style={{ color: 'red' }}>{error}</p>
                </div>
              )}
              {/* No Data State */}
              {!loading && !error && paymentHistory.length === 0 && (
                <div style={{ flex: '2', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                  <p>No payment history found for this loan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivedRecords;