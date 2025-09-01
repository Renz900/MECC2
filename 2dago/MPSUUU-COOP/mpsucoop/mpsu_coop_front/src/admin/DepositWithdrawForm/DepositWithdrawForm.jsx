import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ErrorModal Component
const ErrorModal = ({ message, onClose }) => {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.message}>{message}</div>
        <button style={modalStyles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    boxShadow: '0px 0px 20px 0px rgb(154, 154, 154)',
    backgroundColor: '#bbbbbb',
    color: 'black',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    width: '280px',
  },
  message: {
    marginBottom: '15px',
    fontSize: '22px',
    color: 'black',
  },
  closeButton: {
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: 'black',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

function DepositWithdrawForm({ account, actionType, onClose, fetchAccounts, setError }) {
  const [amount, setAmount] = useState('');
  const [formattedShareCapital, setFormattedShareCapital] = useState('');
  const [isInactive, setIsInactive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null); // New state for error modal

  const formatAmount = (value) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  useEffect(() => {
    setFormattedShareCapital(formatAmount(account.shareCapital || 0));
    setIsInactive(account.status === 'Inactive');
  }, [account]);

  const handleChange = (e) => {
    const formattedAmount = e.target.value
      .replace(/\D/g, '')
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    setAmount(formattedAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (isInactive) {
      setErrorMessage('Account is inactive. Cannot perform transactions.');
      return;
    }
  
    let numericAmount = parseFloat(amount.replace(/,/g, ''));
    const currentShareCapital = parseFloat(account.shareCapital);

    if (actionType === 'deposit') {
      if (isNaN(numericAmount) || numericAmount <= 0) {
        setErrorMessage('Invalid amount for deposit.');
        return;
      }

    if (currentShareCapital + numericAmount > 1000000) {
      setErrorMessage(`Deposit failed: Total balance cannot exceed ₱1,000,000. Current balance is ₱${currentShareCapital.toLocaleString()}`);
      return;
    }

      if (numericAmount < 1 || numericAmount > 950000) {
        setErrorMessage('Deposit must be between 1 and 950,000 only!');
        return;
      }
    }

    if (actionType === 'withdraw') {
      numericAmount = account.shareCapital;
      if (numericAmount <= 0) {
        setErrorMessage('Insufficient funds to withdraw.');
        return;
      }
    }
  
    try {
      const endpoint =
        actionType === 'deposit'
          ? `http://localhost:8000/accounts/${account.account_number}/deposit/`
          : `http://localhost:8000/accounts/${account.account_number}/withdraw/`;
  
      const response = await axios.post(
        endpoint,
        { amount: numericAmount.toString() },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
  
      console.log("Response:", response);
  
      if (actionType === 'withdraw') {
        const remainingShareCapital = account.shareCapital - numericAmount;
  
        if (remainingShareCapital <= 0) {
          await axios.patch(`http://localhost:8000/accounts/${account.account_number}/`, {
            status: 'inactive',
          });
          setIsInactive(true);
        }
      }
  
      fetchAccounts();
      onClose();
    } catch (err) {
      if (err.response) {
        console.error("Error response data:", err.response.data);
        setErrorMessage(err.response?.data?.error || 'An error occurred while processing your request.');
      } else {
        setErrorMessage('An error occurred while processing your request.');
      }
    }
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
    border: '0px',
    borderRadius: '8px',
    fontSize: '20px',
  };

  const buttonStyle = {
    padding: '10px',
    margin: '10px 5px',
    backgroundColor: '#007BFF',
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    flex: '1',
  };

  const cancelButtonStyle = {
    backgroundColor: 'rgb(240, 50, 50)',
  };

  const headerStyle = {
    color: 'black',
    textAlign: 'center',
    marginBottom: '30px',
    marginTop: '30px',
  };

  const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '10px',
  };

  return (
    <div>
      <h2 style={headerStyle}>
        {actionType === 'deposit' ? 'Deposit' : 'Withdraw'} Funds
      </h2>
      <div style={{ marginBottom: '20px', textAlign: 'center', color: 'black' }}>
        <h3>Share Capital</h3>
        <p style={{ fontSize: '20px', fontWeight: 'bold' }}>
          {formattedShareCapital}
        </p>
      </div>
      {isInactive ? (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <h3>Thank You!</h3>
          <p>Your account is inactive. No further actions are available.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={formStyle}>
          {actionType === 'deposit' && ( // Input box only for Deposit
            <label>
              Amount:
              <input
                type="text"
                value={amount}
                onChange={handleChange}
                required
                style={{
                  padding: '10px',
                  margin: '10px 0',
                  border: '0px',
                  borderRadius: '4px',
                  fontSize: '16px',
                }}
              />
            </label>
          )}
          <div style={buttonContainerStyle}>
            <button type="submit" style={buttonStyle}>
              {actionType === 'deposit' ? 'Deposit' : 'Withdrawal'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ ...buttonStyle, ...cancelButtonStyle }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {errorMessage && (
        <ErrorModal message={errorMessage} onClose={() => setErrorMessage(null)} />
      )}
    </div>
  );
}

export default DepositWithdrawForm;
