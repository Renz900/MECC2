import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaRegCreditCard, FaArchive } from "react-icons/fa";
import { TbFilterEdit } from "react-icons/tb";
import './LoanHistory.css';

const LoanManager = () => {
    const [members, setMembers] = useState([]);
    const [loans, setLoans] = useState([]);
    const [archivedLoans, setArchivedLoans] = useState([]); // New state for archived loans
    const [accountsList, setAccountList] = useState([]);
    const [showArchive, setShowArchive] = useState(false); // Toggle between active and archived loans
    const [loanData, setLoanData] = useState({
        name: '',
        account: '',
        loan_amount: '',
        loan_period: '',
        loan_period_unit: 'years',
        loan_type: 'Regular',
        purpose: 'Education',
        status: 'Ongoing',
        co_maker: "",
        co_maker_2: "",
        co_maker_3: "",
        co_maker_4: "",
        co_maker_5: "",
        account_holder: ""
    });
    const [coMakers, setCoMakers] = useState([]);
    const [makersModal, setMakersModal] = useState(false);
    const [formVisible, setFormVisible] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [errors, setErrors] = useState(null);
    const [paymentFormVisible, setPaymentFormVisible] = useState(false);
    const [selectedLoanForPayment, setSelectedLoanForPayment] = useState(null);
    const [showPrintButton, setShowPrintButton] = useState(false);
    const [newLoan, setNewLoan] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOtherPurpose, setShowOtherPurpose] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [showFilterOptions, setShowFilterOptions] = useState(false);
    const [filter, setFilter] = useState('');
    const [filteredLoans, setFilteredLoans] = useState(loans);
    const [selectedDate, setSelectedDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showNoLoanPopup, setShowNoLoanPopup] = useState(false);
    const [shareCapital, setShareCapital] = useState(null);
    const [searchOption, setSearchOption] = useState('');
    const [loanSubmitted, setLoanSubmitted] = useState(false);
    const [makerOneSearch, setMakerOneSearch] = useState([]);
    const [makerTwoSearch, setMakerTwoSearch] = useState([]);
    const [makerThreeSearch, setMakerThreeSearch] = useState([]);
    const [makerFourSearch, setMakerFourSearch] = useState([]);
    const [makerFiveSearch, setMakerFiveSearch] = useState([]);
    const [membersName, setMemberNames] = useState([]);
    const [accountHolder, setAccountHolder] = useState([]);
    const [activeLoanType, setActiveLoanType] = useState('Regular');
    

    const BASE_URL = 'http://localhost:8000';
    const navigate = useNavigate();

    // Function to automatically archive paid-off loans using your existing archive system
    const autoArchivePaidOffLoans = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const paidOffLoans = loans.filter(loan => loan.status.toLowerCase() === 'paid-off');
            
            if (paidOffLoans.length > 0) {
                // Move each paid-off loan to your existing archive table
                for (const loan of paidOffLoans) {
                    // Use your existing archive endpoint with archive_type='Loan'
                    await axios.post(`${BASE_URL}/archives/`, {
                        archive_type: 'Loan',
                        archived_data: loan
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    // Delete from active loans table
                    await axios.delete(`${BASE_URL}/loans/${loan.control_number}/`);
                }
                
                // Refresh the loans list
                fetchLoans();
                fetchArchivedLoans();
                
                setPopupMessage(`${paidOffLoans.length} paid-off loan(s) have been automatically archived.`);
                setShowPopup(true);
                setTimeout(() => {
                    setShowPopup(false);
                }, 3000);
            }
        } catch (error) {
            console.error('Error auto-archiving loans:', error);
            setPopupMessage('Error auto-archiving loans. Please try again.');
            setShowPopup(true);
        }
    };

    // Function to manually archive a specific loan
    const archiveLoan = async (loan) => {
        try {
            const token = localStorage.getItem('authToken');
            
            // Archive the loan using your existing system
            await axios.post(`${BASE_URL}/archives/`, {
                archive_type: 'Loan',
                archived_data: loan
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Delete from active loans
            await axios.delete(`${BASE_URL}/loans/${loan.control_number}/`);
            
            fetchLoans();
            fetchArchivedLoans();
            
            setPopupMessage('Loan has been archived successfully.');
            setShowPopup(true);
            setTimeout(() => {
                setShowPopup(false);
            }, 2000);
        } catch (error) {
            console.error('Error archiving loan:', error);
            setPopupMessage('Error archiving loan. Please try again.');
            setShowPopup(true);
        }
    };

    // Function to restore loan from archive
    const restoreLoan = async (archivedRecord) => {
        try {
            const token = localStorage.getItem('authToken');
            
            // Create the loan back in active table
            await axios.post(`${BASE_URL}/loans/`, archivedRecord.archived_data);
            
            // Delete from archive table
            await axios.delete(`${BASE_URL}/archives/${archivedRecord.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            fetchLoans();
            fetchArchivedLoans();
            
            setPopupMessage('Loan has been restored successfully.');
            setShowPopup(true);
            setTimeout(() => {
                setShowPopup(false);
            }, 2000);
        } catch (error) {
            console.error('Error restoring loan:', error);
            setPopupMessage('Error restoring loan. Please try again.');
            setShowPopup(true);
        }
    };

    // Fetch archived loans from your existing archive system
    const fetchArchivedLoans = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get(`${BASE_URL}/archives/?archive_type=Loan`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setArchivedLoans(response.data || []);
        } catch (err) {
            console.error('Error fetching archived loans:', err);
            setArchivedLoans([]);
        }
    };

    // Your existing functions remain the same...
    const handleHolderChange = (e) => {
        setLoanData({ ...loanData, account_holder: e.target.value });
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));
        setAccountHolder(searchValue == "" ? [] : results);
    }

    // ... (keep all your existing handler functions)

    const fetchLoans = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/loans/`);
            setLoans(response.data);
            setFilteredLoans(response.data);
            
            // Auto-archive paid-off loans after fetching
            setTimeout(() => {
                autoArchivePaidOffLoans();
            }, 1000);
        } catch (err) {
            console.error('Error fetching loans:', err.response || err);
            setErrors('Error fetching loans');
            setFilteredLoans([]);
        }
    };

    useEffect(() => {
        fetchLoans();
        fetchArchivedLoans();
    }, []);

    // ... (keep all your existing useEffects and functions)

    const formatNumber = (number) => {
        if (number == null || isNaN(number)) return "N/A";
        return new Intl.NumberFormat('en-US').format(number);
    };

    // Filter loans based on archive view and loan type
    const displayedLoans = showArchive 
        ? archivedLoans.filter(loan => loan.archived_data?.loan_type === activeLoanType)
        : filteredLoans.filter(loan => loan.loan_type === activeLoanType);

    // ... (keep your existing validation and form handling functions)

    return (
        <div className="loan-manager">
            <h2 className="loan-manager-header">
                {showArchive ? 'ARCHIVED LOANS' : 'LOAN MANAGEMENT'}
            </h2>
            
            {!formVisible && !paymentFormVisible && (
                <div className="search-container">
                    {/* Archive Toggle Button */}
                    <div className="archive-toggle" style={{ marginBottom: '20px' }}>
                        <button
                            onClick={() => setShowArchive(!showArchive)}
                            style={{
                                backgroundColor: showArchive ? '#f44336' : '#2196F3',
                                color: 'white',
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                marginRight: '10px'
                            }}
                        >
                            <FaArchive style={{ marginRight: '5px' }} />
                            {showArchive ? 'View Active Loans' : 'View Archive'}
                        </button>
                        
                        {!showArchive && (
                            <button
                                onClick={autoArchivePaidOffLoans}
                                style={{
                                    backgroundColor: '#FF9800',
                                    color: 'white',
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer'
                                }}
                            >
                                Auto-Archive Paid Loans
                            </button>
                        )}
                    </div>

                    {/* Your existing search and filter components */}
                    <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder={showArchive ? "Search Archived Loans" : "Search Loans"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                            style={{
                                padding: '7px 40px 10px 10px',
                                fontSize: '16px',
                                border: '0px',
                                borderRadius: '4px',
                                width: '250px',
                                marginBottom: '30px',
                                marginTop: '-10px',
                                marginLeft: '900px'
                            }}
                        />
                        {/* Keep your existing filter components */}
                    </div>
                </div>
            )}

            {/* Your existing form components remain the same */}

            {!formVisible && !paymentFormVisible && (
                <div className="loan-table-wrapper">
                    <div className="loan-buttons-fixed">
                        <button onClick={() => setActiveLoanType('Regular')}>
                            📌 Regular Loan
                        </button>
                        <button onClick={() => setActiveLoanType('Emergency')}>
                            ⚠️ Emergency Loan
                        </button>
                    </div>
                    
                    <div className="loan-table-scroll">
                        <table className="loan-table">
                            <thead>
                                <tr>
                                    <th>Control Number</th>
                                    <th>Account Number</th>
                                    <th>Account Holder</th>
                                    <th>Loan Type</th>
                                    <th>Loan Amount</th>
                                    <th>Service Fee</th>
                                    <th>Interest Amount</th>
                                    <th>Admin Cost</th>
                                    <th>Notarial Fee</th>
                                    <th>CISP</th>
                                    <th>TakeHome</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                    <th>Co Makers</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedLoans.length > 0 ? (
                                    displayedLoans.map((loan) => {
                                        // Handle both active loans and archived loans structure
                                        const loanData = showArchive ? loan.archived_data : loan;
                                        
                                        return (
                                            <tr key={loanData.control_number}>
                                                <td>{loanData.control_number}</td>
                                                <td>{loanData.account || 'N/A'}</td>
                                                <td>{loanData.account_holder || 'N/A'}</td>
                                                <td>{loanData.loan_type}</td>
                                                <td>{formatNumber(loanData.loan_amount)}</td>
                                                <td>{formatNumber(loanData.service_fee)}</td>
                                                <td>{formatNumber(loanData.interest_amount)}</td>
                                                <td>{formatNumber(loanData.admincost)}</td>
                                                <td>{formatNumber(loanData.notarial)}</td>
                                                <td>{formatNumber(loanData.cisp)}</td>
                                                <td>{formatNumber(loanData.takehomePay)}</td>
                                                <td>{loanData.purpose}</td>
                                                <td style={{ 
                                                    color: loanData.status.toLowerCase() === 'ongoing' ? 'red' : 
                                                           loanData.status.toLowerCase() === 'paid-off' ? 'green' : 'black' 
                                                }}>
                                                    {loanData.status}
                                                    {showArchive && (
                                                        <div style={{ fontSize: '10px', color: '#666' }}>
                                                            Archived: {new Date(loan.archived_at).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button onClick={() => {
                                                        setCoMakers([loanData.co_maker, loanData.co_maker_2, loanData.co_maker_3, loanData.co_maker_4, loanData.co_maker_5]);
                                                        setMakersModal(true)
                                                    }}>
                                                        View
                                                    </button>
                                                </td>
                                                <td>
                                                    {showArchive ? (
                                                        <button
                                                            onClick={() => restoreLoan(loan)}
                                                            style={{
                                                                backgroundColor: '#4CAF50',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '5px 10px',
                                                                borderRadius: '3px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => archiveLoan(loanData)}
                                                            disabled={loanData.status.toLowerCase() !== 'paid-off'}
                                                            style={{
                                                                backgroundColor: loanData.status.toLowerCase() === 'paid-off' ? '#FF9800' : '#ccc',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '5px 10px',
                                                                borderRadius: '3px',
                                                                cursor: loanData.status.toLowerCase() === 'paid-off' ? 'pointer' : 'not-allowed',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            Archive
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="15" style={{ textAlign: 'center' }}>
                                            No {showArchive ? 'Archived' : ''} {activeLoanType} Loans found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Your existing modals and popups remain the same */}
            {makersModal && (
                <div className='makers-modal'>
                    <div className='modal-content'>
                        <button onClick={() => setMakersModal(false)} className='close-btn'>X</button>
                        <div className='modal-header'>
                            <h2>Co-Makers</h2>
                        </div>
                        <div className='modal-body'>
                            {coMakers.map((maker, index) => (
                                <div key={index} className='maker'>
                                    <p>{maker}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-box">
                        <div className="popup">
                            <p>{popupMessage}</p>
                        </div>
                        <ul>
                            {Object.values(errors || {}).map((error, index) => (
                                <li key={index} className="error-text">
                                    {error}
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setShowPopup(false)} className="close-btn">OK</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoanManager;