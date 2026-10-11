import React from 'react';

export default function LoadingSpinner({ fullScreen = false, text = '' }) {
  return (
    <div className={`spinner-screen ${fullScreen ? 'full-screen' : ''}`}>
      <div className="modern-spinner" aria-label="Loading" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
}
