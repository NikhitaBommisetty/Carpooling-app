import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function RegisterRider() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    emergency_name: '',
    emergency_phone: ''
  });

  const [message] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/register', { ...form, role_id: 2 });
      navigate('/login');
    } catch (err) {
    }
  };

  return (
    <div className="center-wrapper">
      <div className="card">
        <h2>Register as Rider</h2>
        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input name="name" placeholder="Enter your name" onChange={handleChange} />
          <label>Phone</label>
          <input name="phone" placeholder="Enter your phone number" onChange={handleChange} />
          <label>Email</label>
          <input type="email" name="email" placeholder="Enter your email" onChange={handleChange} />
          <label>Password</label>
          <input type="password" name="password" placeholder="Enter your password" onChange={handleChange} />
          <label>Emergency Contact Name</label>
          <input name="emergency_name" placeholder="Enter emergency contact name" onChange={handleChange} />
          <label>Emergency Contact Phone</label>
          <input name="emergency_phone" placeholder="Enter emergency contact phone" onChange={handleChange} />
          <button type="submit">Register</button>
        </form>
        {message && <div className={`message ${message.type}`}>{message.text}</div>}
      </div>
    </div>
  );
}

export default RegisterRider;
