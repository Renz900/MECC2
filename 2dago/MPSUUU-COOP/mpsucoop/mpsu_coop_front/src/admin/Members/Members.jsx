import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import styles from './Members.css';
import { IoIosPersonAdd } from "react-icons/io";
import { FaUserEdit, FaTrash, FaEye } from "react-icons/fa";
import { IoMdCloseCircle } from "react-icons/io";

function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formErrors, setFormErrors] = useState({}); // New state for field-specific errors
  const [newMember, setNewMember] = useState({});
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const [membersRes, archivesRes] = await Promise.all([
          axios.get('http://localhost:8000/members/'),
          axios.get('http://localhost:8000/archives/?archive_type=Member'),
        ]);

        const archivedMemberIds = new Set(
          archivesRes.data.map(archive => archive.archived_data.member_id || archive.archived_data.memId)
        );

        const activeMembers = membersRes.data.filter(
          member => !archivedMemberIds.has(member.member_id || member.memId)
        );

        setMembers(activeMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

const validateInput = (field, value) => {
    switch (field) {
      case 'email':
        if (!value) return '';
        if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value)) {
          return 'Please enter a valid email address (e.g., user@gmail.com)';
        }
        break;
      case 'phone_number':
        if (!value) return '';
        if (!/^\d{11}$/.test(value)) {
          return 'Phone number must be exactly 11 digits (e.g., 09123456789)';
        }
        break;
      case 'tin':
        if (!value) return '';
        if (!/^\d{9}$/.test(value)) {
          return 'TIN must be exactly 9 digits (e.g., 123456789)';
        }
        break;
      case 'id_no':
        if (!value) return '';
        
        // Get the selected ID type
        const idType = editingMember?.valid_id || newMember.valid_id;
        
        switch (idType) {
          case 'Philippine Passport':
            // Format: 2 letters + 7 digits (e.g., XX1234567)
            // Letters represent passport series, numbers are unique sequence
            if (!/^[A-Z]{2}\d{7}$/.test(value)) {
              return 'Philippine Passport format: 2 letters (passport series) + 7 digits (unique number). Example: XX1234567.';
            }
            break;
            
          case 'Drivers License':
            // Format: Letter + 2 digits - 2 digits - 6 digits (e.g., N01-12-123456)
            // First letter = license type, first 2 digits = region code, next 2 = year issued, last 6 = sequence
            if (!/^[A-Z]\d{2}-\d{2}-\d{6}$/.test(value)) {
              return 'Driver\'s License format: 1 letter (license type) + 2 digits (region code) - 2 digits (year issued) - 6 digits (sequence number). Example: N01-12-123456.';
            }
            break;
            
          case 'SSS ID':
            // Format: 2 digits - 7 digits - 1 digit (e.g., 01-2345678-9)
            // First 2 = employer code, middle 7 = member sequence, last 1 = check digit
            if (!/^\d{2}-\d{7}-\d{1}$/.test(value)) {
              return 'SSS ID format: 2 digits (employer/branch code) - 7 digits (member sequence number) - 1 digit (check digit). Example: 01-2345678-9.';
            }
            break;
            
          case 'GSIS ID':
            // Format: 11 digits (e.g., 12345678901)
            // Contains employee number and check digits for government employees
            if (!/^\d{11}$/.test(value)) {
              return 'GSIS ID format: 11 consecutive digits (government employee number with built-in check digits). Example: 12345678901. No dashes or spaces.';
            }
            break;
            
          case 'TIN ID':
            // Format: 3 digits - 3 digits - 3 digits (e.g., 123-456-789)
            // First 3 = RDO code, middle 3 = sequence, last 3 = branch/type identifier
            if (!/^\d{3}-\d{3}-\d{3}$/.test(value)) {
              return 'TIN ID format: 3 digits (RDO code) - 3 digits (sequence number) - 3 digits (branch identifier). Example: 123-456-789. RDO = Revenue District Office.';
            }
            break;
            
          case 'Postal ID':
            // Format: 12 digits (e.g., A23456789012)
            // Contains region, post office, and sequence information
            if (!/^[A-Z]\d{11}$/.test(value)) {
              return 'Postal ID format: 1 letter and 11 consecutive digits (contains region code, post office code, and sequence number). Example: A23456789012. No dashes or spaces.';
            }
            break;
            
          case 'Voters ID':
            // Format: 18 digits (e.g., 123456789012345678)
            // Contains region, province, city, barangay, precinct, and sequence codes
            if (!/^\d{18}$/.test(value)) {
              return 'Voter\'s ID format: 18 consecutive digits (region + province + city + barangay + precinct + sequence codes). Example: 123456789012345678. No spaces or dashes.';
            }
            break;
            
          case 'PhilHealth ID':
            // Format: 2 digits - 9 digits - 1 digit (e.g., 12-345678901-2)
            // First 2 = member type, middle 9 = unique member number, last 1 = check digit
            if (!/^\d{2}-\d{9}-\d{1}$/.test(value)) {
              return 'PhilHealth ID format: 2 digits (member type code) - 9 digits (unique member number) - 1 digit (check digit). Example: 12-345678901-2.';
            }
            break;
            
          case 'National ID':
            // Format: 4 digits - 4 digits - 4 digits (e.g., 1234-5678-9012)
            // Contains birth year, region code, and sequence number
            if (!/^\d{4}-\d{4}-\d{4}$/.test(value)) {
              return 'National ID (PhilID) format: 4 digits (birth year/region) - 4 digits (sequence) - 4 digits (check digits). Example: 1234-5678-9012.';
            }
            break;
            
          default:
            return 'Please select a valid ID type first';
        }
        break;
      case 'in_dep':
        if (!value) return '';
        const depositValue = parseFloat(value);
        if (isNaN(depositValue)) {
          return 'Initial deposit must be a valid number';
        }
        if (depositValue < 50000) {
          return 'Initial deposit must be at least ₱50,000';
        }
        if (depositValue > 1000000) {
          return 'Initial deposit cannot exceed ₱1,000,000';
        }
        break;
      case 'first_name':
        if (!value || !value.trim()) {
          return 'First name is required';
        }
        if (value.trim().length < 2) {
          return 'First name must be at least 2 characters long';
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          return 'First name can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;
      case 'last_name':
        if (!value || !value.trim()) {
          return 'Last name is required';
        }
        if (value.trim().length < 2) {
          return 'Last name must be at least 2 characters long';
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
          return 'Last name can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;
      case 'middle_name':
        if (value && !/^[a-zA-Z\s'-]*$/.test(value.trim())) {
          return 'Middle name can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;
      case 'age':
        if (value && (value < 25 || value > 100)) {
          return 'Age must be between 25 and 100 years';
        }
        break;
      case 'height':
        if (value && (value < 100 || value > 250)) {
          return 'Height must be between 100 and 250 cm';
        }
        break;
      case 'weight':
        if (value && (value < 30 || value > 300)) {
          return 'Weight must be between 30 and 300 kg';
        }
        break;
      case 'zip_code':
        if (value && !/^\d{4}$/.test(value)) {
          return 'Zip code must be exactly 4 digits (e.g., 2616)';
        }
        break;
      case 'ann_com':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          return 'Annual income must be a positive number';
        }
        break;
      default:
        return '';
    }
    return '';
  };

  // Enhanced validation for the entire form
  const validateForm = (memberData) => {
    const errors = {};
    const requiredFields = ['first_name', 'middle_name', 'last_name', 'email', 'phone_number', 'in_dep'];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!memberData[field] || !memberData[field].toString().trim()) {
        switch (field) {
          case 'first_name':
            errors[field] = 'First name is required';
            break;
          case 'middle_name':
            errors[field] = 'middle name is required';
            break;
          case 'last_name':
            errors[field] = 'Last name is required';
            break;
          case 'email':
            errors[field] = 'Email address is required';
            break;
          case 'phone_number':
            errors[field] = 'Phone number is required';
            break;
          case 'in_dep':
            errors[field] = 'Initial deposit is required';
            break;
        }
      }
    });

    // Validate each field
    Object.keys(memberData).forEach(field => {
      if (memberData[field]) {
        const error = validateInput(field, memberData[field]);
        if (error) {
          errors[field] = error;
        }
      }
    });

    // Check for duplicate email
    const existingMember = members.find(member => 
      member.email === memberData.email && 
      member.memId !== (editingMember?.memId)
    );
    if (existingMember) {
      errors.email = 'This email address is already registered by another member';
    }

    // Check for duplicate TIN Number
    const existingTin = members.find(member => 
      member.tin === memberData.tin && 
      member.memId !== (editingMember?.memId)
    );
    if (existingTin) {
      errors.tin = 'This TIN number is already registered by another member';
    }

    // Check for duplicate Phone Number
    const existingPhone = members.find(member => 
      member.phone_number === memberData.phone_number && 
      member.memId !== (editingMember?.memId)
    );
    if (existingPhone) {
      errors.phone_number = 'This phone number is already registered by another member';
    }

    return errors;
  };

  const filteredMembers = members
    .filter(member => member.accountN)
    .filter(member => 
      `${member.first_name} ${member.middle_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      || (member.accountN && member.accountN.toString().includes(searchQuery))
    );

  const handleInputChange = (e, setter) => {
    const { name, value } = e.target;
    const error = validateInput(name, value);
    
    setter((prevState) => ({
      ...prevState,
      [name]: value
    }));

    // Update formErrors state for real-time validation feedback
    setFormErrors(prev => ({
      ...prev,
      [name]: error || null
    }));

    // Clear general form error when user starts typing
    if (formError) {
      setFormError(null);
    }
  };

  const openDeleteModal = (member) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const confirmDeleteMember = async () => {
    try {
      await axios.delete(`http://localhost:8000/members/${memberToDelete.memId}/`);
      setMembers(members.filter(member => member.memId !== memberToDelete.memId));
      setShowDeleteModal(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      if (err.response?.status === 404) {
        setError('Member not found. It may have already been deleted.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to delete this member.');
      } else {
        setError('Failed to delete member. Please try again.');
      }
    }
  };

  const handleAddMember = async () => {
    const errors = validateForm(newMember);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormError('Please fix the errors below before submitting.');
      return;
    }

    // Additional validation for addresses
    const addressError = validateAddresses(newMember, { address: newMember.addresss });
    if (addressError) {
      setFormError(addressError);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/members/', newMember);
      setMembers([...members, response.data]);
      setNewMember({});
      setShowAddForm(false);
      setFormError(null);
      setFormErrors({});
    } catch (err) {
      console.error('Add member error:', err);
      if (err.response?.status === 400) {
        const serverErrors = err.response.data;
        if (typeof serverErrors === 'object') {
          setFormErrors(serverErrors);
          setFormError('Please fix the validation errors highlighted below.');
        } else {
          setFormError('Invalid data provided. Please check your inputs.');
        }
      } else if (err.response?.status === 409) {
        setFormError('A member with this email or phone number already exists.');
      } else if (err.response?.status === 500) {
        setFormError('Server error occurred. Please try again later.');
      } else {
        setFormError('Failed to add member. Please check your internet connection and try again.');
      }
    }
  };

  const handleEditMember = async () => {
    const errors = validateForm(editingMember);
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormError('Please fix the errors below before submitting.');
      return;
    }

    // Additional validation for addresses
    const addressError = validateAddresses(editingMember, { address: editingMember.addresss });
    if (addressError) {
      setFormError(addressError);
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:8000/members/${editingMember.memId}/`,
        editingMember
      );
      setMembers(
        members.map(member =>
          member.memId === editingMember.memId ? response.data : member
        )
      );
      setEditingMember(null);
      setShowAddForm(false);
      setFormError(null);
      setFormErrors({});
    } catch (err) {
      console.error('Edit member error:', err);
      if (err.response?.status === 400) {
        const serverErrors = err.response.data;
        if (typeof serverErrors === 'object') {
          setFormErrors(serverErrors);
          setFormError('Please fix the validation errors highlighted below.');
        } else {
          setFormError('Invalid data provided. Please check your inputs.');
        }
      } else if (err.response?.status === 404) {
        setFormError('Member not found. It may have been deleted.');
      } else if (err.response?.status === 409) {
        setFormError('A member with this email or phone number already exists.');
      } else if (err.response?.status === 500) {
        setFormError('Server error occurred. Please try again later.');
      } else {
        setFormError('Failed to update member. Please check your internet connection and try again.');
      }
    }
  };

  const handleStartEdit = (member) => {
    setEditingMember({ ...member });
    setShowAddForm(true);
    setFormError(null);
    setFormErrors({});
  };

  const validateAddresses = (member, cooperative) => {
    if (member.address && cooperative.address && member.address === cooperative.address) {
      return 'The member\'s address must be different from the cooperative\'s address.';
    }
    return null;
  };

  const handleBirthDateChange = (e, fieldName) => {
    const selectedDate = new Date(e.target.value).toISOString().split('T')[0];
    const allDates = [
      editingMember?.birth_date || newMember.birth_date,
      editingMember?.birth_date1 || newMember.birth_date1,
      editingMember?.birth_date2 || newMember.birth_date2,
      editingMember?.birth_date3 || newMember.birth_date3,
    ];
    if (allDates.includes(selectedDate)) {
      alert("Birth date must be unique and different from other beneficiaries' birth dates.");
      return;
    }
    const updatedMember = editingMember
      ? { ...editingMember, [fieldName]: selectedDate }
      : { ...newMember, [fieldName]: selectedDate };
    editingMember ? setEditingMember(updatedMember) : setNewMember(updatedMember);
  };

  const handleViewMember = (member) => {
    setSelectedMember(member);
  };

  // Helper function to get error message for a field
  const getFieldError = (fieldName) => {
    return formErrors[fieldName];
  };

  // Helper function to get input style with error highlighting
  const getInputStyle = (fieldName, hasError = false) => {
    const baseStyle = {
      border: "1px solid black",
      padding: "8px",
      borderRadius: "4px",
      width: "100%"
    };

    if (hasError || getFieldError(fieldName)) {
      return {
        ...baseStyle,
        border: "2px solid #dc3545",
        backgroundColor: "#fff5f5"
      };
    }

    return baseStyle;
  };

  // Helper function to render error message
  const renderErrorMessage = (fieldName) => {
    const error = getFieldError(fieldName);
    if (error) {
      return (
        <div style={{ 
          color: '#dc3545', 
          fontSize: '12px', 
          marginTop: '2px',
          fontWeight: 'bold'
        }}>
          {error}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

return (
    <div className={styles.membersSection}>
      {showAddForm ? (
        <div className={styles.addMemberForm}>
        <h3 style={{ fontSize: '18px', marginTop: '-40px', marginBottom: '10px', textAlign: 'center' }}>{editingMember ? 'Edit Member' : 'Add Member'}</h3>
        {formError && (
          <div style={{ 
            color: '#dc3545', 
            backgroundColor: '#f8d7da', 
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '15px',
            fontWeight: 'bold'
          }}>
            {formError}
          </div>
        )}

        <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '20px', width: '100%', boxShadow: '0px 0px 15px 0px rgb(154, 154, 154)', borderRadius: '5px', marginRight: '50px', marginLeft: '3px', boxSizing: 'border-box', height: '570px', }}>
          <div style={{ display: 'grid', gap: '5px' }}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <div style={{ flex: '1'}}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>First Name: <span style={{color: 'red'}}></span></label>
                <input
                  type="text"
                  className="form-control"
                  id="first_name"
                  placeholder="First Name"
                  name="first_name"
                  value={editingMember?.first_name || newMember.first_name || ''}
                  onChange={(e) =>
                    handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                  }
                  style={getInputStyle('first_name')}
                />
                {renderErrorMessage('first_name')}
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Middle Name:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Middle Name"
                  name="middle_name"
                  value={editingMember?.middle_name || newMember.middle_name || ''}
                  onChange={(e) =>
                    handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                  }
                  style={getInputStyle('middle_name')}
                />
                {renderErrorMessage('middle_name')}
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Last Name: <span style={{color: 'red'}}></span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Last Name"
                  name="last_name"
                  value={editingMember?.last_name || newMember.last_name || ''}
                  onChange={(e) =>
                    handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                  }
                  style={getInputStyle('last_name')}
                />
                {renderErrorMessage('last_name')}
              </div>
              <div style={{ flex: '1' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Email Address: <span style={{color: 'red'}}></span></label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  name="email"
                  value={editingMember?.email || newMember.email || ''}
                  onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                  style={getInputStyle('email')}
                />
                {renderErrorMessage('email')}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Date of Birth:</label>
                <input
                  type="date"
                  className="form-control"
                  placeholder="Birth Date"
                  name="birth_date"
                  min="1950-01-01"
                  max="2000-01-01"
                  value={editingMember?.birth_date || newMember.birth_date || ''}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    const today = new Date();
                    let age = today.getFullYear() - selectedDate.getFullYear();
                    const monthDiff = today.getMonth() - selectedDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
                      age -= 1;
                    }
                    const updatedMember = editingMember
                      ? { ...editingMember, birth_date: e.target.value, age: age > 0 ? age : '' }
                      : { ...newMember, birth_date: e.target.value, age: age > 0 ? age : '' };
                    editingMember ? setEditingMember(updatedMember) : setNewMember(updatedMember);
                  }}
                  style={getInputStyle('birth_date')}
                />
                {renderErrorMessage('birth_date')}
              </div>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Birth Place:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Birth Place"
                  name="birth_place"
                  value={editingMember?.birth_place || newMember.birth_place || ''}
                  onChange={(e) =>
                    handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                  }
                  style={getInputStyle('birth_place')}
                />
                {renderErrorMessage('birth_place')}
              </div>
              <div style={{ flex: '1', minWidth: '100px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Age:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Age"
                  name="age"
                  value={editingMember?.age || newMember.age || ''}
                  readOnly
                  style={getInputStyle('age')}
                />
                {(editingMember?.age < 21 || newMember.age < 21) && (editingMember?.age || newMember.age) && (
                  <div style={{ color: '#ffc107', fontSize: '12px', marginTop: '2px', fontWeight: 'bold' }}>
                    Warning: Applicants must be at least 21 years old to qualify for a loan.
                  </div>
                )}
                {renderErrorMessage('age')}
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Zip Code:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Zip Code"
                  name="zip_code"
                  value={editingMember?.zip_code || newMember.zip_code || '2616'}
                  onChange={(e) =>
                    handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                  }
                  style={getInputStyle('zip_code')}
                />
                {renderErrorMessage('zip_code')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Gender:</label>
              <select
                className="form-control"
                name="gender"
                value={editingMember?.gender || newMember.gender || ''}
                onChange={(e) =>
                  handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                }
                style={getInputStyle('gender')}
              >
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
              {renderErrorMessage('gender')}
            </div>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Civil Status:</label>
              <select
                className="form-control"
                name="pstatus"
                value={editingMember?.pstatus || newMember.pstatus || ''}
                onChange={(e) =>
                  handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                }
                style={getInputStyle('pstatus')}
              >
                <option value="" disabled>Select Relationship Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="In a relationship">In a relationship</option>
                <option value="Engaged">Engaged</option>
                <option value="Baak">Baak</option>
              </select>
              {renderErrorMessage('pstatus')}
            </div>
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Religion:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Religion"
                name="religion"
                value={editingMember?.religion || newMember.religion || ''}
                onChange={(e) =>
                  handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                }
                style={getInputStyle('religion')}
              />
              {renderErrorMessage('religion')}
            </div>
            <div style={{ flex: '2' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Address:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Address"
                name="address"
                value={editingMember?.address || newMember.address || ''}
                onChange={(e) =>
                  handleInputChange(e, editingMember ? setEditingMember : setNewMember)
                }
                style={getInputStyle('address')}
              />
              {renderErrorMessage('address')}
            </div>
            <div style={{ flex: '1', marginTop: '5px' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Phone Number: <span style={{color: 'red'}}></span></label>
              <input
                type="text"
                className="form-control"
                placeholder="Phone Number"
                name="phone_number"
                value={editingMember?.phone_number || newMember.phone_number || ''}
                onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                style={getInputStyle('phone_number')}
              />
              {renderErrorMessage('phone_number')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', marginTop: '-3px' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Height (cm)</label>
              <input
                type="number"
                className="form-control"
                placeholder="Height"
                name="height"
                value={editingMember?.height || newMember.height || ''}
                onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                style={getInputStyle('height')}
              />
              {renderErrorMessage('height')}
            </div>
            <div style={{ flex: '1 1 200px', marginTop: '-3px' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Weight (kg)</label>
              <input
                type="number"
                className="form-control"
                placeholder="Weight"
                name="weight"
                value={editingMember?.weight || newMember.weight || ''}
                onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                style={getInputStyle('weight')}
              />
              {renderErrorMessage('weight')}
            </div>
            <div style={{ flex: '1 1 200px', marginTop: '-3px' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Tax Identification Number:</label>
              <input
                type="number"
                className="form-control"
                placeholder="TIN"
                name="tin"
                value={editingMember?.tin || newMember.tin || ''}
                onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                style={getInputStyle('tin')}
              />
              {renderErrorMessage('tin')}
            </div>
            <div style={{ flex: '1 1 200px', marginTop: '-3px' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Issued Government ID</label>
              <select
                className="form-control"
                name="valid_id"
                value={editingMember?.valid_id || newMember.valid_id || ''}
                onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                style={getInputStyle('valid_id')}
              >
                <option value="" disabled>Select Valid ID</option>
                <option value="Philippine Passport">Philippine Passport</option>
                <option value="Drivers License">Driver's License</option>
                <option value="SSS ID">SSS ID</option>
                <option value="GSIS ID">GSIS ID</option>
                <option value="TIN ID">TIN ID</option>
                <option value="Postal ID">Postal ID</option>
                <option value="Voters ID">Voter's ID</option>
                <option value="PhilHealth ID">PhilHealth ID</option>
                <option value="National ID">National ID</option>
              </select>
              {renderErrorMessage('valid_id')}
            </div>
            <div style={{ flex: '1 1 200px', marginTop: '-3px' }}>
              <label style={{ display: 'block', fontWeight: 'bold' }}>ID Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="ID Number"
                name="id_no"
                value={editingMember?.id_no || newMember.id_no || ''}
                onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                style={getInputStyle('id_no')}
              />
              {renderErrorMessage('id_no')}
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {/* Annual Income */}
              <div style={{ flex: '1 1 30%', maxWidth: '300px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Annual Income
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Annual Income"
                  name="ann_com"
                  value={editingMember?.ann_com || newMember.ann_com || ''}
                  onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                  style={getInputStyle('ann_com')}
                />
                {renderErrorMessage('ann_com')}
              </div>
              {/* Membership in other Cooperatives */}
              <div style={{ flex: '1 1 30%', maxWidth: '300px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Membership in other Cooperatives
                </label>
                <input
                  className="form-control"
                  name="mem_co"
                  placeholder="Cooperatives"
                  value={editingMember?.mem_co || newMember.mem_co || ''}
                  onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                  style={getInputStyle('mem_co')}
                />
                {renderErrorMessage('mem_co')}
              </div>
              {/* Address of the Cooperative */}
              <div style={{ flex: '1 1 30%', maxWidth: '300px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                  Address of the Cooperative
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Address"
                  name="addresss"
                  value={editingMember?.addresss || newMember.addresss || ''}
                  onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                  style={getInputStyle('addresss')}
                />
                {renderErrorMessage('addresss')}
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 30%', maxWidth: '300px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                    Initial Deposit <span style={{color: 'red'}}></span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Deposit"
                    name="in_dep"
                    value={editingMember?.in_dep || newMember.in_dep || ''}
                    onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                    style={getInputStyle('in_dep')}
                  />
                  {renderErrorMessage('in_dep')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                {/* Beneficiaries Name 1 */}
                <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                  <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginTop: '-20px' }}>
                      Beneficiaries Name
                    </label>
                    <input
                      className="form-control"
                      name="beneficiary"
                      placeholder="Beneficiaries Name 1"
                      value={editingMember?.beneficiary || newMember.beneficiary || ''}
                      onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                      style={getInputStyle('beneficiary')}
                    />
                    {renderErrorMessage('beneficiary')}
                  </div>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginTop: '-20px' }}>
                      Relationship
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="relationship"
                      placeholder="Relationship"
                      value={editingMember?.relationship || newMember.relationship || ''}
                      onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                      style={getInputStyle('relationship')}
                    />
                    {renderErrorMessage('relationship')}
                  </div>

                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginTop: '-20px' }}>
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Birth Date"
                      name="birth_date1"
                      min="1950-01-01"
                      max="2003-12-31"
                      value={editingMember?.birth_date1 || newMember.birth_date1 || ''}
                      onChange={(e) => handleBirthDateChange(e, 'birth_date1')}
                      style={getInputStyle('birth_date1')}
                    />
                    {renderErrorMessage('birth_date1')}
                  </div>
                </div>
                {/* Beneficiaries Name 2 */}
                <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                  <div style={{ flex: '1 1 200px', minWidth: '200px', marginTop: '-35px' }}>
                    <input
                      className="form-control"
                      name="beneficiary2"
                      placeholder="Beneficiaries Name 2"
                      value={editingMember?.beneficiary2 || newMember.beneficiary2 || ''}
                      onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                      style={getInputStyle('beneficiary2')}
                    />
                    {renderErrorMessage('beneficiary2')}
                  </div>
                  <div style={{ flex: '1', minWidth: '200px', marginTop: '-35px' }}>
                    <input
                      type="text"
                      className="form-control"
                      name="relationship2"
                      placeholder="Relationship"
                      value={editingMember?.relationship2 || newMember.relationship2 || ''}
                      onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                      style={getInputStyle('relationship2')}
                    />
                    {renderErrorMessage('relationship2')}
                  </div>
                  <div style={{ flex: '1', minWidth: '200px', marginTop: '-35px' }}>
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Birth Date"
                      name="birth_date2"
                      min="1950-01-01"
                      max="2003-12-31"
                      value={editingMember?.birth_date2 || newMember.birth_date2 || ''}
                      onChange={(e) => handleBirthDateChange(e, 'birth_date2')}
                      style={getInputStyle('birth_date2')}
                    />
                    {renderErrorMessage('birth_date2')}
                  </div>
                </div>
                {/* Beneficiaries Name 3 */}
                <div style={{ display: 'flex', gap: '20px', width: '100%' }}>
                  <div style={{ flex: '1 1 200px', minWidth: '200px', marginTop: '-35px' }}>
                    <input
                      className="form-control"
                      name="beneficiary3"
                      placeholder="Beneficiaries Name 3"
                      value={editingMember?.beneficiary3 || newMember.beneficiary3 || ''}
                      onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                      style={getInputStyle('beneficiary3')}
                    />
                    {renderErrorMessage('beneficiary3')}
                  </div>
                  <div style={{ flex: '1', minWidth: '200px', marginTop: '-35px' }}>
                    <input
                      type="text"
                      className="form-control"
                      name="relationship3"
                      placeholder="Relationship"
                      value={editingMember?.relationship3 || newMember.relationship3 || ''}
                      onChange={(e) => handleInputChange(e, editingMember ? setEditingMember : setNewMember)}
                      style={getInputStyle('relationship3')}
                    />
                    {renderErrorMessage('relationship3')}
                  </div>
                  <div style={{ flex: '1', minWidth: '200px', marginTop: '-35px' }}>
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Birth Date"
                      name="birth_date3"
                      min="1950-01-01"
                      max="2003-12-31"
                      value={editingMember?.birth_date3 || newMember.birth_date3 || ''}
                      onChange={(e) => handleBirthDateChange(e, 'birth_date3')}
                      style={getInputStyle('birth_date3')}
                    />
                    {renderErrorMessage('birth_date3')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Buttons */}
        <button 
          onClick={editingMember ? handleEditMember : handleAddMember} 
          style={{ backgroundColor: "#4CAF50", color: "black", border: "none", borderRadius: "4px", fontSize: "16px", cursor: "pointer", marginRight: "10px", padding: "10px 20px" }}
        >
          {editingMember ? 'Save Changes' : 'Submit'}
        </button>

        <button 
          onClick={() => {
            setShowAddForm(false);
            setFormError(null);
            setFormErrors({});
            setEditingMember(null);
            setNewMember({});
          }} 
          style={{ backgroundColor: "#f44336", color: "black", border: "none", borderRadius: "4px", fontSize: "16px", cursor: "pointer", padding: "10px 20px" }}
        >
          Cancel
        </button>
      </div>
    ) : (
      <>
        <div className={styles.tableHeader}>
          <h2 className="tableHeaderTitle">MEMBERS</h2>
          <div className="searchBar">
            <input
              type="text"
              placeholder="Search Members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="searchInput"
            />
          </div>
          <button
            className={styles.addButton}
            onClick={() => setShowAddForm(true)}
            style={{ backgroundColor: '#28a745', color: 'black', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', position: 'relative', marginRight: '1100px', marginTop: '-65px', position: 'fixed' }}
          >
            <IoIosPersonAdd style={{ marginRight: '0', fontSize: '25px', marginBottom: '-5px' }} /> Add Member
          </button>
        </div>
        <div className="tableContainer">
          <style>
            {`
            /* For WebKit-based browsers (Chrome, Safari, etc.) */
            div::-webkit-scrollbar {
              display: none;
            }
            `}
          </style>
          <table className="membersTable">
            <thead>
              <tr className="tableHeaderRow">
                <th className="tableHeaderCell">Account No.</th>
                <th className="tableHeaderCell">Full Name</th>
                <th className="tableHeaderCell">Email</th>
                <th className="tableHeaderCell">Phone Number</th>
                <th className="tableHeaderCell">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.memId} className="tableRow">
                  <td className="tableCell">{member.accountN || 'No Account'}</td>
                  <td className="tableCell">{`${member.first_name} ${member.middle_name || ''} ${member.last_name}`.trim()}</td>
                  <td className="tableCell">{member.email}</td>
                  <td className="tableCell">{member.phone_number}</td>

                  <td className="actionButtons">
                    <button
                      onClick={() => handleViewMember(member)}
                      className="actionButton actionButtonView"
                    >
                      <FaEye />
                      <span className="buttonText">View</span>
                    </button>
                    <button
                      onClick={() => handleStartEdit(member)}
                      className="actionButton actionButtonEdit"
                    >
                      <FaUserEdit />
                      <span className="buttonText">Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedMember && (
          <div className="memberDetailsPopup">
            <h3 className="memberDetailsTitle">Member Details</h3>
            <button
              onClick={() => setSelectedMember(null)}
              className="closePopupButton"
            >
              <IoMdCloseCircle className="closePopupIcon" /> Close
            </button>
              <div style={{
                backgroundColor: "#f9f2c8",
                padding: "5px",
              }}>
                <div style={{ display: "flex", gap: "5px" }}>
                  {[
                    { label: "First Name", value: selectedMember.first_name },
                    { label: "Middle Name", value: selectedMember.middle_name || "N/A" },
                    { label: "Last Name", value: selectedMember.last_name },
                    { label: "Email Address", value: selectedMember.email }
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: "bold", marginBottom: "1px" }}>{item.label}:</label>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  {[
                    { label: "Date of Birth", value: selectedMember.birth_date },
                    { label: "Birth Place", value: selectedMember.birth_place },
                    { label: "Age", value: selectedMember.age },
                    { label: "Zip Code", value: selectedMember.zip_code }
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: "bold", marginBottom: "1px" }}>{item.label}:</label>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  {[
                    { label: "Gender", value: selectedMember.gender },
                    { label: "Civil Status", value: selectedMember.pstatus },
                    { label: "Religion", value: selectedMember.religion },
                    { label: "Address", value: selectedMember.address },
                    { label: "Phone Number", value: selectedMember.phone_number },
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: "bold", marginBottom: "1px" }}>{item.label}:</label>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  {[
                    { label: "Height (cm)", value: selectedMember.height },
                    { label: "Weight (kg)", value: selectedMember.weight },
                    { label: "Tax Identification Number", value: selectedMember.tin },
                    { label: "Issued Government ID", value: selectedMember.valid_id },
                    { label: "ID Number", value: selectedMember.id_no },
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: "bold", marginBottom: "1px" }}>{item.label}:</label>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  {[
                    { label: "Annual Income", value: selectedMember.ann_com },
                    { label: "Membership in other Cooperatives", value: selectedMember.mem_co },
                    { label: "Address of the Cooperative", value: selectedMember.addresss },
                    { label: "Initial Deposit", value: selectedMember.in_dep },
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: "bold", marginBottom: "1px" }}>{item.label}:</label>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  {[
                    { label: "Beneficiaries Name", value: selectedMember.beneficiary },
                    { label: "Relationship", value: selectedMember.relationship },
                    { label: "Date of Birth", value: selectedMember.birth_date1 },
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <label style={{ display: "block", fontWeight: "bold", marginBottom: "1px" }}>{item.label}:</label>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                  {[
                    { value: selectedMember.beneficiary2 },
                    { value: selectedMember.relationship2 },
                    { value: selectedMember.birth_date2 }
                  ].map((item, index) => (
                    <div key={index} style={{ flex: 1 }}>
                      <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                    </div>
                  ))}
              </div>

              <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                {[
                  {value: selectedMember.beneficiary3 },
                  {value: selectedMember.relationship3 },
                  {value: selectedMember.birth_date3 }
                ].map((item, index) => (
                  <div key={index} style={{ flex: 1 }}>
                    <input type="text" readOnly value={item.value || "N/A"} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#fff" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div
          className="overlayBackground"
          onClick={() => setSelectedMember(null)}
          ></div>
        </>
      )}
    </div>
  );
}
export default Members;