import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IoArrowBackCircle } from "react-icons/io5";
import { FaSearch } from 'react-icons/fa';
import { BsFillPrinterFill } from "react-icons/bs";


axios.defaults.withCredentials = false;

const Payments = () => {
  const [accountSummaries, setAccountSummaries] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountDetails, setAccountDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');
  const [generatedOrNumbers, setGeneratedOrNumbers] = useState({});
  const [hideButtons, setHideButtons] = useState(false); //just now


  const formatNumber = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat('en-US').format(number);
  };

  const formatNumberRounded = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    // Round the number first, then format without decimals
    return new Intl.NumberFormat('en-US').format(Math.round(number));
  };

  //berts//
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
   //berts//
    
    const fetchAccountSummaries = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get('http://127.0.0.1:8000/payment-schedules/summaries/', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
  
        const summariesWithNames = await Promise.all(
          response.data.map(async (summary) => {
            const memberResponse = await axios.get(
              `http://127.0.0.1:8000/members/?account_number=${summary.account_number}`,
              { withCredentials: true }
            );
  
            const member = memberResponse.data[0];
            return {
              ...summary,
              account_holder: member ? `${member.first_name} ${member.middle_name} ${member.last_name}` : 'Unknown',
              total_balance: summary.total_balance || 0,
            };
          })
        );
  
        setAccountSummaries(summariesWithNames);
      } catch (err) {
        console.error('Error fetching account summaries:', err);
        setError('Failed to fetch account summaries.');
      } finally {
        setLoading(false);
      }
    };
  
    const fetchPaymentSchedules = async (accountNumber) => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/payment-schedules/?account_number=${accountNumber}`,
          { withCredentials: true }
        );
     
        console.log(response.data);  // Log the full response
     
        // Filter out schedules that are paid
        const paidSchedules = response.data.filter(schedule => schedule.is_paid || schedule.status === 'Paid');
     
        // berts
        const schedulesWithOrNumbers = await Promise.all(
          paidSchedules.map(async (schedule) => {
            const orNumber = generateOrNumber(schedule);

            if (!schedule.OR) {
              try {
                await axios.put(`http://127.0.0.1:8000/payment-schedules/${schedule.id}/`, {
                  OR: orNumber,
                }, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                  },
                });
              } catch (error) {
                console.error('Error saving OR:', error);
              }
            }

            return {
              ...schedule,
              or_number: orNumber,
            };
          })
        );
        // berts

        setSchedules(schedulesWithOrNumbers);
        setSelectedAccount(accountNumber);
     
        const memberResponse = await axios.get(
          `http://127.0.0.1:8000/members/?account_number=${accountNumber}`,
          { withCredentials: true }
        );
        setAccountDetails(memberResponse.data[0]);
      } catch (err) {
        console.error('Error fetching schedules or account details:', err);
        setError('Failed to fetch payment schedules or account details.');
      } finally {
        setLoading(false);
      }
    };

    const calculatePaidBalance = () => {
      const balance = filterSchedulesByLoanType()
        .reduce((total, schedule) => {
          if (schedule.is_paid || schedule.status === 'Paid') {
            return total + parseFloat(schedule.payment_amount || 0);
          }
          return total;
        }, 0);
      
      return Math.round(balance);
    };
  
    const filterSchedulesByLoanType = () => {
      if (loanTypeFilter === 'All') {
        return schedules;
      }
  
      return schedules.filter(schedule => schedule.loan_type === loanTypeFilter);
    };
  
    const filteredSummaries = accountSummaries.filter((summary) => {
      return (
        summary.account_number.toString().includes(searchQuery) ||
        summary.account_holder.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  
    const handleLoanTypeChange = (type) => {
      setLoanTypeFilter(type);
    };
  
    const handlePrint = () => {

      setHideButtons(true); //just now

      const printWindow = window.open('', '', 'width=800, height=600');
      const content = document.getElementById('print-section').innerHTML;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    };
  
    const handlePaymentSubmit = async (scheduleId, paymentAmount) => {
      // Add logic to save payment and assign an OR number
      const orNumber = generateOrNumber(scheduleId);
  
      // Add logic to update the payment schedule or call the API to save this payment with OR number
      try {
        await axios.post('http://127.0.0.1:8000/payment-schedules/payment/', {
          schedule_id: scheduleId,
          payment_amount: paymentAmount,
          or_number: orNumber,
          // Add any other necessary fields here
        });
        alert(`Payment submitted with OR number: ${orNumber}`);
      } catch (error) {
        console.error('Error submitting payment:', error);
      }
    };
    
    useEffect(() => {
      fetchAccountSummaries();
    }, []);
  
    if (loading) return <p>Loading...</p>;
    if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ marginTop: '20px' }} className="payments-container">
      {!selectedAccount ? (
        <>
          <h2 style={{ width: '98%', marginTop: '-25px',  padding: '20px', textAlign: 'center', color: 'black', fontSize: '30px'}}>Paid Payments Overview</h2>
            <d style={{ position: 'relative', display: 'inline-block', width: '30%' }}>
              <input type="text"placeholder="Search Payments"value={searchQuery}onChange={(e) => setSearchQuery(e.target.value)}style={{padding: '7px 40px 10px 10px',fontSize: '16px',border: '0px',borderRadius: '4px',width: '250px',marginLeft: '950px',marginBottom: '30px',marginTop: '-10px',}}/></d>
          {filteredSummaries.length > 0 ? (
            <div
              style={{ maxHeight: '430px', overflowY: 'auto', boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)', marginTop: '10px', padding: '5px', borderRadius: '5px', scrollbarWidth: 'none', msOverflowStyle: 'none', width: '103.5%', marginLeft: '-30px',fontSize: '16px'}}>
              <table className="account-summary-table"style={{borderCollapse: 'collapse',width: '100%',}}>
                <thead>
                  <tr style={{borderBottom: '1px solid black',position: 'sticky',top: '-5px',backgroundColor: 'black',zIndex: 1,fontSize: '16px'}}>
                    <th>Account Number</th>
                    <th>Account Holder</th>
                    <th>Next Due Date</th>
                    {/* <th>Balance</th> */}
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaries.map((summary, index) => (
                    <tr
                      key={`${summary.account_number}-${index}`}
                      onClick={() => fetchPaymentSchedules(summary.account_number)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: 'blue' }}>{summary.account_number || 'N/A'}</td>
                      <td>{summary.account_holder}</td>
                      <td>{summary.next_due_date ? new Date(summary.next_due_date).toLocaleDateString() : 'No Due Date'}</td>
                      {/* <td>₱ {formatNumber(summary.total_balance?.toFixed(2))}</td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No ongoing schedules found.</p>
          )}
        </>
      ) : (
        <>
          <div id="print-section">
            {accountDetails && (
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <h3 style={{ color: 'black', fontSize: '20px', marginTop: '-50px'}}>Payment History For:</h3>
              <table style={{borderCollapse: 'collapse', marginTop: '10px' }}>
              <tbody>
              <tr>
                <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)'}}>Name:</td>
                <td style={{ padding: '5px', border: '0px', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)', verticalAlign: 'bottom', width: 'fit-content', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{accountDetails.first_name}</span>
                  <span style={{ paddingLeft: '5px' }}>{accountDetails.middle_name}</span>
                  <span style={{ paddingLeft: '5px' }}>{accountDetails.last_name}</span>
                </td>
              </tr>
                <tr>
                  <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)' }}>Account Number:</td>
                  <td style={{ padding: '5px', border: '0px', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)' }}>
                    {selectedAccount}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)' }}>Paid Amount:</td>
                  <td style={{ padding: '5px', border: '0px', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid rgba(218, 218, 218, 0.68)', width: '100px'}}>
                  ₱{formatNumberRounded(calculatePaidBalance())}
                  </td>
                </tr>

                {/* Regular Loan Details */}
                {filterSchedulesByLoanType().some(schedule => schedule.loan_type === 'Regular') && (
                  <tr>
                    <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)' }}>Regular Loan - Approval Date:</td>
                    <td style={{ padding: '5px', border: '0px', fontWeight: 'bold',fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)' }}>
                      {new Date(
                        filterSchedulesByLoanType().find(schedule => schedule.loan_type === 'Regular')?.loan_date
                      ).toLocaleDateString() || 'No Date Available'}
                    </td>
                    <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solidrgba(218, 218, 218, 0.68)'}}>Amount:</td>
                    <td style={{ padding: '5px', border: '0px', fontSize: '16px', fontWeight: 'bold' , borderBottom: '1px solid rgba(218, 218, 218, 0.68)' }}>
                      ₱{formatNumberRounded(parseFloat(
                        filterSchedulesByLoanType().find(schedule => schedule.loan_type === 'Regular')?.loan_amount || 0
                      ))}
                    </td>
                  </tr>
                )}

                {/* Emergency Loan Details */}
                {filterSchedulesByLoanType().some(schedule => schedule.loan_type === 'Emergency') && (
                  <tr>
                    <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px', borderBottom: '1px solid rgba(218, 218, 218, 0.68)'}}>Emergency Loan - Approval Date:</td>
                    <td style={{ padding: '5px', border: '0px', fontWeight: 'bold',fontSize: '16px' , borderBottom: '1px solid rgba(218, 218, 218, 0.68)'}}>
                      {new Date(
                        filterSchedulesByLoanType().find(schedule => schedule.loan_type === 'Emergency')?.loan_date
                      ).toLocaleDateString() || 'No Date Available'}
                    </td>
                    <td style={{ padding: '5px', border: '0px', fontWeight: 'bold', fontSize: '16px' , borderBottom: '1px solid rgba(218, 218, 218, 0.68)'}}>Amount:</td>
                    <td style={{ padding: '5px', border: '0px', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid rgba(218, 218, 218, 0.68)'}}>
                      ₱{formatNumberRounded(parseFloat(
                        filterSchedulesByLoanType().find(schedule => schedule.loan_type === 'Emergency')?.loan_amount || 0
                      ))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
            )}
          {!hideButtons && (
            <div
            className = "button"
            style = {{ display: 'inline-flex', marginTop: '20px' }} > <div >
              {/* just now */}
              <button onClick={() => setSelectedAccount(null)} className="no-print" ><IoArrowBackCircle /> Back </button>
              <button 
              onClick={() => handleLoanTypeChange('All')} 
              className="no-print"  //just now
              style={{ backgroundColor: 'transparent', color: loanTypeFilter === 'All' ? 'rgb(4, 202, 93)' : 'black', cursor: 'pointer', border: 'none', padding: '5px 10px', textDecoration: loanTypeFilter === 'All' ? 'underline' : 'none', marginLeft: '50px' }}
            >
              All Loans
            </button>
            <button 
              onClick={() => handleLoanTypeChange('Regular')} 
              className="no-print"  //just now
              style={{ backgroundColor: 'transparent', color: loanTypeFilter === 'Regular' ? 'rgb(4, 202, 93)' : 'black', cursor: 'pointer', border: 'none', padding: '5px 10px', textDecoration: loanTypeFilter === 'Regular' ? 'underline' : 'none' }}
            >
              Regular Loans
            </button>
            <button 
              onClick={() => handleLoanTypeChange('Emergency')} 
              className="no-print"  //just now
              style={{ backgroundColor: 'transparent', color: loanTypeFilter === 'Emergency' ? 'rgb(4, 202, 93)' : 'black', cursor: 'pointer', border: 'none', padding: '5px 10px', textDecoration: loanTypeFilter === 'Emergency' ? 'underline' : 'none' }}
            >
              Emergency Loans
            </button>
              <button 
              onClick={handlePrint} 
              className="print-button no-print"  //just now
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontSize: '24px', cursor: 'pointer', backgroundColor: '#ede9c7', border: 'none', position: 'fixed', marginLeft: '1200px', marginTop: '-30px', zIndex: '1000', }}
              >  
              {/* className="print-button" */}
              {/* just now */}
              <span style={{ marginRight: '8px' }}><BsFillPrinterFill /></span>
            </button>
            <style> {` @media print { .print-button, .no-print { display: none !important; } } `} </style>
            </div>
            </div>
          )}
            {filterSchedulesByLoanType().length > 0 ? (
              <div
              style={{ maxHeight: '330px', overflowY: 'auto', boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)', marginTop: '30px', padding: '5px', borderRadius: '5px', scrollbarWidth: 'none', msOverflowStyle: 'none', width: '1250px', }}>
              <style> {` div::-webkit-scrollbar { display: none; } @media print { button { display: none; } } `} </style>
              <table
                className="payment-schedule-table"
                style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '16px', }}>
                <thead>
                  <tr
                    style={{ backgroundColor: 'red', color: 'black', position: 'sticky', top: '-5px', zIndex: '1', }}>
                      <th>Loan Type</th>
                      <th>Paid Amount</th>
                      <th>Date Paid</th>
                      {/* <th>Status</th> */}
                      <th>OR Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterSchedulesByLoanType().map((schedule, index) => (
                      <tr key={`${schedule.id}-${index}`}>
                        <td>{schedule.loan_type || 'N/A'}</td>
                        <td>₱ {formatNumber(parseFloat(schedule.payment_amount).toFixed(2))}</td>
                        <td>{new Date(schedule.due_date).toLocaleDateString()}</td>
                        {/* <td style={{ color: schedule.is_paid ? 'green' : 'red' }}>{schedule.is_paid ? 'Paid!' : 'Ongoing'}</td> */}
                        <td>{schedule.or_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No payments found for the selected loan type.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Payments;

