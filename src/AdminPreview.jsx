import React, { useState } from 'react';
import './AdminPreview.css';

const operations = [
  { registration: 'LN24 MVE', venue: 'Riverside Hall', parked: '09:12', status: 'Waiting', age: '8 min' },
  { registration: 'AB12 CDE', venue: 'Market Square', parked: '09:04', status: 'Notified', age: '16 min' },
  { registration: 'YX73 PRT', venue: 'Riverside Hall', parked: '08:51', status: 'Moved', age: 'Resolved' },
  { registration: 'KM21 VAN', venue: 'Station Yard', parked: '08:37', status: 'Waiting', age: '43 min' },
];

const venueOverview = [
  { name: 'Riverside Hall', city: 'Manchester', admins: 3, registrations: 64, status: 'Active' },
  { name: 'Market Square', city: 'Leeds', admins: 2, registrations: 42, status: 'Active' },
  { name: 'Station Yard', city: 'York', admins: 1, registrations: 20, status: 'Attention' },
];

const users = [
  { name: 'Maya Bennett', email: 'maya@riverside.example', role: 'Venue admin', venue: 'Riverside Hall' },
  { name: 'Tom Walker', email: 'tom@market.example', role: 'Venue admin', venue: 'Market Square' },
  { name: 'Sam Patel', email: 'sam@movemate.example', role: 'Super admin', venue: 'All venues' },
];

const tabs = [
  { id: 'operations', label: 'Operations' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'super-admin', label: 'Super Admin' },
];

const MetricCard = ({ label, value, detail, tone = 'blue' }) => (
  <article className={`admin-preview-metric admin-preview-metric-${tone}`}>
    <p>{label}</p>
    <strong>{value}</strong>
    <span>{detail}</span>
  </article>
);

const Status = ({ children }) => (
  <span className={`admin-preview-status admin-preview-status-${children.toLowerCase().replace(' ', '-')}`}>
    {children}
  </span>
);

