import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { FaRegCreditCard, FaArchive} from "react-icons/fa";
import { TbFilterEdit } from "react-icons/tb";
import './LoanHistory.css';

const LoanManager = () => {
    const [members, setMembers] = useState([]);
    const [loans, setLoans] = useState([]);
    const [accountsList, setAccountList] = useState([]);
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
        account_holder:""
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
    const [filter, setFilter] = useState(''); // Tracks selected filter type
    const [filteredLoans, setFilteredLoans] = useState(loans); // Assuming loans is the array you're filtering
    const [selectedDate, setSelectedDate] = useState(''); // State for selected single day date
    const [startDate, setStartDate] = useState(''); // State for start date in date range
    const [endDate, setEndDate] = useState(''); // State for end date in date range // Add this line for the filter state
    const [showNoLoanPopup, setShowNoLoanPopup] = useState(false);
    const [shareCapital, setShareCapital] = useState(null);
    const [searchOption, setSearchOption] = useState('');
    const [loanSubmitted, setLoanSubmitted] = useState(false);
    const [makerOneSearch, setMakerOneSearch] = useState([]);
    const [makerTwoSearch, setMakerTwoSearch] = useState([]);
    const [makerThreeSearch, setMakerThreeSearch] = useState([]);
    const [makerFourSearch,setMakerFourSearch] = useState([]);
    const [makerFiveSearch,setMakerFiveSearch] = useState([]);
    const [membersName, setMemberNames] = useState([]);
    const [accountHolder, setAccountHolder] = useState([]);
    const [activeLoanType, setActiveLoanType] = useState('Regular');  //berts
    

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
                    await axios.delete(`${BASE_URL}/loans/${loan.control_number}/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
                
                // Refresh the loans list
                await fetchLoans();
                
                setPopupMessage(`${paidOffLoans.length} paid-off loan(s) have been automatically archived.`);
                setShowPopup(true);
                setTimeout(() => {
                    setShowPopup(false);
                }, 3000);
            }
        } catch (error) {
            setShowPopup(true);
        }
    };

    // Fixed archive function with better error handling
    const archiveLoan = async (loan) => {
        try {
            // Check for different possible token names
            let token = localStorage.getItem('authToken') || 
                       localStorage.getItem('token') || 
                       localStorage.getItem('access_token') ||
                       localStorage.getItem('accessToken');
            
            console.log('Available localStorage keys:', Object.keys(localStorage));
            console.log('Token found:', token ? 'Yes' : 'No');
            
            if (!token) {
                // Try to get token from sessionStorage as backup
                token = sessionStorage.getItem('authToken') || 
                       sessionStorage.getItem('token') || 
                       sessionStorage.getItem('access_token') ||
                       sessionStorage.getItem('accessToken');
                       
                console.log('Token from sessionStorage:', token ? 'Yes' : 'No');
            }
            
            if (!token) {
                setPopupMessage('Authentication token not found. Please log in again.');
                setShowPopup(true);
                return;
            }

            console.log('Archiving loan:', loan.control_number);
            console.log('Using token:', token.substring(0, 20) + '...');

            // Archive the loan using your existing system
            const archiveResponse = await axios.post(`${BASE_URL}/archives/`, {
                archive_type: 'Loan',
                archived_data: loan
            }, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Archive response:', archiveResponse.data);
            
            // Delete from active loans
            const deleteResponse = await axios.delete(`${BASE_URL}/loans/${loan.control_number}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Delete response:', deleteResponse.data);
            
            // Refresh the data
            await fetchLoans();
            
            setPopupMessage('Loan has been archived successfully.');
            setShowPopup(true);
            setTimeout(() => {
                setShowPopup(false);
            }, 2000);
            
        } catch (error) {
            console.error('Error archiving loan:', error);
            
            // More detailed error handling
            let errorMessage = 'Error archiving loan. Please try again.';
            
            if (error.response) {
                // Server responded with error status
                const status = error.response.status;
                const data = error.response.data;
                
                if (status === 401) {
                    errorMessage = 'Authentication failed. Please log in again.';
                    // Clear invalid token
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('token');
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('accessToken');
                } else if (status === 403) {
                    errorMessage = 'Permission denied. You do not have access to archive loans.';
                } else {
                    errorMessage = data?.message || data?.detail || `Server error: ${status}`;
                }
                
                console.error('Server error:', status, data);
            } else if (error.request) {
                // Request made but no response
                errorMessage = 'Network error. Please check your connection.';
                console.error('Network error:', error.request);
            } else {
                // Something else happened
                console.error('Error:', error.message);
                errorMessage = error.message;
            }
            
            setPopupMessage(errorMessage);
            setShowPopup(true);
            setTimeout(() => {
                setShowPopup(false);
            }, 3000);
        }
    };

    const handleHolderChange = (e) => {
        setLoanData({ ...loanData, account_holder: e.target.value });
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));
        setAccountHolder(searchValue == "" ? [] : results);
    }
    
    const handleMakerOneSearch = (e) => {
        setMakerOneSearch([]);
        setLoanData({ ...loanData, co_maker: e.target.value })
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));

        setMakerOneSearch(searchValue == "" ? [] : results);
    };
    
    const handleMakerTwoSearch = (e) => {
        setMakerTwoSearch([]);
        setLoanData({ ...loanData, co_maker_2: e.target.value })
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));
        setMakerTwoSearch(searchValue == "" ? [] : results);
    };
    
    const handleMakerThreeSearch = (e) => {
        setMakerThreeSearch([]);
        setLoanData({ ...loanData, co_maker_3: e.target.value })
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));
        setMakerThreeSearch(searchValue == "" ? [] : results);
    };
    
    const handleMakerFourSearch = (e) => {
        setMakerFourSearch([]);
        setLoanData({ ...loanData, co_maker_4: e.target.value })
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));
        setMakerFourSearch(searchValue == "" ? [] : results);
    };
    
    const handleMakerFiveSearch = (e) => {
        setMakerFiveSearch([]);
        setLoanData({ ...loanData, co_maker_5: e.target.value })
        const searchValue = e.target.value;
        const results = membersName.filter((member) => member.name.toLowerCase().includes(searchValue.toLowerCase()));
        setMakerFiveSearch(searchValue == "" ? [] : results);
    };
    
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/members/"); 
                const data = await response.json();
                console.log("🛠️ Raw API Response:", data); // ✅ Debug API Response
                // Ensure we are storing the right structure
                const formattedData = data.map(member => ({
                    name: `${member.first_name} ${member.middle_name} ${member.last_name}`,
                    accountN: member.accountN || "❌ Missing",  // ✅ Add fallback to detect errors
                    share_capital: member.share_capital || "❌ Missing"
                }));
                console.log("✅ Processed Members Data:", formattedData); // ✅ Debug processed data
                setMemberNames(formattedData); 
            } catch (error) {
                console.error("❌ API Fetch Error:", error);
            }
        };
        fetchMembers();
    }, []);
    
    const formatNumber = (number) => {
        if (number == null || isNaN(number)) return "N/A";
        return new Intl.NumberFormat('en-US').format(number);
    };

    useEffect(() => {
        const fetchShareCapital = async () => {
            // Only fetch if form is visible and account exists
            if (!formVisible || !loanData.account) {
                return;
            }
            
            try {
                const token = localStorage.getItem('authToken');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                
                const response = await axios.get(`${BASE_URL}/accounts/${loanData.account}/shareCapital/`, { headers });
                setShareCapital(response.data.shareCapital);
                
                // Clear any share capital related errors
                setErrors(prev => {
                    const { shareCapital, ...otherErrors } = prev || {};
                    return otherErrors;
                });
                
            } catch (err) {
                console.error('Error fetching share capital:', err);
                
                // Only set error if form is visible (user is actively using the form)
                if (formVisible) {
                    setErrors(prev => ({ 
                        ...prev, 
                        shareCapital: 'Error fetching share capital' 
                    }));
                }
            }
        };
        
        fetchShareCapital();
    }, [loanData.account, formVisible]);

    // Fixed fetchLoans function with better error handling
    const fetchLoans = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(`${BASE_URL}/loans/`, { headers });
            
            // Ensure response.data is an array
            const loansData = Array.isArray(response.data) ? response.data : [];
            
            setLoans(loansData);
            setFilteredLoans(loansData);
            
            // Auto-archive paid-off loans after fetching (with delay to prevent conflicts)
            setTimeout(() => {
                autoArchivePaidOffLoans();
            }, 1000);
            
        } catch (err) {
            console.error('Error fetching loans:', err);
            
            // Don't break the UI if fetch fails
            setLoans([]);
            setFilteredLoans([]);
            
            // Only show error if it's not a network issue during archive
            if (!err.message?.includes('Network Error')) {
                setErrors('Error fetching loans');
            }
        }
    };
    
    useEffect(() => {
        fetchLoans();
    }, []);
    
    const validateLoanData = () => {
        const errors = {};
        const { loan_type, loan_amount, loan_period } = loanData;
        if (!loan_amount || loan_amount <= 0) {
            errors.loan_amount = 'Loan amount must be greater than 0.';
        } else if (loan_type === 'Emergency' && loan_amount > 50000) {
            errors.loan_amount = 'Emergency loans cannot exceed 50,000.';
        } else if (loan_type === 'Regular' && parseFloat (loan_amount) > 1500000 ) {
            errors.loan_amount = 'Regular loans cannot exceed 1.5 million.';
        } else if (loan_type === 'Regular' && parseFloat(loan_amount) > parseFloat(shareCapital) * 3) {
            errors.loan_amount = 'Regular loans cannot exceed 3 times your share capital.';
        }
        if (!loan_period || loan_period <= 0) {
            errors.loan_period = 'Loan period must be at least 1 month.';
        } else if (loan_type === 'Emergency' && loan_period > 6) {
            errors.loan_period = 'Emergency loans cannot exceed 6 months.';
        }else if (loan_type === 'Regular' && loan_period > 48) {
            errors.loan_period = 'Regular loans cannot exceed to 4 years.'
        }
        return errors;
    };
    
    useEffect(() => {
        const search = searchQuery.toLowerCase();
        const filtered = loans.filter((loan) => {
            const matches = {
                control_number: loan.control_number?.toString().includes(search),
                account: loan.account?.toString().toLowerCase().includes(search),
                account_holder: loan.account_holder?.toLowerCase().includes(search),
                loan_type: loan.loan_type?.toLowerCase().includes(search),
                purpose: loan.purpose?.toLowerCase().includes(search),
                status: loan.status?.toLowerCase().includes(search),
            };
            return Object.values(matches).some((match) => match);
        });
        setFilteredLoans(filtered);
        console.log("filtered loans", filtered);
    }, [searchQuery, loans]);
    
    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await axios.get("http://localhost:8000/members/");
                setAccountList(response.data);
                console.log("fetch members :: ", response.data);
            } catch (error) {
                console.error("Error fetching members:", error);
            }
        };
        fetchMembers();
    }, []);
    
    const filteredMembers = members.filter((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLoanData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };
    
    const handleLoanSubmit = async (e) => {
        e.preventDefault();
        console.log("submitting loan data", loanData);
        if (!shareCapital) {
            // Handle the case where shareCapital is not yet fetched
            console.log('Unable to retrieve share capital.');
            // return;
        }
        const validationErrors = validateLoanData();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setShowPopup(true);
            setPopupMessage('Kindly look into this.');
            return; // Stop if validation errors exist
        }
        setErrors({}); // Reset errors
        console.log("hahah")
        try {
            if (editingLoan) {
                await axios.put(`${BASE_URL}/loans/${editingLoan.control_number}/`, loanData);
            } else {
                const name = loanData.account_holder;
                let new_account = '';
                if (loanData.account_holder){
                  
                    const acc_number = accountsList.find(elem => name.includes(elem.first_name) || name.includes(elem.last_name) || name.includes(name.middle_name));
                    new_account = acc_number.accountN;
                    // setLoanData({...loanData, account:acc_number.accountN});
                }else{
                    new_account = loanData.account;
                }
                const response = await axios.post(`${BASE_URL}/loans/`, {...loanData, account:new_account});
                console.log(response);
                setNewLoan(response.data);
                setShowPrintButton(true);
                setPopupMessage('Loan successfully created!');
                setShowPopup(true);
                setLoanSubmitted(true);
                setTimeout(() => {
                    setShowPopup(false);
                }, 1000);
            }
            fetchLoans();
        } catch (err) {
            console.error('Error saving loan:', err);
            setErrors('Error saving loan');
            setPopupMessage('Failed to create loan. Please try again.');
            setShowPopup(true);
        }
    };
    
    const closePopup = () => {
        setShowPopup(false);
    };
    
    const handleDateFilter = () => {
        let filtered = loans;

        if (filter === "today") {
            const today = new Date().toISOString().split('T')[0];
            filtered = loans.filter((loan) => loan.loan_date === today);
        } else if (filter === "single-day") {
            if (selectedDate) {
                filtered = loans.filter((loan) => loan.loan_date === selectedDate);
            }
        } else if (filter === "date-range") {
            if (startDate && endDate) {
                filtered = loans.filter(
                    (loan) => loan.loan_date >= startDate && loan.loan_date <= endDate
                );
            }
        }
        if (filtered.length === 0) {
            setShowNoLoanPopup(true); 
        } else {
            setShowNoLoanPopup(false); 
        }
        setFilteredLoans(filtered);
    };
    
    const resetForm = () => {
        setLoanData({
            control_number: '',
            account: '',
            loan_amount: '',
            loan_period: '',
            loan_period_unit: 'months',
            loan_type: 'Emergency',
            purpose: 'Education',
            status: 'Ongoing',
        });
        setFormVisible(false);
        setEditingLoan(null);
        setShowPrintButton(false);
        setNewLoan(null);
        setPaymentFormVisible(false);
        setSelectedLoanForPayment(null);
    };

    return (
        <div className="loan-manager">
            <h2 className="loan-manager-header">LOAN MANAGEMENT</h2>
            {!formVisible && !paymentFormVisible && (
                <div className="search-container">

                    <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search Loans"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                            style={{padding: '7px 40px 10px 10px',fontSize: '16px',border: '0px',borderRadius: '4px',width: '250px',marginBottom: '30px',marginTop: '-10px',marginLeft: '900px',}}/>
                        <div
                            onClick={() => setShowFilterOptions(!showFilterOptions)} // Toggle the filter options
                            className="date-filter-icon"
                            style={{display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '20px', marginBottom: '30px', marginTop: '-10px', marginLeft: '10px',}}><span style={{ marginRight: '5px' }}>Range</span><TbFilterEdit />
                        </div>
                        {showFilterOptions && (
                            <div
                                className="filter-options"
                                style={{ position: 'absolute', top: '40px', left: '1085px', backgroundColor: 'white', boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)', borderRadius: '4px', padding: '10px', zIndex: 100, width: '150px', }} >
                                <button
                                    onClick={() => {
                                        setFilter('today');
                                        handleDateFilter();
                                        setShowFilterOptions(false);
                                    }}
                                    className={`filter-button ${filter === 'today' ? 'selected-filter' : ''}`}
                                    style={{ color: filter === 'today' ? 'green' : 'inherit', backgroundColor: 'transparent', border: 'none', padding: '5px 10px', cursor: 'pointer', }} > Today
                                </button>
                                <button
                                    onClick={() => {
                                        setFilter('single-day');
                                        setShowFilterOptions(true); // Keep dropdown open for "Single Day"
                                    }}
                                    className={`filter-button ${filter === 'single-day' ? 'selected-filter' : ''}`}
                                    style={{ color: filter === 'single-day' ? 'green' : 'inherit', backgroundColor: 'transparent', border: 'none', padding: '5px 10px', cursor: 'pointer', }} > Single Day
                                </button>
                                <button
                                    onClick={() => {
                                        setFilter('date-range');
                                        setShowFilterOptions(true); // Keep dropdown open for "Date Range"
                                    }}
                                    className={`filter-button ${filter === 'date-range' ? 'selected-filter' : ''}`}
                                    style={{ color: filter === 'date-range' ? 'green' : 'inherit', backgroundColor: 'transparent', border: 'none', padding: '5px 10px', cursor: 'pointer', }} > Date Range
                                </button>
                                <button
                                    onClick={() => {
                                        setFilter('all-date');
                                        handleDateFilter(); // Display all data without needing to click again
                                        setShowFilterOptions(false); // Close dropdown
                                    }}
                                    className={`filter-button ${filter === 'all-date' ? 'selected-filter' : ''}`}
                                    style={{ color: filter === 'all-date' ? 'green' : 'inherit', backgroundColor: 'transparent', border: 'none', padding: '5px 10px', cursor: 'pointer', marginTop: '10px', }} > All Date
                                </button>
                                {filter === "single-day" && (
                                    <>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="date-input"
                                            placeholder="Select a Date"
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                            <button
                                                onClick={() => {
                                                    if (selectedDate) {
                                                        handleDateFilter();
                                                    } else {
                                                        setFilter('all-date'); // Automatically reset to "All Date"
                                                        handleDateFilter(); // Display all data
                                                    }
                                                    setShowFilterOptions(false); // Close dropdown after applying filter
                                                }}
                                                className="apply-filter-button"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setFilter('all-date'); // Automatically reset to "All Date"
                                                    setSelectedDate(""); // Reset selected date
                                                    handleDateFilter(); // Display all data
                                                    setShowFilterOptions(false); // Close dropdown on cancel
                                                }}
                                                className="cancel-filter-button"
                                                style={{ color: 'red', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', }} > Cancel
                                            </button>
                                        </div>
                                    </>
                                )}

                                {filter === "date-range" && (
                                    <>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="date-input"
                                            placeholder="Start Date"
                                        />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="date-input"
                                            placeholder="End Date"
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                            <button
                                                onClick={() => {
                                                    if (startDate && endDate) {
                                                        handleDateFilter();
                                                    } else {
                                                        setFilter('all-date'); // Automatically reset to "All Date"
                                                        handleDateFilter(); // Display all data
                                                    }
                                                    setShowFilterOptions(false); // Close dropdown after applying filter
                                                }}
                                                className="apply-filter-button"
                                            >
                                                Apply
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setFilter('all-date'); // Automatically reset to "All Date"
                                                    setStartDate("");
                                                    setEndDate("");
                                                    handleDateFilter(); // Display all data
                                                    setShowFilterOptions(false); // Close dropdown on cancel
                                                }}
                                                className="cancel-filter-button"
                                                style={{ color: 'red', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', }} > Cancel
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {showNoLoanPopup && (
                            <div className="popup" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '20px', background: ' rgba(0, 0, 0, 0.5)', borderRadius: '5px', boxShadow: '0px 0px 20px 0px rgb(154, 154, 154)', background: ' #bbbbbb', zIndex: 2000, }}>
                                <p>There's no loan made on this date.</p>
                                <button
                                    onClick={() => {
                                        setShowNoLoanPopup(false); // Close the pop-up
                                        setFilter('all-date'); // Reset to "All Date"
                                        handleDateFilter(); // Automatically show all data
                                    }}
                                    style={{ backgroundColor: 'green', color: 'black', border: 'none', padding: '10px 20px', cursor: 'pointer', justifyContentContent: 'center' }} > Ok
                                </button>
                            </div>
                        )}
                        <div>
                            {filteredLoans.map(loan => (
                                <div key={loan.id}>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
                {!formVisible && (
                    <button onClick={() => setFormVisible(true)} style={{ backgroundColor: '#28a745', color: 'black', padding: '10px 20px', border: '0px', borderRadius: '5px', cursor: 'pointer', position: 'relative', marginLeft: '-5px', marginTop: '-55px', position: 'fixed' }} > <FaRegCreditCard style={{ marginRight: '5px', fontSize: '25px', marginBottom: '-5px' }}/> Add Loan </button>
                )}
            </div>
            
            {formVisible && (
                <form onSubmit={handleLoanSubmit} className="loan-form">
                    <h3 className="form-header">Create Loan</h3>
                    <div className="form-row">

                        <div className="form-group">
                            <label>Account</label>
                            <select
                                name="search_option"
                                value={searchOption}
                                onChange={(e) => setSearchOption(e.target.value)}
                                className="form-control"
                                style={{ border: "1px solid black" }}
                            >
                                <option value="accountNumber">Account Number</option>
                                <option value="accountHolder">Account Holder</option>
                            </select>
                        </div>

                        {/* Conditionally show input field based on selection */}
                        {searchOption === 'accountNumber' && (
                            <div className="form-group">
                                <label>Enter Account Number</label>
                                <input
                                    type="text"
                                    name="account_number"
                                    value={loanData.account}
                                    onChange={(e) => setLoanData({ ...loanData, account: e.target.value })}
                                    className="form-control"
                                    placeholder="Enter Account Number"
                                    style={{ border: "1px solid black" }}
                                />
                            </div>
                        )}

                        {searchOption === 'accountHolder' && (
                            <div className="form-group">
                                <label>Enter Account Holder's Name</label>
                                <input
                                    type="text"
                                    name="account_holder"
                                    value={loanData.account_holder}
                                    onChange={handleHolderChange}
                                    className="form-control"
                                    placeholder="Enter Account Holder's Name"
                                    style={{ border: "1px solid black" }}
                                />
                                {accountHolder.length > 0 && (
                                            <div className='maker-name-list'>
                                                {accountHolder.map((maker) => (
                                                    <button onClick={() => {
                                                        setLoanData({ ...loanData, account_holder: maker.name })
                                                        setAccountHolder([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                            </div>
                        )}
                        <div className="form-group">
                            <label>Loan Type</label>
                            <select
                                name="loan_type"
                                className="form-control"
                                value={loanData.loan_type}
                                onChange={(e) => setLoanData({ ...loanData, loan_type: e.target.value })}
                                style={{ border: "1px solid black" }}
                            >
                                <option value="Regular">Regular</option>
                                <option value="Emergency">Emergency</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Loan Amount</label>
                            <input
                                type="text"
                                name="loan_amount"
                                value={formatNumber(loanData.loan_amount)}
                                style={{ border: "1px solid black" }}
                                onChange={(e) => {
                                    const rawValue = e.target.value.replace(/,/g, "");
                                    if (!isNaN(rawValue)) {
                                        setLoanData({ ...loanData, loan_amount: rawValue });
                                    }
                                }}
                                onBlur={(e) => {
                                    const formattedValue = formatNumber(loanData.loan_amount);
                                    e.target.value = formattedValue;
                                }}
                                required
                                className="form-control"
                                placeholder="Loan Amount"
                            />
                        </div>

                        <div className="form-group">
                            <label>Loan Term</label>
                            <input
                                type="number"
                                name="loan_period"
                                value={loanData.loan_period}
                                onChange={(e) => setLoanData({ ...loanData, loan_period: e.target.value })}
                                required
                                className="form-control"
                                placeholder="Loan Term"
                                style={{ border: "1px solid black" }}
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Loan Term Unit:</label>
                            <select
                                name="loan_period_unit"
                                value={loanData.loan_period_unit}
                                onChange={(e) =>
                                    setLoanData({ ...loanData, loan_period_unit: e.target.value })
                                }
                                required
                                className="form-control"
                                style={{ border: "1px solid black" }}
                            >
                                <option value="months">Months</option>
                                <option value="years">Years</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Purpose:</label>
                            <select
                                name="purpose"
                                value={loanData.purpose}
                                onChange={(e) => {
                                    const selectedValue = e.target.value;
                                    setLoanData({ ...loanData, purpose: selectedValue });
                                    setShowOtherPurpose(selectedValue === "Others");
                                }}
                                className="form-control"
                                style={{ border: "1px solid black" }}
                            >
                                <option value="Education">Education</option>
                                <option value="Medical/Emergency">Medical/Emergency</option>
                                <option value="House Construction">House Construction</option>
                                <option value="Commodity/Appliances">Commodity/Appliances</option>
                                <option value="Utility Services">Utility Services</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>

                        {showOtherPurpose && (
                            <div className="form-group">
                                <label>Other Purpose:</label>
                                <input
                                    type="text"
                                    placeholder="Specify other Purpose"
                                    value={loanData.otherPurpose || ''}
                                    onChange={(e) =>
                                        setLoanData({ ...loanData, otherPurpose: e.target.value })
                                    }
                                    className="form-control"
                                    style={{ border: "1px solid black" }}
                                />
                            </div>
                        )}
                        {/* Check if loan amount is 1 million or below */}
                        {parseInt(loanData.loan_amount) <= 999999 && (
                            <>
                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 1</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker || ''}
                                            onChange={handleMakerOneSearch}
                                            className="form-control"
                                            style={{ border: "1px solid black" }}
                                        />
                                        {makerOneSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerOneSearch.map((maker) => (
                                                    <button onClick={() => {
                                                        setLoanData({ ...loanData, co_maker: maker.name })
                                                        setMakerOneSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 2</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker_2 || ''}
                                            onChange={handleMakerTwoSearch}
                                            className="form-control"
                                            style={{ border: "1px solid black" }}
                                        />
                                        {makerTwoSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerTwoSearch.map((maker) => (
                                                    <button onClick={() => {
                                                        setLoanData({ ...loanData, co_maker_2: maker.name })
                                                        setMakerTwoSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 3</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker_3 || ''}
                                            onChange={handleMakerThreeSearch}
                                            className="form-control"
                                            style={{ border: "1px solid black" }}
                                        />
                                        {makerThreeSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerThreeSearch.map((maker) => (
                                                    <button onClick={() => {
                                                        setLoanData({ ...loanData, co_maker_3: maker.name })
                                                        setMakerThreeSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Check if loan amount is 1 million or above */}
                        {parseInt(loanData.loan_amount) >= 1000000 && (
                            <>
                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 1</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker || ''}
                                            onChange={handleMakerOneSearch}
                                            className="form-control"
                                        />
                                         {makerOneSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerOneSearch.map((maker) => (
                                                    <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setLoanData({ ...loanData, co_maker: maker.name })
                                                        setMakerOneSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 2</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker_2 || ''}
                                            onChange={handleMakerTwoSearch}
                                            className="form-control"
                                        />
                                    </div>
                                    {makerTwoSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerTwoSearch.map((maker) => (
                                                    <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setLoanData({ ...loanData, co_maker_2: maker.name })
                                                        setMakerTwoSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                </div>
                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 3</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker_3 || ''}
                                            onChange={handleMakerThreeSearch}
                                            className="form-control"
                                        />
                                    </div>

                                    {makerThreeSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerThreeSearch.map((maker) => (
                                                    <button
                                                    type="button"
                                                     onClick={() => {
                                                        setLoanData({ ...loanData, co_maker_3: maker.name })
                                                        setMakerThreeSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                </div>
                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 4</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker_4 || ''}
                                            onChange={handleMakerFourSearch}
                                            className="form-control"
                                        />
                                    </div>

                                    {makerFourSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerFourSearch.map((maker) => (
                                                    <button
                                                    type="button"
                                                     onClick={() => {
                                                        setLoanData({ ...loanData, co_maker_4: maker.name })
                                                        setMakerFourSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                </div>
                                <div className="form-group d-flex justify-content-between">
                                    <div className="flex-fill mr-2">
                                        <label>Co Maker 5</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Co Maker"
                                            value={loanData.co_maker_5 || ''}
                                            onChange={handleMakerFiveSearch}
                                            className="form-control"
                                        />
                                    </div>

                                    {makerFiveSearch.length > 0 && (
                                            <div className='maker-name-list'>
                                                {makerFiveSearch.map((maker) => (
                                                    <button
                                                    type="button"

                                                    onClick={() => {
                                                        setLoanData({ ...loanData, co_maker_5: maker.name })
                                                        setMakerFiveSearch([])
                                                    }}
                                                        key={maker.name}>{maker.name}</button>
                                                ))}
                                            </div>
                                        )}
                                </div>  
                            </>
                        )}
                    </div>

                    {!loanSubmitted && (
                        <>
                            <button type="submit" className="form-submit">
                                {editingLoan ? 'Update Loan' : 'Create Loan'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setFormVisible(false);
                                }}
                                className="form-cancel"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </form>
            )}

            {/* Popup Modal */}
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
                        <button onClick={closePopup} className="close-btn">OK</button>
                    </div>
                </div>
            )}
            
            {!formVisible && !paymentFormVisible && (
                <div className="loan-table-wrapper">
                    <div className="loan-buttons-fixed">
                        <button onClick={() => setActiveLoanType('Regular')}>📌 Regular Loan</button>
                        <button onClick={() => setActiveLoanType('Emergency')}>⚠️ Emergency Loan</button>
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
                                {filteredLoans.filter(loan => loan.loan_type === activeLoanType).length > 0 ? (
                                    filteredLoans
                                        .filter(loan => loan.loan_type === activeLoanType)
                                        .map((loan) => (
                                            <tr key={loan.control_number}>
                                                <td>{loan.control_number}</td>
                                                <td>{loan.account || 'N/A'}</td>
                                                <td>{loan.account_holder || 'N/A'}</td>
                                                <td>{loan.loan_type}</td>
                                                <td>{formatNumber(loan.loan_amount)}</td>
                                                <td>{formatNumber(loan.service_fee)}</td>
                                                <td>{formatNumber(loan.interest_amount)}</td>
                                                <td>{formatNumber(loan.admincost)}</td>
                                                <td>{formatNumber(loan.notarial)}</td>
                                                <td>{formatNumber(loan.cisp)}</td>
                                                <td>{formatNumber(loan.takehomePay)}</td>
                                                <td>{loan.purpose}</td>
                                                <td style={{ 
                                                    color: loan.status.toLowerCase() === 'ongoing' ? 'red' : 
                                                            loan.status.toLowerCase() === 'paid-off' ? 'green' : 'black' 
                                                }}>
                                                    {loan.status}
                                                </td>
                                                <td>
                                                    <button onClick={() => {
                                                        setCoMakers([loan.co_maker, loan.co_maker_2, loan.co_maker_3, loan.co_maker_4, loan.co_maker_5]);
                                                        setMakersModal(true)
                                                    }}>
                                                        View
                                                    </button>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => archiveLoan(loan)}
                                                        disabled={loan.status.toLowerCase() !== 'paid-off'}
                                                        style={{
                                                            backgroundColor: loan.status.toLowerCase() === 'paid-off' ? '#FF9800' : '#ccc',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '5px 10px',
                                                            borderRadius: '3px',
                                                            cursor: loan.status.toLowerCase() === 'paid-off' ? 'pointer' : 'not-allowed',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        Archive
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan="15" style={{ textAlign: 'center' }}>
                                            No {activeLoanType} Loans found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {makersModal && (
                <div className='makers-modal'>
                    <div className='modal-content'>
                        <button onClick={() => setMakersModal(false)} className='close-btn'>X</button>
                        <div className='modal-header'>
                            <h2>Co-Makers</h2>
                        </div>
                        <div className='modal-body'>
                            {coMakers.filter(maker => maker && maker.trim() !== '').map((maker, index) => (
                                <div key={index} className='maker'>
                                    <p>{maker}</p>
                                </div>
                            ))}
                            {coMakers.filter(maker => maker && maker.trim() !== '').length === 0 && (
                                <p>No co-makers assigned to this loan.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
               
            {showPrintButton && newLoan && (
                <div className="buttons-container">
                    <button 
                        className="print-button" 
                        style={{ 
                            backgroundColor: "#4CAF50", 
                            color: "black", 
                            border: '0px', 
                            textAlign: "center", 
                            textDecoration: "none", 
                            display: "inline-block", 
                            fontSize: "16px", 
                            cursor: "pointer", 
                            borderRadius: "5px", 
                            marginLeft: '5px', 
                            marginTop: '5px',
                            padding: '10px 20px'
                        }} 
                        onClick={async () => { 
                            console.log(newLoan.account_holder); 
                            const printContent = ` 
                                <div style="border: 2px solid #000; padding: 20px; width: fit-content; margin: 0 auto;"> 
                                    <h1>Loan Details</h1> 
                                    <p><strong>Control Number:</strong> ${newLoan.control_number}</p> 
                                    <p><strong>Account:</strong> ${newLoan.account}</p> 
                                    <p><strong>Amount:</strong> ${newLoan.loan_amount}</p> 
                                    <p><strong>Type:</strong> ${newLoan.loan_type}</p> 
                                    <p><strong>Interest Rate:</strong> ${newLoan.interest_rate}</p> 
                                    <p><strong>Loan Period:</strong> ${newLoan.loan_period} ${newLoan.loan_period_unit}</p> 
                                    <p><strong>Loan Date:</strong> ${newLoan.loan_date}</p> 
                                    <p><strong>Due Date:</strong> ${newLoan.due_date}</p> 
                                    <p><strong>Status:</strong> ${newLoan.status}</p> 
                                    <p><strong>Service Fee:</strong> ${newLoan.service_fee}</p> 
                                    <p><strong>Take Home Pay:</strong> ${newLoan.takehomePay}</p> 
                                    <p><strong>Penalty Rate:</strong> ${newLoan.penalty_rate}</p> 
                                    <p><strong>Purpose:</strong> ${newLoan.purpose}</p> 
                                    <div style="text-align: center; margin-top: 70px;"> 
                                        <p style="width: 200px; border-bottom: 2px solid black; margin: 0 auto;"></p> 
                                        <p><strong>Member Signature</strong></p> 
                                    </div> 
                                    <div style="display: flex; justify-content: space-between; margin-top: 60px;"> 
                                        <div style="text-align: center; flex: 1;"> 
                                            <p style="width: 200px; border-bottom: 2px solid black; margin: 0 auto;"></p> 
                                            <p><strong>Signature Verified By</strong></p> 
                                        </div> 
                                        <div style="text-align: center; flex: 1;"> 
                                            <p style="width: 200px; border-bottom: 2px solid black; margin: 0 auto;"></p> 
                                            <p><strong>Approved By</strong></p> 
                                        </div> 
                                    </div> 
                                </div> 
                            `; 
                            const printWindow = window.open('', '_blank'); 
                            printWindow.document.write(` 
                                <html> 
                                    <head> 
                                        <title>Print Loan Details</title> 
                                        <style> 
                                            body { font-family: Arial, sans-serif; padding: 20px; } 
                                            h1 { color: black; } 
                                            p { font-size: 16px; } 
                                        </style> 
                                    </head> 
                                    <body> 
                                        ${printContent} 
                                    </body> 
                                </html> 
                            `); 
                            printWindow.document.close(); 
                            printWindow.onload = function () { 
                                printWindow.print(); 
                            }; 
                            resetForm(); 
                        }} 
                    > 
                        Print Loan Details 
                    </button>
                    <button 
                        className="cancel-button" 
                        style={{ 
                            backgroundColor: "#f44336", 
                            color: "black", 
                            border: '0px', 
                            textAlign: "center", 
                            textDecoration: "none", 
                            display: "inline-block", 
                            fontSize: "16px", 
                            cursor: "pointer", 
                            borderRadius: "5px", 
                            marginLeft: '10px',
                            marginTop: '5px',
                            padding: '10px 20px'
                        }} 
                        onClick={resetForm} 
                    > 
                        Cancel 
                    </button>
                </div>
            )}
        </div>
    );
};

export default LoanManager;