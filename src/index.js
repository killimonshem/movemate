import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import AdminPreview from './AdminPreview';
import { AdminDashboard } from './AdminDashboard';
import { venueAdminPreviewData } from './venueAdminPreviewData';

const root = ReactDOM.createRoot(document.getElementById('root'));
const isLocalAdminPreview = process.env.NODE_ENV === 'development' && window.location.pathname === '/admin-preview';
const isLocalVenueAdminPreview = process.env.NODE_ENV === 'development' && window.location.pathname === '/venue-admin-preview';

root.render(
  <React.StrictMode>
    {isLocalVenueAdminPreview ? (
      <AdminDashboard previewData={venueAdminPreviewData} onBack={() => { window.location.href = '/admin-preview'; }} />
    ) : isLocalAdminPreview ? <AdminPreview /> : <App />}
  </React.StrictMode>
);
