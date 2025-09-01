import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Topbar from '../Topbar/Topbar';
import Payment from '../Payments/Payments';
import './Account.css';

const Ledger = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [allTransactions, setAllTransactions] = useState([]); // Combined transactions including initial deposit

  const formatNumber = (number) => {
    if (!number) return '0.00';
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const accountNumber = localStorage.getItem('account_number');
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    setIsAdmin(userRole === 'admin');

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!accountNumber || !token) {
          setError('Account number or token missing.');
          setLoading(false);
          return;
        }

        // Fetch transactions
        const response = await axios.get(
          `http://localhost:8000/api/account/${accountNumber}/transactions/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        let transactionsData = response.data.transactions;
        let combinedTransactions = [...transactionsData];

        // Check if initial deposit transaction exists
        const hasInitialDepositTransaction = transactionsData.some(
          (transaction) => transaction.transaction_type === 'in_dep'
        );

        // If no initial deposit transaction found, try to get it from member data
        if (!hasInitialDepositTransaction) {
          try {
            const memberResponse = await axios.get(
              `http://localhost:8000/members/?accountN=${accountNumber}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const member = memberResponse.data.find(m => m.accountN == accountNumber);
            if (member && member.in_dep && member.in_dep > 0) {
              // Create initial deposit transaction object
              const initialDepositTransaction = {
                transaction_type: 'Initial Deposit',
                amount: member.in_dep,
                description: 'Initial Deposit',
                balance_after_transaction: member.in_dep, // Assuming this is the starting balance
                timestamp: member.created_at || new Date().toISOString() // Use member creation date or current date
              };

              // Add initial deposit as the first transaction
              combinedTransactions = [initialDepositTransaction, ...transactionsData];
            }
          } catch (memberError) {
            console.log('Could not fetch member data:', memberError);
          }
        }

        setTransactions(transactionsData);
        setAllTransactions(combinedTransactions);
      } catch (err) {
        setError('Failed to fetch transactions. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [accountNumber, userRole]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className="ledger-container">
      <div className="ledger-left">
        <Topbar />

        {!showPayments && (
          <>
            <h1>{isAdmin ? 'ALL TRANSACTIONS' : 'MY TRANSACTIONS'}</h1>
            <button
              onClick={() => window.history.back()}
              style={{
                fontSize: '16px',
                backgroundColor: '#37ff7d',
                color: 'rgb(0, 0, 0)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                marginBottom: '15px',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#ff00e1')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#37ff7d')}
            >
              Back
            </button>
          </>
        )}

        <button
          onClick={() => setShowPayments(!showPayments)}
          className="toggle-button"
          style={showPayments ? { marginTop: '50px' } : {}}
        >
          {showPayments ? 'Show Transactions' : 'View Payments'}
        </button>

        {!showPayments && (
          <>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Transaction Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Balance</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((transaction, index) => (
                  <tr 
                    key={index}
                    style={
                      transaction.transaction_type === 'Initial Deposit' 
                        ? { backgroundColor: '#e8f5e8', fontWeight: 'bold' } 
                        : {}
                    }
                  >
                    <td>{transaction.transaction_type}</td>
                    <td>₱{formatNumber(transaction.amount)}</td>
                    <td>{transaction.description}</td>
                    <td>₱{formatNumber(transaction.balance_after_transaction)}</td>
                    <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {allTransactions.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {showPayments && (
        <div className="ledger-right">
          <Payment />
        </div>
      )}
      
    </div>
  );
};

export default Ledger;