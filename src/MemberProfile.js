import React, { useState, useEffect } from 'react';

// TODO: Import real API functions for vehicles, venues, and profile
// import { getMemberVehicles, addVehicle, removeVehicle, setPrimaryVehicle, getVenues, getFavouriteVenues, addFavouriteVenue, removeFavouriteVenue, updatePhoneNumber } from './api';

const MemberProfile = ({ member, onSignOut }) => {
  // Placeholder state
  const [phone, setPhone] = useState(member?.phone || '');
  const [vehicles, setVehicles] = useState([]); // [{registration, make, model, color, is_primary}]
  const [venues, setVenues] = useState([]); // [{id, name}]
  const [favourites, setFavourites] = useState([]); // [venue_id]
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState(phone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // TODO: Fetch vehicles, venues, and favourites from backend
  useEffect(() => {
    // setVehicles(...)
    // setVenues(...)
    // setFavourites(...)
  }, []);

  const handlePhoneSave = async () => {
    setLoading(true);
    setError('');
    // TODO: Call updatePhoneNumber API
    setPhone(newPhone);
    setEditingPhone(false);
    setLoading(false);
  };

  return (
    <div className="container content-wrapper">
      <h1 className="heading">My Profile</h1>
      <div className="profile-section">
        <h2>Phone Number</h2>
        {editingPhone ? (
          <div>
            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} />
            <button onClick={handlePhoneSave} disabled={loading}>Save</button>
            <button onClick={() => setEditingPhone(false)}>Cancel</button>
          </div>
        ) : (
          <div>
            <span>{phone || <em>No phone set</em>}</span>
            <button onClick={() => setEditingPhone(true)}>Edit</button>
          </div>
        )}
      </div>
      <div className="profile-section">
        <h2>My Vehicles</h2>
        <ul>
          {vehicles.length === 0 && <li><em>No vehicles added yet.</em></li>}
          {vehicles.map(v => (
            <li key={v.registration}>
              {v.registration} {v.make} {v.model} {v.color} {v.is_primary && <strong>(Primary)</strong>}
              {/* TODO: Add remove/set primary buttons */}
            </li>
          ))}
        </ul>
        <button>Add Vehicle</button> {/* TODO: Show add vehicle form/modal */}
      </div>
      <div className="profile-section">
        <h2>Favourite Venues</h2>
        <ul>
          {venues.length === 0 && <li><em>No venues available.</em></li>}
          {venues.map(venue => (
            <li key={venue.id}>
              {venue.name} {favourites.includes(venue.id) && <strong>(Favourite)</strong>}
              {/* TODO: Add/remove favourite buttons */}
            </li>
          ))}
        </ul>
      </div>
      <button className="button-secondary" onClick={onSignOut}>Sign Out</button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default MemberProfile; 