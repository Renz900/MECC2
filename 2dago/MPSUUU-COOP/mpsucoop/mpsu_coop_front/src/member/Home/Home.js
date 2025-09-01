import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../Topbar/Topbar';
import axios from 'axios';


const Home = () => {
  const [memberData, setMemberData] = useState(null);
  const [loanData, setLoanData] = useState([]);
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [payments, setPayments] = useState([]);
  const [controlNumberDetails, setControlNumberDetails] = useState([]);
  const [error, setError] = useState(null);
  const [cachedRemainingBalance, setCachedRemainingBalance] = useState(null);
  const [showCachedBalance, setShowCachedBalance] = useState(false);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);


  const SHARE_CAPITAL_LIMIT = 1000000; 
  const REGULAR_LOAN_LIMIT = 1500000; 

  // Added from Payments component
  const calculatePaidBalance = () => {
    if (!nearestLoan) return 0;
    
    return paymentSchedules
      .filter(schedule => schedule.loan_id === nearestLoan.id)
      .reduce((total, schedule) => {
        if (schedule.is_paid || schedule.status === 'Paid') {
          return total + parseFloat(schedule.payment_amount || 0);
        }
        return total;
      }, 0);
  };
//Decimal Points
    const formatNumberRounded = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    // Round the number first, then format without decimals
    return new Intl.NumberFormat('en-US').format(Math.round(number));
  };

  //Decimal points
  const formatRemainingBalance = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat('en-US').format(Math.round(number));
  };

  const calculateRemainingBalance = () => {
    if (!nearestLoan) return 0;

    const unpaidSchedules = paymentSchedules.filter(schedule => 
      schedule.loan_id === nearestLoan.id && !schedule.is_paid
    );
    
    const exactRemaining = unpaidSchedules.reduce((total, schedule) => {
      return total + parseFloat(schedule.payment_amount || 0);
    }, 0);

    return exactRemaining;
  };

const calculateRemainingBalanceFromLoanAmount = () => {
  if (!nearestLoan) return 0;
  const originalAmount = parseFloat(nearestLoan.loan_amount || 0);

  const paymentsForLoan = payments.filter(payment => 
    payment.loan_id === nearestLoan.id
  );
  
  const totalPaid = paymentsForLoan.reduce((acc, payment) => 
    acc + parseFloat(payment.payment_amount || 0), 0
  );

  const remaining = originalAmount - totalPaid;
  return Math.max(remaining, 0); // Ensure it doesn't go negative
};

const calculateRemainingBalanceForControlNumber = (controlNumber) => {
  if (!controlNumber) return 0;

  const loan = loansForMember.find(loan => loan.control_number === controlNumber);
  if (!loan) return 0;

  const unpaidSchedules = paymentSchedules.filter(schedule => 
    schedule.loan_id === loan.id && !schedule.is_paid
  );

  return unpaidSchedules.reduce((total, schedule) => {
    return total + parseFloat(schedule.payment_amount || 0);
  }, 0);
};

