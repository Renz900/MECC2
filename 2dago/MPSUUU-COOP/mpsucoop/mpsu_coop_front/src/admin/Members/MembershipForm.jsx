import React, { useState } from "react";

function MembershipForm() {
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    birth_date: "",
    birth_place: "",
    religion: "",
    phone_number: "",
    email_address: "",
    address: "",
    zip_code: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    income: "",
    tin: "",
    civilStatus: "",
    idType: "",
    idNumber: "",
    beneficiaries: [{ name: "", relationship: "", dob: "" }],
    coMaker:"",
    relationship:"",
    membershipInOtherCoops: "",
    coopAddress: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: "10px", fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          border: "2px solid black",
          borderRadius: "10px",
          padding: "10px",
          backgroundColor: "#f4f6f9",
        }}
      >
        <form onSubmit={handleSubmit}>
          <header style={{ textAlign: "center", marginBottom: "70px" }}>
            <h2 style={{ fontSize: "24px", color: "black" }}>
              Mountain Province State Polytechnic College Employees Credit Cooperative
            </h2>
            <p style={{ fontSize: "18px", color: "black", marginBottom: "50px" }}>
              Application for Membership
            </p>
          </header>
  
          <div>
            <p>Date: ________________________</p>
            <h3 style={{ textAlign: "center", fontSize: "18px", margin: "10px 0" }}>
              MEMBER'S PERSONAL DATA
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
              
                {/* Personal Information */}
                <tr>
                  <td style={{ padding: "2px" }}><label>First Name:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "85%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Middle Name:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "85%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Last Name:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "85%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* Date of Birth and Birth Place */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Date of Birth:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "85%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Birth Place:</label></td>
                  <td style={{ padding: "2px" }} colSpan="3">
                    <input
                      type="text"
                      name="birth_place"
                      value={formData.birth_place}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "100%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* Age and Gender */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Age:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "30%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Gender:</label></td>
                  <td style={{ padding: "2px" }}>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "100%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    >
                      <option value=""></option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </td>
                </tr>
                {/* Address and Zip Code */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Address:</label></td>
                  <td style={{ padding: "2px" }} colSpan="3">
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Zip Code:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="zip_code"
                      value={formData.zip_code}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "40%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* Contact Information */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Phone Number:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Email Address:</label></td>
                  <td style={{ padding: "2px" }} colSpan="3">
                    <input
                      type="email"
                      name="email_address"
                      value={formData.email_address}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* Religion and Civil Status */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Religion:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="religion"
                      value={formData.religion}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Civil Status:</label></td>
                  <td style={{ padding: "2px" }}>
                    <select
                      name="civilStatus"
                      value={formData.civilStatus}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    >
                      <option value=""></option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </td>
                </tr>
                {/* Height and Weight */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Height (cm):</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Weight (kg):</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* Income and Tax ID */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Income:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="income"
                      value={formData.income}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>Tax ID (TIN):</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="tin"
                      value={formData.tin}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* ID Type and Number */}
                <tr>
                  <td style={{ padding: "2px" }}><label>ID Type:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="idType"
                      value={formData.idType}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                  <td style={{ padding: "2px" }}><label>ID Number:</label></td>
                  <td style={{ padding: "2px" }}>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "2px" }}><label>Name of Co-Maker:</label></td>
                  <td style={{ padding: "2px" }} colSpan="5">
                    <input
                      type="text"
                      name="coMaker"
                      value={formData.coMaker}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "2px" }}><label>Relationship with Co-Maker:</label></td>
                  <td style={{ padding: "2px" }} colSpan="5">
                    <input
                      type="text"
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>

                {/* Membership in Other Coops */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Membership in Other Co-ops:</label></td>
                  <td style={{ padding: "2px" }} colSpan="5">
                    <input
                      type="text"
                      name="membershipInOtherCoops"
                      value={formData.membershipInOtherCoops}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>
                {/* Cooperative Address */}
                <tr>
                  <td style={{ padding: "2px" }}><label>Co-op Address:</label></td>
                  <td style={{ padding: "2px" }} colSpan="5">
                    <input
                      type="text"
                      name="coopAddress"
                      value={formData.coopAddress}
                      onChange={handleChange}
                      style={{
                        padding: "5px",
                        width: "90%",
                        borderRadius: "4px",
                        border: "2px solid black",
                      }}
                    />
                  </td>
                </tr>

                </tbody>
            </table>
          </div>
  
          {/* Signature Section */}
          <div style={{ textAlign: "center", marginTop: "100px" }}>
            <p style={{ width: "200px", borderBottom: "2px solid black", margin: "0 auto" }}></p>
            <p><strong>Signature over Printed Name</strong></p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "90px" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ width: "200px", borderBottom: "2px solid black", margin: "0 auto" }}></p>
              <p><strong>Signature Verified By</strong></p>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ width: "200px", borderBottom: "2px solid black", margin: "0 auto" }}></p>
              <p><strong>Approved By</strong></p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MembershipForm;

