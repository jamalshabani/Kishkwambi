// Client-side database connection (React Native compatible)
// This file handles client-side database operations by calling the backend API

const BACKEND_URL = 'http://192.168.12.134:3001';

async function getUsers() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function getConnectionStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      connected: false,
      message: `Connection failed: ${error.message}`
    };
  }
}

module.exports = {
  getUsers,
  getConnectionStatus,
};