const fetchRemainingBalanceFromAPI = async (accountNumber, loanType) => {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(
      `http://127.0.0.1:8000/payment-schedules/?account_number=${accountNumber}&loan_type=${loanType}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const schedules = response.data;
    const remainingBalance = schedules
      .filter(schedule => !schedule.is_paid)
      .reduce((total, schedule) => {
        return total + parseFloat(schedule.payment_amount || 0);
      }, 0);

    return remainingBalance;
  } catch (error) {
    console.error('Error fetching remaining balance:', error);
    return 0;
  }
};

const getRemainingBalanceDisplay = () => {
  if (showCachedBalance && cachedRemainingBalance !== null) {
    return formatNumber(cachedRemainingBalance);
  }
  return formatNumber(calculateRemainingBalance());
};

  const formatNumber = (number) => {
    if (!number) return "0.00";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const acc_number = localStorage.getItem('account_number');

        if (!token || !acc_number) {
          setError("Missing token or account number. Please log in again.");
          return;
        }

        const memberResponse = await axios.get('http://localhost:8000/api/member/profile/', {
          params: { account_number: acc_number },
          headers: { Authorization: `Bearer ${token}` },
        });

        const accountNumber = memberResponse.data.accountN;

        const loanResponse = await axios.get(`http://localhost:8000/loans/?account_number=${accountNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const paymentScheduleResponse = await axios.get(`http://localhost:8000/payment-schedules/?account_number=${accountNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const paymentResponse = await axios.get(`http://localhost:8000/payments/?account_number=${accountNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMemberData(memberResponse.data);
        setLoanData(loanResponse.data);
        setPaymentSchedules(paymentScheduleResponse.data);
        setPayments(paymentResponse.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Error fetching data.");
      }
    };

    fetchAllData();
  }, []);

  const loanForMember = loanData.find(
    loan => loan.account_number === memberData?.accountN || loan.account === memberData?.accountN
  );

  const loansForMember = loanData.filter(
    loan => loan.account_number === memberData?.accountN || loan.account === memberData?.accountN
  );

  const controlNumbers = loansForMember.map(loan => loan.control_number).filter(Boolean);

  useEffect(() => {
    const fetchControlDetails = async () => {
      const token = localStorage.getItem('accessToken');

      try {
        const details = await Promise.all(
          controlNumbers.map(async (control_number) => {
            const response = await axios.get(`http://localhost:8000/api/loans/details?control_number=${control_number}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
          })
        );
        setControlNumberDetails(details);
      } catch (err) {
        console.error("❌ Error fetching control number details:", err);
      }
    };

    if (controlNumbers.length > 0) {
      fetchControlDetails();
    }
  }, [controlNumbers]);

  const nearestPaymentSchedule = paymentSchedules
    .filter(schedule => 
      !schedule.is_paid &&
    schedule.loan?.status !== 'Paid')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

  const nearestLoan = nearestPaymentSchedule
  ? loansForMember.find(loan => loan.id === nearestPaymentSchedule.loan_id)
  : null;


  const totalAmountPaid = payments
    .filter(payment => payment.loan_id === loanForMember?.id)
    .reduce((acc, payment) => acc + parseFloat(payment.payment_amount || 0), 0);

  const totalPaymentAmount = paymentSchedules
    .filter(schedule => schedule.loan_id === loanForMember?.id)
    .reduce((acc, schedule) => acc + parseFloat(schedule.payment_amount || 0), 0);

  const totalInterestDue = nearestPaymentSchedule && !isNaN(nearestPaymentSchedule.interest_due)
    ? parseFloat(nearestPaymentSchedule.interest_due).toFixed(2)
    : 'Interest Due: Data not available';

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
    setButtonClicked(true);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p>{error}</p>
          <a href="/" style={{ display: 'inline-block', backgroundColor: '#007bff', color: 'black', padding: '10px 20px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!memberData || !loanData || !paymentSchedules || !payments) return <p>Loading...</p>;

  return (
    <div>
      <Topbar />
      <div style={{ backgroundColor: '#f0f0f0', height: '100%', width: '100%', fontFamily: 'Arial, sans-serif', color: 'black' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '60px', marginTop: '100px', justifyContent: 'center' }}>
            <div
              style={{
                borderRadius: '10px',
                width: '600px',
                padding: '20px',
                height: '350px',
                boxShadow: '0px 4px 20px rgba(187, 186, 186, 0.99)',
                marginTop: '40px'
              }}
            >
              <h3
                style={{
                  fontWeight: 'bold',
                  color: 'green',
                  borderBottom: '2px solid rgb(133, 133, 132)',
                  paddingBottom: '10px',
                  textAlign: 'center',
                  fontSize: '30px',
                }}
              >
                {memberData.first_name?.toUpperCase()} {memberData.middle_name?.toUpperCase()} {memberData.last_name?.toUpperCase()}
              </h3>
              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '30px' }}>
                ACCOUNT NUMBER: <span style={{ fontSize: '28px', fontWeight: '900', color: 'green' }}>{memberData.accountN || 'N/A'}</span>
              </p>
              <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '30px' }}>
                SHARE CAPITAL: <span style={{ fontSize: '28px', fontWeight: '900', color: 'rgb(0, 60, 255)' }}>
                  ₱{formatNumber(Math.min(memberData.share_capital || 0, SHARE_CAPITAL_LIMIT))}
                </span>
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '50px' }}>
                <div
                  style={{
                    backgroundColor: 'rgb(7, 148, 208)',
                    borderRadius: '20px',
                    width: '45%',
                    textAlign: 'center',
                    padding: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '19px' }}>MAXIMUM OF REGULAR LOAN</p>
                  <p style={{ margin: 0, fontSize: '24px' }}>
                    ₱{formatNumber(Math.min((memberData.share_capital || 0) * 3, REGULAR_LOAN_LIMIT))}
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: 'red',
                    borderRadius: '20px',
                    width: '45%',
                    textAlign: 'center',
                    padding: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '18px' }}>MAXIMUM OF EMERGENCY LOAN</p>
                  <p style={{ margin: 0, fontSize: '24px' }}>{loanData.emergency_loan_amount || '₱ 50,000.00'}</p>
                </div>
              </div>
            </div>

            {/* Right Card */}
            <section style={{ flex: 1 }}>
              <div style={{ backgroundColor: '#f0f0f0', borderRadius: '8px', width: '600px', padding: '20px', boxShadow: '0px 4px 20px rgba(187, 186, 186, 0.99)', height: '105%', marginTop: '-40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '12px' }}>
                <div style={{ flex: 1, borderRadius: '8px', padding: '10px', boxShadow: '0px 2px 10px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontWeight: 'bold', color: 'green', borderBottom: '2px solid gray', paddingBottom: '10px', textAlign: 'center', fontSize: '30px', marginTop: '5px' }} > {memberData.first_name?.toUpperCase()} {memberData.middle_name?.toUpperCase()} {memberData.last_name?.toUpperCase()} </h3>
                  {nearestPaymentSchedule ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      <p style={{ marginBottom: '5px' }}> <strong>Loan Due Date:</strong>{' '} <span style={{ fontWeight: 'bold', color: 'black', fontSize: '20px' }}> {new Date(nearestPaymentSchedule.due_date).toLocaleDateString()} </span> </p>
                      <p style={{ marginTop: '0' }}> <strong>Control Number:</strong>{' '} <span style={{ fontWeight: 'bold', fontSize: '20px', color: 'blue', cursor: 'pointer', marginLeft: '5px', }} onClick={() => navigate(`/loans?control=${nearestLoan?.control_number}`)} > ({nearestLoan?.control_number || 'N/A'}) </span> </p>
                      <p style={{ marginTop: '0' }}><strong>Amount Due:</strong>{' '} <span style={{ fontWeight: 'bold',color: 'green', fontSize: '20px' }}> ₱{formatNumber(nearestPaymentSchedule.payment_amount)} </span> </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                        <p style={{ flex: 1, margin: 0 }}> <strong>Paid Amount:</strong> <span style={{ fontWeight: 'bold',color: 'green', fontSize: '20px' }}> ₱{formatNumberRounded(calculatePaidBalance().toFixed(2))} </span> </p>
                        <p style={{ flex: 1, margin: 0 }}> <strong>Remaining Balance:</strong> <span style={{ fontWeight: 'bold',color: 'green', fontSize: '20px' }}> ₱{formatRemainingBalance(calculateRemainingBalance().toFixed(2))} </span> </p>
                      </div>
                    </div>
                  ) : <p>No upcoming Loan Due.</p>}
                </div>
              </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          borderRadius: '8px',
                          height: '200px',
                          overflowY: 'auto',
                          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                          position: 'relative',
                          overflowY: "scroll",
                          scrollbarWidth: "none", // Firefox
                          msOverflowStyle: "none", // IE 10+
                          width: '300px'
                        }}
                      >
                        {/* Sticky Header Inside the Box */}
                        <div
                          style={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#f9f9f9',
                            padding: '10px 15px',
                            borderBottom: '1px solid #ccc',
                            zIndex: 1,
                          }}
                        >
                          <h3 style={{ fontSize: '20px', color: 'green', margin: 0 }}>REGULAR LOANS</h3>
                        </div>

                        {/* Scrollable content */}
                        <div style={{ padding: '5px 20px' }}>
                          {loansForMember.filter(loan => loan.loan_type === 'Regular').length > 0 ? (
                            loansForMember
                              .filter(loan => loan.loan_type === 'Regular')
                              .map((loan, index) => (
                                <div key={index} style={{ marginBottom: '5px' }}>
                                  <p
                                    style={{
                                      fontSize: '16px',
                                      color: 'blue',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => navigate(`/loans?control=${loan.control_number}`)}
                                  >
                                    <strong>Control #:</strong> {loan.control_number || 'N/A'}
                                  </p>
                                </div>
                              ))
                          ) : (
                            <p>No regular loans.</p>
                          )}
                      </div>
                    </div>
                  </div>

                    {/* RIGHT - EMERGENCY LOANS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '50px', marginTop: '1px' }}>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          borderRadius: '8px',
                          height: '200px',
                          overflowY: 'auto',
                          boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
                          position: 'relative',
                          overflowY: "scroll",
                          scrollbarWidth: "none", // Firefox
                          msOverflowStyle: "none", // IE 10+
                          width: '300px'
                        }}
                      >
                        {/* Sticky Header Inside the Box */}
                        <div
                          style={{
                            position: 'sticky',
                            top: 0,
                            backgroundColor: '#f9f9f9',
                            padding: '10px 15px',
                            borderBottom: '1px solid #ccc',
                            zIndex: 1,
                          }}
                        >
                          <h3 style={{ fontSize: '20px', color: 'green', margin: 0 }}>EMERGENCY LOANS</h3>
                    </div>
                    <div style={{ padding: '5px 20px' }}></div>
                      {loansForMember.filter(loan => loan.loan_type === 'Emergency').length > 0 ? (
                        loansForMember
                          .filter(loan => loan.loan_type === 'Emergency')
                          .map((loan, index) => (
                            <div key={index} style={{ marginBottom: '5px' }}>
                              <p
                                style={{
                                  fontSize: '16px',
                                  color: 'blue',
                                  cursor: 'pointer',
                                  padding: '15px',
                                  marginTop: '-10px'
                                  
                                }}
                                onClick={() => navigate(`/loans?control=${loan.control_number}`)}
                              >
                                <strong>Control #:</strong> {loan.control_number || 'N/A'}
                              </p>
                            
                            </div>
                          ))
                      ) : (
                        <p>No emergency loans.</p>
                      )}
                    </div>
                  </div>
                  </div>
                  </div>

                  {/* <p style={{ marginTop: '10px' }}><strong>Interest Rate:</strong> {loanData[0]?.interest_rate || '0'}%</p> */}
                  
                  <div style={{ textAlign: 'left', marginTop: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => handleNavigation('/accounts')}
                        style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'black', borderRadius: '5px', fontWeight: 'bold' }}
                      >
                        View Transactions
                      </button>
                      <button
                        onClick={() => handleNavigation('/loans')}
                        style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'black', borderRadius: '5px', fontWeight: 'bold' }}
                      >
                        View Loan
                      </button>
                    </div>
                  </div>
                {/* </div> */}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;