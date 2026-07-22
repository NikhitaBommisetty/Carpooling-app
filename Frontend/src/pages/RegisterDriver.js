import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function RegisterDriver() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    license_no: '',
    issue_date: '',
    expiry_date: ''
  });

  const [message] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/register', { ...form, role_id: 1 });
      navigate('/login');
    } catch (err) {
    }
  };

  return (
    <div className="center-wrapper">
      <div className="card">
        <h2>Register as Driver</h2>
        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input name="name" placeholder="Enter your name" onChange={handleChange} />
          <label>Phone</label>
          <input name="phone" placeholder="Enter your phone number" onChange={handleChange} />
          <label>Email</label>
          <input type="email" name="email" placeholder="Enter your email" onChange={handleChange} />
          <label>Password</label>
          <input type="password" name="password" placeholder="Enter your password" onChange={handleChange} />
          <label>License Number</label>
          <input name="license_no" placeholder="Enter license number" onChange={handleChange} />
          <label>Issue Date</label>
          <input type="date" name="issue_date" onChange={handleChange} />
          <label>Expiry Date</label>
          <input type="date" name="expiry_date" onChange={handleChange} />
          <button type="submit">Register</button>
        </form>
        {message && <div className={`message ${message.type}`}>{message.text}</div>}
      </div>
    </div>
  );
}

export default RegisterDriver;
