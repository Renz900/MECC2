import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Ledger = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const accountNumber = localStorage.getItem('accountN');
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    setIsAdmin(userRole === 'admin');

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!accountNumber || !token) {
          setError('Account number or token is missing. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:8000/api/account/${accountNumber}/transactions/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setTransactions(response.data.transactions || []);
      } catch (err) {
        setError('Failed to fetch transactions. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [accountNumber, userRole]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '20px' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>{error}</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        {isAdmin ? 'All Transactions' : 'Your Transactions'}
      </h1>
      <table
        border="1"
        cellPadding="5"
        cellSpacing="0"
        style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
      >
        <caption style={{ captionSide: 'top', fontWeight: 'bold', marginBottom: '10px' }}>
          {isAdmin
            ? 'Overview of all account transactions'
            : 'A detailed view of your account transactions'}
        </caption>
        <thead style={{ backgroundColor: '#f4f4f4' }}>
          <tr>
            <th>Transaction Type</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Balance After Transaction</th>
            <th>TimestampSSS</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr key={index}>
              <td>{transaction.transaction_type}</td>
              <td>{formatCurrency(transaction.amount)}</td>
              <td>{transaction.description}</td>
              <td>{formatCurrency(transaction.balance_after_transaction)}</td>
              <td>{new Date(transaction.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Ledger;
