import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Topbar from "./Topbar/Topbar";

const PaymentSchedule = () => {
  const { control_number } = useParams();
  const [paymentSchedules, setPaymentSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [years, setYears] = useState([]);
  const [yearFilter, setYearFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const formatNumber = (number) => {
    if (number == null || isNaN(number)) return "N/A";
    return new Intl.NumberFormat("en-US").format(number);
  };

  useEffect(() => {
    const fetchPaymentSchedules = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const response = await fetch(
          `http://localhost:8000/api/payment-schedules/${control_number}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch payment schedules.");
        }

        const data = await response.json();
        const unpaidSchedules = data.filter((schedule) => !schedule.is_paid);
        setPaymentSchedules(unpaidSchedules);

        // Extract and sort unique years
        const uniqueYears = [
          "All",
          ...new Set(
            unpaidSchedules.map((schedule) =>
              new Date(schedule.due_date).getFullYear()
            )
          ),
        ];
        setYears(uniqueYears);
        setFilteredSchedules(unpaidSchedules);
        setLoading(false);
      } catch (err) {
        setError("Unable to load payment schedules.");
        setLoading(false);
      }
    };

    fetchPaymentSchedules();
  }, [control_number]);

  const handleYearChange = (selectedYear) => {
    setYearFilter(selectedYear);
    setFilteredSchedules(
      selectedYear === "All"
        ? paymentSchedules
        : paymentSchedules.filter(
            (schedule) => new Date(schedule.due_date).getFullYear() === parseInt(selectedYear)
          )
    );
  };

  if (loading) {
    return <div>Loading payment schedules...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div
      style={{
        padding: "10px",
        fontFamily: "Arial, sans-serif",
        Height: "100px",
        boxSizing: "border-box",
        
      }}
    >
      <Topbar />
      <h2
        style={{
          textAlign: "center",
          color: "black",
          fontSize: "24px",
          marginBottom: "30px",
          marginTop: "-250px",
          
        }}
      >
        MY PAYMENT SCHEDULES
      </h2>

      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
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
            marginRight: "15px",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#ff00e1")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#37ff7d")}
        >
          Back
        </button>

        <select
          value={yearFilter}
          onChange={(e) => handleYearChange(e.target.value)}
          style={{
            padding: "8px",
            fontSize: "14px",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "1300px",
          }}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {filteredSchedules.length > 0 ? (
        <div
          style={{
            maxHeight: "450px",
            width: "1430px",
            overflowY: "scroll",
            boxShadow: "0px 0px 15px 0px rgb(154, 154, 154)",
            padding: "5px",
            borderRadius: "5px",
            textAlign: "left",
            marginTop: "20px",
            fontSize: "14px",
            fontWeight: "bold",
            marginLeft: "5px",
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE 10+
            position: "fixed"
          }}
        >
          <table>
            <thead>
              <tr style={{}}>
                <th>Principal Amount</th>
                {/* <th>Payment Amount</th> */}
                {/* <th>Advance Payment</th> */}
                {/* <th>Previous Balance</th>
                <th>Penalty</th> */}
                <th>Due Date</th>
                {/* <th>Received Amount</th> */}
                {/* <th>Balance</th> */}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.id} style={{ color: "black" }}>
                  <td>₱ {formatNumber((parseFloat(schedule.principal_amount) || 0).toFixed(2))}</td>
                  {/* <td>₱ {formatNumber((parseFloat(schedule.payment_amount) || 0).toFixed(2))}</td> */}
                  {/* <td>₱ {formatNumber((parseFloat(schedule.advance_pay) || 0).toFixed(2))}</td> */}
                  {/* <td>₱ {formatNumber((parseFloat(schedule.under_pay) || 0).toFixed(2))}</td>
                  <td>₱ {formatNumber((parseFloat(schedule.penalty) || 0).toFixed(2))}</td> */}
                  <td>{new Date(schedule.due_date).toLocaleDateString()}</td>
                  {/* <td>₱ {formatNumber((parseFloat(schedule.receied_amnt) || 0).toFixed(2))}</td> */}
                  {/* <td>₱ {formatNumber((parseFloat(schedule.balance) || 0).toFixed(2))}</td> */}
                  <td style={{ color: schedule.is_paid ? "green" : "red" }}>
                    {schedule.is_paid ? "Paid!" : "Ongoing"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: "20px", fontSize: "16px", color: "black" }}>
          No payment schedules found for this loan.
        </div>
      )}
    </div>
  );
};

export default PaymentSchedule;
