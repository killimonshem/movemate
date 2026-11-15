const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

const FUNCTIONS_DIR = path.join(__dirname, '..', 'supabase', 'functions');

function loadEdgeFunction(name, { env = {}, createClientImpl, fetchImpl } = {}) {
  const filePath = path.join(FUNCTIONS_DIR, name, 'index.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  let registeredHandler = null;
  const envMap = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-key',
    ADMIN_SESSION_SECRET: 'test-admin-session-secret',
    ...env,
  };

  const sandbox = {
    exports: {},
    module: { exports: {} },
    console: { log() {}, warn() {}, error() {} },
    crypto: crypto.webcrypto,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    Request,
    Response,
    Intl,
    Date,
    btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
    fetch:
      fetchImpl ||
      (async () => {
        throw new Error('Unexpected fetch call in test');
      }),
    Deno: {
      env: {
        get: (key) => (Object.prototype.hasOwnProperty.call(envMap, key) ? envMap[key] : undefined),
      },
    },
    require: (id) => {
      if (id.includes('http/server.ts')) {
        return {
          serve: (fn) => {
            registeredHandler = fn;
          },
        };
      }
      if (id.includes('@supabase/supabase-js')) {
        return {
          createClient: createClientImpl || (() => {
            throw new Error('createClient not mocked');
          }),
        };
      }
      throw new Error(`Unsupported import in test harness: ${id}`);
    },
  };

  vm.runInNewContext(compiled.outputText, sandbox, { filename: filePath });
  assert.equal(typeof registeredHandler, 'function', `Expected serve() handler for ${name}`);
  return registeredHandler;
}

