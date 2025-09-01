import React, { useEffect, useState } from "react";
import "./LoanSummary.css";

const LoanSummary = () => {
  const [loanSummary, setLoanSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLoanSummary = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/loan-summary/");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setLoanSummary(data);
      } catch (err) {
        console.error("Error fetching loan summary data:", err);
        setError(err.message);
      }
    };

    fetchLoanSummary();
  }, []);

  if (error) {
    return <div className="loan-summary-error">Error: {error}</div>;
  }

  if (!loanSummary) {
    return <div className="loan-summary-loading">Loading...</div>;
  }

  return (
    <div className="loan-summary-container">
      <div className="loan-card">
        <h3 className="loan-type">BORROWERS</h3>
        <p className="loan-amount">
          {loanSummary.borrowers.active + loanSummary.borrowers.paidOff}
        </p>
        <div className="loan-details">
          <span className="loan-label">Active: {loanSummary.borrowers.active}</span>
          {/* <span className="loan-label">Completed: {loanSummary.borrowers.paidOff}</span> */}
        </div>
      </div>

      <div className="loan-card">
        <h3 className="loan-type">NET TOTAL LOAN AMOUNT</h3>
        <p className="loan-amount">
          {loanSummary.netTotalLoan.returned}
        </p>
        {/* <div className="loan-details">
          <span className="loan-label">Returned: {loanSummary.netTotalLoan.returned}</span>
          {/* <span className="loan-label">Profit: {loanSummary.netTotalLoan.profit}</span> */}
        {/* </div> */}
      </div>

      <div className="loan-card">
        <h3 className="loan-type">LOANS</h3>
        <p className="loan-amount">
          {loanSummary.loans.ongoing + loanSummary.loans.completed}
        </p>
        <div className="loan-details">
          <span className="loan-label">Ongoing: {loanSummary.loans.ongoing}</span>
          {/* <span className="loan-label">Completed: {loanSummary.loans.completed}</span> */}
        </div>
      </div>
    </div>
  );
};

export default LoanSummary;
