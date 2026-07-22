import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className='center-wrapper'>
      <div className='card'>
        <h2>Welcome to RideSharing</h2>
        <p>Please register or login to continue.</p>
        <Link to='/register-driver'><button>Register as Driver</button></Link>
        <Link to='/register-rider'><button>Register as Rider</button></Link>
        <Link to='/login'><button>Login</button></Link>
      </div>
    </div>
  );
}

export default Home;
