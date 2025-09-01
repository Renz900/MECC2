import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Topbar from "../Topbar/Topbar";

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetControl = queryParams.get("control");

  const targetRowRef = useRef(null);

  const formatNumber = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat('en-US').format(number);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setError("Please log in to view your loans.");
      setLoading(true);
      navigate("/home");
      return;
    }

    fetchLoans();
  }, [filter, navigate]);

  useEffect(() => {
    if (targetRowRef.current) {
      targetRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loans]);

  const fetchLoans = async () => {
    const accountNumber = localStorage.getItem("account_number");

    if (!accountNumber) {
      setError("Account number is missing");
      setLoading(false);
      return;
    }

    try {
      const url = filter
        ? `http://localhost:8000/api/loans/by_account?account_number=${accountNumber}&filter=${filter}`
        : `http://localhost:8000/api/loans/by_account?account_number=${accountNumber}`;

      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          setError("Session expired. Please log in again.");
          navigate("/");
        } else {
          throw new Error(`Failed to fetch loans: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      setLoans(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching loans:", err);
      setError("Unable to connect to the server. Please try again later.");
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const query = searchQuery.toLowerCase();
    return (
      loan.account_holder.toLowerCase().includes(query) ||
      loan.account.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '10px', fontFamily: 'Arial, sans-serif', minHeight: '100px', boxSizing: 'border-box' }}>
      <Topbar />
      <h2 style={{ textAlign: 'center', color: '#000000', fontSize: '24px', marginBottom: '50px', marginTop: '-220px' }}>
        MY LOANS
      </h2>

      <button
        onClick={() => navigate(-1)}
        style={{
          fontSize: "16px",
          backgroundColor: "#37ff7d",
          color: "rgb(0, 0, 0)",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          transition: "background-color 0.3s ease",
          marginBottom: "15px",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#ff00e1")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#37ff7d")}
      >
        Back
      </button>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "5px", marginTop: "-50px" }}>
        <input
          type="text"
          placeholder="Search by Name & Account Number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: "10px", fontSize: "11px", borderRadius: "4px", width: "15%", marginLeft: "1280px" }}
        />
      </div>

      {filteredLoans.length > 0 ? (
        <table
          style={{
            maxHeight: '460px',
            width: '100%',
            overflowY: 'auto',
            boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)',
            marginTop: '-50px',
            padding: '5px',
            borderRadius: '5px',
            borderCollapse: 'collapse',
            textAlign: 'left',
            marginTop: '20px',
            fontSize: '11.8px',
            fontWeight: 'bold'
          }}
        >
          <thead>
            <tr>
              <th>Control Number</th>
              <th>Account Number</th>
              <th>Account Holder</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Loan Term</th>
              <th>Service Fee</th>
              <th>Interest Amount</th>
              <th>Admin Cost</th>
              <th>Notarial Fee</th>
              <th>CISP</th>
              <th>Take Home Pay</th>
              {/* <th>Outstanding<br /> Balance</th> */}
              <th>Purpose</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((loan) => {
              const isTarget = loan.control_number === targetControl;
              return (
                <tr
                  key={loan.control_number}
                  ref={isTarget ? targetRowRef : null}
                  style={{
                    backgroundColor: isTarget ? "#fffa90" : "transparent",
                    color: "black"
                  }}
                >
                  <td>{loan.control_number}</td>
                  <td>{loan.account || "N/A"}</td>
                  <td>{loan.account_holder || "N/A"}</td>
                  <td>{loan.loan_type}</td>
                  <td>₱{formatNumber(parseFloat(loan.loan_amount || 0).toFixed(2))}</td>
                  <td>{loan.loan_period}</td>
                  <td>₱{formatNumber(parseFloat(loan.service_fee || 0).toFixed(2))}</td>
                  <td>₱{formatNumber(parseFloat(loan.interest_amount || 0).toFixed(2))}</td>
                  <td>₱{formatNumber(parseFloat(loan.admincost || 0).toFixed(2))}</td>
                  <td>₱{formatNumber(parseFloat(loan.notarial || 0).toFixed(2))}</td>
                  <td>₱{formatNumber(parseFloat(loan.cisp || 0).toFixed(2))}</td>
                  <td>₱{formatNumber(parseFloat(loan.takehomePay || 0).toFixed(2))}</td>
                  {/* <td>₱{formatNumber(parseFloat(loan.outstanding_balance || 0).toFixed(2))}</td> */}
                  <td>{loan.purpose}</td>
                  <td style={{color:loan.status === "Paid"? "green": loan.status === "Ongoing"? "red": loan.status === "Pending"? "orange": loan.status === "Cancelled"? "gray": "black"}}>{loan.status}</td>
                  <td>
                    <Link to={`/payment-schedules/${loan.control_number}`}>
                      SCHEDULES
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div>No loans found for this account number.</div>
      )}
    </div>
  );
};

export default Loans;
