import React from 'react';
import { useState } from 'react';
import axios from 'axios';

const usePaymentForm = (setSchedules) => {
  const [advancePayment, setAdvancePayment] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isPaymentInProgress, setIsPaymentInProgress] = useState(false);
  // const [receivedAmount, setReceivedAmount] = useState(null);
  const [paymentOption, setPaymentOption] = useState('advance_payment'); // default to option 1
  const [isOverpaying, setIsOverpaying] = useState(false);



  const handlePayClick = (schedule) => {
    setSelectedSchedule(schedule);
    setPaymentAmount(schedule.payment_amount);
    setAdvancePayment(''); // Set the payment amount for the selected schedule
    setIsPaymentModalOpen(true); // Open the modal
    setPaymentOption('advance_payment');

  };


  const handleExactAmount = () => {
  if (!selectedSchedule) {
    alert('No schedule selected.');
    return;
  }

  if (selectedSchedule.is_paid) {
    alert('This schedule is already paid.');
    return;
  }

  const amount = parseFloat(paymentAmount);
  // setReceivedAmount(amount);
  console.log('Received Amount set to:', amount);
  markAsPaid(selectedSchedule.id, amount);
  setIsPaymentModalOpen(false);
};

const handlePaymentSubmit = async () => {
  if (!selectedSchedule) {
    alert("No schedule selected.");
    return;
  }

  const enteredAmount = parseFloat(advancePayment);
  if (isNaN(enteredAmount) || enteredAmount <= 0) {
    alert('Please enter a valid payment amount.');
    return;
  }

  try {
    const res = await axios.post(`http://127.0.0.1:8000/payment-schedule/${selectedSchedule.id}/process-payment/`, {
      schedule_id: selectedSchedule.id,
      // payment_amount: enteredAmount,
      received_amnt: enteredAmount,
      payment_option: paymentOption,
    });

    alert(res.data.message || 'Payment processed successfully.');

    setIsPaymentModalOpen(false);
    setAdvancePayment('');
    setPaymentAmount('');
    setSelectedSchedule(null);

    if (typeof setSchedules === 'function') {
      const updated = await fetchUpdatedSchedules();
      setSchedules(updated);
    }

  } catch (err) {
    console.error('Error processing payment:', err.response?.data || err.message);
    alert(err.response?.data?.error || 'An error occurred while processing the payment.');
  }
};



const fetchUpdatedSchedules = async () => {
  try {
    // const loanId = selectedSchedule.loan;
    const loanId = selectedSchedule.loan?.id || selectedSchedule.loan;

    const res = await axios.get(`http://127.0.0.1:8000/api/schedules/${loanId}`);
    return res.data;
  } catch (err) {
    console.error("Failed to fetch updated schedules:", err);
    return [];
  }
};



  // Mark payment as paid
  const markAsPaid = async (id, totalPayment) => {
    setIsPaymentInProgress(true);
    console.log(`Marking schedule ID ${id} as paid with total payment: ₱${totalPayment.toFixed(2)}`);
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/payment-schedules/${id}/mark-paid/`,
        { received_amnt: totalPayment },  // Ensure you're passing the correct total payment
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const updatedSchedule = response.data; // Expecting JSON with updated values
      console.log('Updated schedule from backend:', updatedSchedule);
      // Update the status to 'Paid' for the current schedule
      setSchedules((prevSchedules) =>
        prevSchedules.map((s) =>
          s.id === id ? { ...s, ...updatedSchedule } : s
        )
      );
    } catch (err) {
      console.error('Error while marking as paid:', err.response ? err.response.data : err.message);
    } finally {
      setIsPaymentInProgress(false);
    }
  };

  const openPaymentModal = () => {
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentAmount('');
  };

  const submitPayment = (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    console.log(`Payment of ₱${amount} submitted for schedule.`);
    closePaymentModal();
  };

  return {
    advancePayment,
    setAdvancePayment,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentAmount,
    setPaymentAmount,
    paymentOption,
    setPaymentOption,
    selectedSchedule,
    setSelectedSchedule,
    isPaymentInProgress,
    setIsPaymentInProgress,
    // receivedAmount,
    // setReceivedAmount,
    isOverpaying,                 // <-- ADD THIS
    setIsOverpaying,  
    handlePayClick,
    handleExactAmount,
    handlePaymentSubmit,
    openPaymentModal,
    closePaymentModal,
    submitPayment,
  };
};


const PaymentModal = ({
  selectedSchedule,
  paymentAmount,
  // receivedAmount,
  advancePayment,
  paymentOption,           
  setPaymentOption, 
  isOverpaying,                 
  setIsOverpaying,  
  isPaymentModalOpen,
  handleExactAmount,
  handlePaymentSubmit,
  setAdvancePayment,
  closePaymentModal,
}) => {
  return (
    isPaymentModalOpen && selectedSchedule && (
      <div style={{ position: 'fixed', top: '350px', left: '1000px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ backgroundColor: 'gray', padding: '5px', borderRadius: '5px', width: '300px', textAlign: 'center' }}>
          <h3>Amount Payable</h3>
          <p>Payment Amount: ₱ {parseFloat(paymentAmount).toFixed(2)}</p>
          {selectedSchedule.is_paid && (
            <p>Received Amount: ₱ {parseFloat(selectedSchedule.received_amnt || 0).toFixed(2)}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button
              style={{
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
              }}
              onClick={handleExactAmount}
            >
              Exact Amount
            </button>
            <div style={{ marginTop: '-5px' }}>
              <label htmlFor="advancePayment" style={{ display: 'block' }}></label>
              <input
                id="advancePayment"
                type="number"
                placeholder="Enter Payment Amount"
                value={advancePayment}
                onChange={(e) => {
                  const value = e.target.value;
                  setAdvancePayment(value);

                  const entered = parseFloat(value);
                  // const required = parseFloat(paymentAmount);

                  // Set overpaying flag
                  if (!isNaN(entered) && entered > parseFloat(paymentAmount)) {
                    setIsOverpaying(true);
                  } else {
                    setIsOverpaying(false);
                  }
                }}

              />
              {isOverpaying && (
                <div>
                  <label><strong>Choose Overpayment Option:</strong></label>
                  <div style={{ textAlign: 'left', marginTop: '5px' }}>
                    <label>
                      <input
                        type="radio"
                        name="paymentOption"
                        value="advance_payment"
                        checked={paymentOption === 'advance_payment'}
                        onChange={(e) => setPaymentOption(e.target.value)}
                      />
                      Advance Payment (cover future dues)
                    </label>
                    <br />
                    <label>
                      <input
                        type="radio"
                        name="paymentOption"
                        value="shorten_term"
                        checked={paymentOption === 'shorten_term'}
                        onChange={(e) => setPaymentOption(e.target.value)}
                      />
                      Shorten Loan Term (reduce duration)
                    </label>
                  </div>
                </div>
              )}

              <button onClick={handlePaymentSubmit}
              disabled={isNaN(parseFloat(advancePayment))|| parseFloat(advancePayment)  <= 0}
              >Submit Payment</button>
              <button
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
                onClick={closePaymentModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default PaymentModal;
export { usePaymentForm };