describe('Supabase Edge Functions', () => {
  it('admin-auth: authenticates legacy SHA-256, upgrades to salted PBKDF2, omits password_hash, and signs token', async () => {
    const legacyHash = crypto.createHash('sha256').update('secret-pass').digest('hex');
    const adminRow = {
      id: 7,
      username: 'alice',
      email: 'alice@example.com',
      password_hash: legacyHash,
      created_at: '2026-01-01T00:00:00Z',
    };
    const clientCalls = [];

    const createClientMock = (url, key, options) => {
      clientCalls.push({ url, key, options });
      return {
        from(table) {
          assert.equal(table, 'super_admins');
          return {
            select() {
              return {
                eq(col, val) {
                  assert.equal(col, 'username');
                  return {
                    maybeSingle: async () => ({
                      data: val === adminRow.username ? { ...adminRow } : null,
                      error: null,
                    }),
                  };
                },
              };
            },
            update(patch) {
              return {
                eq: async (_col, id) => {
                  if (id === adminRow.id && patch.password_hash) {
                    adminRow.password_hash = patch.password_hash;
                  }
                  return { error: null };
                },
              };
            },
          };
        },
      };
    };

    const handler = loadEdgeFunction('admin-auth', { createClientImpl: createClientMock });

    // Method enforcement
    const getRes = await handler(new Request('https://fn.test/admin-auth', { method: 'GET' }));
    assert.equal(getRes.status, 405);

    // Login with legacy SHA-256 triggers upgrade to PBKDF2
    const res1 = await handler(
      new Request('https://fn.test/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer anon-token' },
        body: JSON.stringify({ username: 'alice', password: 'secret-pass' }),
      })
    );
    assert.equal(res1.status, 200);
    // Must not forward caller anon Authorization override
    assert.equal(clientCalls[0].key, 'service-role-secret-key');
    assert.equal(clientCalls[0].options, undefined);

    const payload1 = await res1.json();
    assert.equal(payload1.success, true);
    assert.equal(payload1.admin.username, 'alice');
    assert.equal(payload1.admin.password_hash, undefined);
    assert.ok(payload1.token && payload1.token.includes('.'));
    assert.ok(payload1.expiresAt > Date.now());
    assert.ok(adminRow.password_hash.startsWith('pbkdf2$100000$'));

    // Second login verifies the upgraded PBKDF2 hash directly
    const res2 = await handler(
      new Request('https://fn.test/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'secret-pass' }),
      })
    );
    assert.equal(res2.status, 200);

    // Wrong password rejected with 401
    const badRes = await handler(
      new Request('https://fn.test/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'wrong' }),
      })
    );
    assert.equal(badRes.status, 401);
  });

  it('fetch-registrations: enforces signed x-admin-token and preserves venue_id === 0 and vehicle_data', async () => {
    const legacyHash = crypto.createHash('sha256').update('pw').digest('hex');
    const authHandler = loadEdgeFunction('admin-auth', {
      createClientImpl: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 1, username: 'admin', email: 'a@b.c', password_hash: legacyHash },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }),
      }),
    });

    const authRes = await authHandler(
      new Request('https://fn.test/admin-auth', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'pw' }),
      })
    );
    const { token } = await authRes.json();

    const rows = [
      {
        id: 10,
        reg: 'AB12CDE',
        phone: '+447123456789',
        venue_id: 0,
        vehicle_data: { make: 'BMW', colour: 'BLACK' },
        created_at: null,
        consent_timestamp: '2026-11-15T10:00:00Z',
      },
    ];
    let capturedVenueFilter = null;

    const regHandler = loadEdgeFunction('fetch-registrations', {
      createClientImpl: () => ({
        from: () => {
          const query = {
            select: () => query,
            order: () => query,
            eq: (_col, val) => {
              capturedVenueFilter = val;
              return query;
            },
            then: (resolve) => resolve({ data: rows, error: null }),
          };
          return query;
        },
      }),
    });

    const unauth = await regHandler(new Request('https://fn.test/fetch-registrations'));
    assert.equal(unauth.status, 401);

    const forged = await regHandler(
      new Request('https://fn.test/fetch-registrations', {
        headers: { 'x-admin-token': `${token}tampered` },
      })
    );
    assert.equal(forged.status, 401);

    const okRes = await regHandler(
      new Request('https://fn.test/fetch-registrations?venue_id=0', {
        headers: { 'x-admin-token': token },
      })
    );
    assert.equal(okRes.status, 200);
    assert.equal(capturedVenueFilter, '0');
    const body = await okRes.json();
    assert.deepEqual(body.data[0], {
      id: 10,
      reg: 'AB12CDE',
      phone: '+447123456789',
      venue_id: 0,
      vehicle_data: { make: 'BMW', colour: 'BLACK' },
      created_at: null,
      consent_timestamp: '2026-11-15T10:00:00Z',
    });
  });

  it('fetch-venues: enforces GET and masks DB errors cleanly', async () => {
    let fail = false;
    const venuesHandler = loadEdgeFunction('fetch-venues', {
      createClientImpl: () => ({
        from: () => ({
          select: () => ({
            order: async () =>
              fail
                ? { data: null, error: { message: 'secret schema details' } }
                : { data: [{ id: 1, name: 'Arena' }], error: null },
          }),
        }),
      }),
    });

    const postRes = await venuesHandler(new Request('https://fn.test/fetch-venues', { method: 'POST' }));
    assert.equal(postRes.status, 405);

    const okRes = await venuesHandler(new Request('https://fn.test/fetch-venues'));
    assert.equal(okRes.status, 200);
    assert.deepEqual(await okRes.json(), { data: [{ id: 1, name: 'Arena' }] });

    fail = true;
    const errRes = await venuesHandler(new Request('https://fn.test/fetch-venues'));
    assert.equal(errRes.status, 500);
    assert.deepEqual(await errRes.json(), { error: 'Failed to fetch venues' });
  });

  it('register-vehicle: validates input, uses UK day bounds, maps 23505 to 409, and sends Twilio SMS server-side', async () => {
    let insertedRows = [];
    let simulateRaceConflict = false;
    let twilioCalls = 0;

    const handler = loadEdgeFunction('register-vehicle', {
      env: {
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'auth-tok',
        TWILIO_FROM_NUMBER: '+447700900000',
      },
      fetchImpl: async (url) => {
        if (url.includes('api.twilio.com')) {
          twilioCalls += 1;
          return new Response(JSON.stringify({ sid: 'SM123' }), { status: 201 });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      },
      createClientImpl: () => ({
        from(table) {
          if (table === 'venues') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { name: 'South Hall' }, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lt: async () => ({ data: [], error: null }),
                }),
              }),
            }),
            insert(rows) {
              return {
                select: async () => {
                  if (simulateRaceConflict) {
                    return { data: null, error: { code: '23505', message: 'duplicate key' } };
                  }
                  insertedRows.push(...rows);
                  return { data: [{ id: 1, ...rows[0] }], error: null };
                },
              };
            },
          };
        },
      }),
    });

    const badPhone = await handler(
      new Request('https://fn.test/register-vehicle', {
        method: 'POST',
        body: JSON.stringify({ reg: 'AB12CDE', phone: '01234', venue_id: 1 }),
      })
    );
    assert.equal(badPhone.status, 400);

    const okRes = await handler(
      new Request('https://fn.test/register-vehicle', {
        method: 'POST',
        body: JSON.stringify({ reg: ' ab12 cde ', phone: '07123 456789', venue_id: 0 }),
      })
    );
    assert.equal(okRes.status, 200);
    const okBody = await okRes.json();
    assert.equal(okBody.success, true);
    assert.equal(okBody.smsSent, true);
    assert.equal(insertedRows[0].reg, 'AB12CDE');
    assert.equal(insertedRows[0].phone, '+447123456789');
    assert.equal(insertedRows[0].venue_id, 0);
    assert.equal(twilioCalls, 1);

    simulateRaceConflict = true;
    const conflictRes = await handler(
      new Request('https://fn.test/register-vehicle', {
        method: 'POST',
        body: JSON.stringify({ reg: 'AB12CDE', phone: '07123456789', venue_id: 1 }),
      })
    );
    assert.equal(conflictRes.status, 409);
  });

  it('send-sms: requires valid x-admin-token and dispatches Twilio message', async () => {
    const legacyHash = crypto.createHash('sha256').update('pw').digest('hex');
    const authHandler = loadEdgeFunction('admin-auth', {
      createClientImpl: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 1, username: 'admin', email: 'a@b.c', password_hash: legacyHash },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }),
      }),
    });
    const authRes = await authHandler(
      new Request('https://fn.test/admin-auth', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'pw' }),
      })
    );
    const { token } = await authRes.json();

    let sentTo = null;
    const smsHandler = loadEdgeFunction('send-sms', {
      env: {
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_FROM_NUMBER: '+447700900000',
      },
      fetchImpl: async (_url, init) => {
        const params = new URLSearchParams(init.body);
        sentTo = params.get('To');
        return new Response(JSON.stringify({ sid: 'SM999' }), { status: 201 });
      },
    });

    const unauth = await smsHandler(
      new Request('https://fn.test/send-sms', {
        method: 'POST',
        body: JSON.stringify({ phone: '07123456789', message: 'Hello' }),
      })
    );
    assert.equal(unauth.status, 401);

    const ok = await smsHandler(
      new Request('https://fn.test/send-sms', {
        method: 'POST',
        headers: { 'x-admin-token': token },
        body: JSON.stringify({ phone: '07123 456789', message: 'Please move car' }),
      })
    );
    assert.equal(ok.status, 200);
    assert.equal(sentTo, '+447123456789');
  });

  it('send-notification: returns 404 when not registered today and notifies driver on match', async () => {
    let foundReg = null;
    let sentBody = null;

    const handler = loadEdgeFunction('send-notification', {
      env: {
        TWILIO_ACCOUNT_SID: 'AC123',
        TWILIO_AUTH_TOKEN: 'tok',
        TWILIO_FROM_NUMBER: '+447700900000',
      },
      fetchImpl: async (_url, init) => {
        sentBody = new URLSearchParams(init.body).get('Body');
        return new Response(JSON.stringify({ sid: 'SM777' }), { status: 201 });
      },
      createClientImpl: () => ({
        from(table) {
          if (table === 'venues') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { name: 'West Gate' }, error: null }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lt: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({ data: foundReg, error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        },
      }),
    });

    const notFound = await handler(
      new Request('https://fn.test/send-notification', {
        method: 'POST',
        body: JSON.stringify({ blockedReg: 'AB12 CDE' }),
      })
    );
    assert.equal(notFound.status, 404);

    foundReg = { id: 9, reg: 'AB12CDE', phone: '+447999888777', venue_id: 3 };
    const sent = await handler(
      new Request('https://fn.test/send-notification', {
        method: 'POST',
        body: JSON.stringify({ blockedReg: 'AB12 CDE' }),
      })
    );
    assert.equal(sent.status, 200);
    assert.ok(sentBody.includes('AB12CDE'));
    assert.ok(sentBody.includes('West Gate'));
  });
});
