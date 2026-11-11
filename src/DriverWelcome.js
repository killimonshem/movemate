import React from 'react';
import carLight from './assets/welcome/car-light.svg';
import carDark from './assets/welcome/car-dark.svg';
import accentLight from './assets/welcome/car-accent-light.svg';
import accentDark from './assets/welcome/car-accent-dark.svg';
import markLight from './assets/welcome/car-mark-light.svg';
import markDark from './assets/welcome/car-mark-dark.svg';
import pinLight from './assets/welcome/map-pin-light.svg';
import pinDark from './assets/welcome/map-pin-dark.svg';
import './DriverWelcome.css';

const vehicleRows = [
  [
    { plate: 'LK21 XWN', name: 'Grey VW Golf' },
    { plate: 'WR19 KTD', name: 'Black Range Rover', accent: true },
    { plate: 'MA70 PLE', name: 'White Tesla Model 3' },
  ],
  [
    { plate: 'YB68 ZTR', name: 'Red Mini Cooper', accent: true },
    { plate: 'SG22 HNM', name: 'Blue Ford Puma' },
    { plate: 'DE17 OAK', name: 'Silver Toyota Yaris' },
  ],
  [
    { plate: 'GN23 VRL', name: 'Green Kia Niro' },
    { plate: 'BX20 FTY', name: 'Black BMW 3 Series' },
    { plate: 'PL66 MWQ', name: 'White Nissan Leaf', accent: true },
  ],
];

function WelcomeIcon({ light, dark, size }) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={dark} />
      <img src={light} alt="" width={size} height={size} />
    </picture>
  );
}

export default function DriverWelcome({ onNavigate, venueName }) {
  return (
    <main className="driver-welcome" aria-labelledby="driver-welcome-title">
      <header className="driver-welcome__header">
        <button type="button" onClick={() => onNavigate('admin-login')}>Admin</button>
      </header>

      <div className="driver-welcome__collage" aria-hidden="true">
        {vehicleRows.map((row) => (
          <div className="driver-welcome__row" key={row[0].plate}>
            {row.map(({ plate, name, accent }) => (
              <div className={`driver-welcome__car${accent ? ' driver-welcome__car--accent' : ''}`} key={plate}>
                <WelcomeIcon light={accent ? accentLight : carLight} dark={accent ? accentDark : carDark} size={22} />
                <div className="driver-welcome__plate">
                  <span className="driver-welcome__plate-band">UK</span>
                  <span className="driver-welcome__plate-text">{plate}</span>
                </div>
                <span>{name}</span>
              </div>
            ))}
          </div>
        ))}
        <div className="driver-welcome__fade" />
        <div className="driver-welcome__logo">
          <div className="driver-welcome__mark">
            <WelcomeIcon light={markLight} dark={markDark} size={30} />
          </div>
        </div>
      </div>

      <div className="driver-welcome__copy">
        {venueName && (
          <div className="driver-welcome__venue">
            <WelcomeIcon light={pinLight} dark={pinDark} size={14} />
            <span>You’re at {venueName}</span>
          </div>
        )}
        <h1 id="driver-welcome-title">Park once. Leave easy.</h1>
        <p>Add your car for today so staff can text you if you’re blocking someone in. No app, no account.</p>
      </div>

      <div className="driver-welcome__actions">
        <button type="button" onClick={() => onNavigate('driver-register')}>Register my car</button>
        <button type="button" onClick={() => onNavigate('blocked-input')}>I’m blocked in</button>
      </div>
    </main>
  );
}
