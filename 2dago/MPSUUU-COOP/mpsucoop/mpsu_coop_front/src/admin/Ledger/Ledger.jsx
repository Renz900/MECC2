import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Ledger = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Get account number from localStorage or elsewhere
  const accountNumber = localStorage.getItem('accountNumber'); // Adjust if you're saving account number elsewhere
  const userRole = localStorage.getItem('userRole'); // Save user role (admin or member)

  useEffect(() => {
    if (userRole === 'admin') {
      setIsAdmin(true); // Set user role to admin if logged in as an admin
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8000/api/account/${accountNumber}/transactions/`);
        setTransactions(response.data.transactions);
      } catch (err) {
        setError('Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    };

    if (accountNumber) {
      fetchTransactions();
    }
  }, [accountNumber, userRole]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>{isAdmin ? "All Transactions" : "Your Transactions"}</h1>
      <table>
        <thead>
          <tr>
            <th>Transaction Type</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Balance After Transaction</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.timestamp}>
              <td>{transaction.transaction_type}</td>
              <td>{transaction.amount}</td>
              <td>{transaction.description}</td>
              <td>{transaction.balance_after_transaction}</td>
              <td>{new Date(transaction.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Ledger;
