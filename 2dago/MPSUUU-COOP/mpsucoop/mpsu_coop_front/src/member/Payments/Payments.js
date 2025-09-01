import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

axios.defaults.withCredentials = false;

const MemberPayments = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [regularLoanAmount, setRegularLoanAmount] = useState(0);
  const [emergencyLoanAmount, setEmergencyLoanAmount] = useState(0);

  const formatNumber = (number) => {
    if (!number) return "0.00";
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // berts
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
  // berts

  const fetchPaymentSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const accountNumber = localStorage.getItem('account_number');

      if (!accountNumber) {
        setError('Account number is missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `http://127.0.0.1:8000/payment-schedules/?account_number=${accountNumber}`,
        { withCredentials: true }
      );

      const paidSchedules = response.data.filter(
        (schedule) => schedule.is_paid || schedule.status === 'Paid'
      );

      const schedulesWithDetails = paidSchedules.map((schedule, index) => ({
        ...schedule,
        payment_date: schedule.payment_date
          ? new Date(schedule.payment_date).toLocaleDateString()
          : 'N/A',
        or_number: schedule.or_number || generateOrNumber(schedule, index),
      }));

      setSchedules(schedulesWithDetails);

      const latestRegularLoan = paidSchedules
        .filter((schedule) => schedule.loan_type === 'Regular')
        .slice(-1)[0]?.loan_amount || 0;

      const latestEmergencyLoan = paidSchedules
        .filter((schedule) => schedule.loan_type === 'Emergency')
        .slice(-1)[0]?.loan_amount || 0;

      setRegularLoanAmount(latestRegularLoan);
      setEmergencyLoanAmount(latestEmergencyLoan);
    } catch (err) {
      console.error('Error fetching payment schedules:', err);
      setError('Failed to fetch payment schedules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentSchedules();
  }, []);

  const filteredRegular = schedules.filter(
    (schedule) =>
      schedule.loan_type === 'Regular' &&
      schedule.payment_date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmergency = schedules.filter(
    (schedule) =>
      schedule.loan_type === 'Emergency' &&
      schedule.payment_date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stickyThStyle = {
    position: 'sticky',
    top: 0,
    backgroundColor: 'gray',
    zIndex: 2,
    padding: '8px',
    border: '2px solid black'
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', minHeight: '100px', boxSizing: 'border-box' }}>
      <h2 style={{ textAlign: 'center', color: '#000000', fontSize: '24px', marginBottom: '50px', marginTop: '120px' }}>
        My Payments
      </h2>

      <div style={{ textAlign: 'left', marginBottom: '20px' }}>
        <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
          Regular Loan Amount: ₱ {formatNumber(parseFloat(regularLoanAmount).toFixed(2))}
        </p>
        <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
          Emergency Loan Amount: ₱ {formatNumber(parseFloat(emergencyLoanAmount).toFixed(2))}
        </p>
      </div>

      <div style={{ display: 'flex', marginBottom: '50px', marginTop: '-100px' }}>
        <input
          type="text"
          placeholder="Search by Due date"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '11px',
            borderRadius: '4px',
            width: '200px',
            marginLeft: '1310px',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
        {/* Regular Loan Table */}
        <div style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px', color: 'green' }}>Regular Loan</h3>
          {filteredRegular.length > 0 ? (
            <div
              style={{
                maxHeight: '380px',
                overflowY: 'scroll',
                border: '1px solid black',
                position: 'fixed  ',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                width: '49%',
              }}
              className="scroll-container"
            >
              <style>
                {`
                  .scroll-container::-webkit-scrollbar {
                    display: none;
                  }
                `}
              </style>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '2px solid black'}}>
                <thead>
                  <tr>
                    <th style={stickyThStyle}>Approval Date</th>
                    <th style={stickyThStyle}>Loan Type</th>
                    <th style={stickyThStyle}>Payment Amount</th>
                    <th style={stickyThStyle}>Status</th>
                    <th style={stickyThStyle}>Due Date</th>
                    <th style={stickyThStyle}>OR NO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegular.map((schedule, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.loan_date || 'No Date Available'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.loan_type || 'N/A'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        ₱ {formatNumber(parseFloat(schedule.payment_amount || 0).toFixed(2))}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black', color: 'green' }}>
                        {schedule.is_paid ? 'Paid' : 'Unpaid'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.payment_date
                          ? new Date(schedule.due_date).toLocaleDateString()
                          : 'No Date Available'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.or_number}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#000000', marginTop: '20px', border: '2px solid black' }}>
              No paid payments found.
            </p>
          )}
        </div>

        {/* Emergency Loan Table */}
        <div style={{ flex: 1 }}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px', color:'red' }}>Emergency Loan</h3>
          {filteredEmergency.length > 0 ? (
            <div
              style={{
                maxHeight: '380px',
                overflowY: 'scroll',
                border: '1px solid black',
                position: 'fixed  ',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                width: '49%',
              }}
              className="scroll-container"
            >
              <style>
                {`
                  .scroll-container::-webkit-scrollbar {
                    display: none;
                  }
                `}
              </style>

              <table style={{ width: '99%', borderCollapse: 'collapse', fontSize: '14px', border: '2px solid black' }}>
                <thead>
                  <tr>
                    <th style={stickyThStyle}>Approval Date</th>
                    <th style={stickyThStyle}>Loan Type</th>
                    <th style={stickyThStyle}>Payment Amount</th>
                    <th style={stickyThStyle}>Status</th>
                    <th style={stickyThStyle}>Due Date</th>
                    <th style={stickyThStyle}>OR NO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmergency.map((schedule, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.loan_date || 'No Date Available'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.loan_type || 'N/A'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        ₱ {formatNumber(parseFloat(schedule.payment_amount || 0).toFixed(2))}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black', color: 'green' }}>
                        {schedule.is_paid ? 'Paid' : 'Unpaid'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.payment_date
                          ? new Date(schedule.due_date).toLocaleDateString()
                          : 'No Date Available'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee', border: '2px solid black' }}>
                        {schedule.or_number}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#000000', marginTop: '20px' }}>
              No paid payments found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberPayments;