const OperationsDashboard = () => (
  <section className="admin-preview-page" aria-labelledby="operations-title">
    <div className="admin-preview-page-heading">
      <div>
        <p className="admin-preview-eyebrow">Venue operations</p>
        <h2 id="operations-title">Today's parking activity</h2>
        <p>Monitor registrations and vehicle-move alerts across your venues.</p>
      </div>
      <label className="admin-preview-field">
        <span>Venue</span>
        <select defaultValue="all" disabled aria-label="Selected venue">
          <option value="all">All venues</option>
        </select>
      </label>
    </div>

    <div className="admin-preview-metrics">
      <MetricCard label="Active registrations" value="126" detail="18 more than yesterday" />
      <MetricCard label="Open move alerts" value="8" detail="3 require attention" tone="orange" />
      <MetricCard label="Average resolution" value="5m 42s" detail="42 seconds faster" tone="green" />
      <MetricCard label="Delivery success" value="98.4%" detail="Notifications delivered" tone="teal" />
    </div>

    <div className="admin-preview-panel">
      <div className="admin-preview-panel-heading">
        <div>
          <h3>Vehicle move alerts</h3>
          <p>Most recent activity from the local preview dataset.</p>
        </div>
        <span className="admin-preview-read-only">Read only</span>
      </div>
      <div className="admin-preview-table-wrap">
        <table className="admin-preview-table">
          <thead>
            <tr><th>Registration</th><th>Venue</th><th>Parked</th><th>Alert status</th><th>Age</th></tr>
          </thead>
          <tbody>
            {operations.map((item) => (
              <tr key={item.registration}>
                <td><strong>{item.registration}</strong></td>
                <td>{item.venue}</td>
                <td>{item.parked}</td>
                <td><Status>{item.status}</Status></td>
                <td>{item.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const AnalyticsDashboard = () => (
  <section className="admin-preview-page" aria-labelledby="analytics-title">
    <div className="admin-preview-page-heading">
      <div>
        <p className="admin-preview-eyebrow">Performance</p>
        <h2 id="analytics-title">Venue analytics</h2>
        <p>Read-only weekly performance across all active locations.</p>
      </div>
      <div className="admin-preview-date-range">Last 7 days</div>
    </div>

    <div className="admin-preview-metrics">
      <MetricCard label="Registrations" value="742" detail="12.6% from last week" />
      <MetricCard label="Notifications sent" value="86" detail="84 delivered successfully" tone="orange" />
      <MetricCard label="Vehicles moved" value="71" detail="82.6% response rate" tone="green" />
      <MetricCard label="Peak period" value="12:00" detail="Friday lunchtime" tone="teal" />
    </div>

    <div className="admin-preview-analytics-grid">
      <div className="admin-preview-panel admin-preview-chart-panel">
        <div className="admin-preview-panel-heading">
          <div><h3>Daily registrations</h3><p>Number of validated vehicles.</p></div>
          <strong className="admin-preview-trend">+12.6%</strong>
        </div>
        <div className="admin-preview-chart" role="img" aria-label="Bar chart of daily registrations rising from Monday to Friday">
          {[58, 72, 64, 91, 118, 102, 83].map((value, index) => (
            <div className="admin-preview-bar-column" key={value}>
              <span>{value}</span>
              <i style={{ height: `${Math.round(value / 1.18)}%` }} />
              <b>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-preview-panel">
        <div className="admin-preview-panel-heading"><div><h3>Top venues</h3><p>Registrations this week.</p></div></div>
        <ol className="admin-preview-rankings">
          {venueOverview.map((venue, index) => (
            <li key={venue.name}>
              <span>{index + 1}</span><div><strong>{venue.name}</strong><small>{venue.city}</small></div><b>{venue.registrations}</b>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

const SuperAdminDashboard = () => (
  <section className="admin-preview-page" aria-labelledby="super-admin-title">
    <div className="admin-preview-page-heading">
      <div>
        <p className="admin-preview-eyebrow">System administration</p>
        <h2 id="super-admin-title">Network overview</h2>
        <p>Manage venues and administrator access in the live product.</p>
      </div>
      <button type="button" disabled className="admin-preview-disabled-button">Add venue</button>
    </div>

    <div className="admin-preview-metrics">
      <MetricCard label="Active venues" value="18" detail="2 added this month" />
      <MetricCard label="Venue admins" value="27" detail="All accounts verified" tone="teal" />
      <MetricCard label="Open invitations" value="4" detail="Expire within 7 days" tone="orange" />
      <MetricCard label="Platform health" value="99.98%" detail="Last 30 days" tone="green" />
    </div>

    <div className="admin-preview-super-grid">
      <div className="admin-preview-panel">
        <div className="admin-preview-panel-heading"><div><h3>Venue estate</h3><p>Current operating state.</p></div><span className="admin-preview-read-only">Read only</span></div>
        <div className="admin-preview-venue-list">
          {venueOverview.map((venue) => (
            <article key={venue.name}>
              <div><strong>{venue.name}</strong><span>{venue.city} · {venue.admins} admins</span></div>
              <div><b>{venue.registrations}</b><small>active</small></div><Status>{venue.status}</Status>
            </article>
          ))}
        </div>
      </div>
      <div className="admin-preview-panel">
        <div className="admin-preview-panel-heading"><div><h3>Administrator access</h3><p>Latest assigned roles.</p></div></div>
        <ul className="admin-preview-user-list">
          {users.map((user) => <li key={user.email}><div className="admin-preview-avatar">{user.name.split(' ').map((part) => part[0]).join('')}</div><div><strong>{user.name}</strong><span>{user.role} · {user.venue}</span></div></li>)}
        </ul>
      </div>
    </div>
  </section>
);

const AdminPreview = () => {
  const [activeTab, setActiveTab] = useState('operations');

  return (
    <main className="admin-preview">
      <header className="admin-preview-header">
        <div className="admin-preview-brand"><span>MM</span><div><strong>MoveMate</strong><small>Admin preview</small></div></div>
        <div className="admin-preview-session"><span className="admin-preview-live-dot" />Local read-only data</div>
      </header>
      <div className="admin-preview-shell">
        <nav className="admin-preview-nav" aria-label="Admin preview sections">
          <p>Workspace</p>
          {tabs.map((tab) => <button key={tab.id} type="button" className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          <div className="admin-preview-nav-note"><strong>Preview mode</strong><span>No admin changes can be made from this screen.</span></div>
        </nav>
        <div className="admin-preview-content">
          <div className="admin-preview-content-header"><div><strong>Monday, 28 July</strong><span>Data refreshed 09:30 BST</span></div><span className="admin-preview-read-only">Local preview</span></div>
          {activeTab === 'operations' && <OperationsDashboard />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'super-admin' && <SuperAdminDashboard />}
        </div>
      </div>
    </main>
  );
};

export default AdminPreview;
