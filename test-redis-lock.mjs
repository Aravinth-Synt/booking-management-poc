/**
 * Self-contained test for the room reservation locking logic.
 * Uses an in-memory Redis mock — no external Redis required.
 * Run with: node test-redis-lock.mjs
 */

// ─── In-memory Redis mock (GET / SET NX EX / DEL / TTL) ─────────────────────

const store = new Map(); // key → { value, expiresAt }

const redis = {
  async get(key) {
    const e = store.get(key);
    if (!e) return null;
    if (e.expiresAt && Date.now() > e.expiresAt) { store.delete(key); return null; }
    return e.value;
  },
  async set(key, value, ...args) {
    let ttl = null, nx = false;
    for (let i = 0; i < args.length; i++) {
      if (String(args[i]).toUpperCase() === 'EX') ttl = Number(args[++i]);
      if (String(args[i]).toUpperCase() === 'NX') nx = true;
    }
    if (nx) {
      const existing = store.get(key);
      if (existing && (!existing.expiresAt || Date.now() < existing.expiresAt)) return null;
    }
    store.set(key, { value, expiresAt: ttl ? Date.now() + ttl * 1000 : null });
    return 'OK';
  },
  async del(key) { store.delete(key); return 1; },
  async ttl(key) {
    const e = store.get(key);
    if (!e) return -2;
    if (!e.expiresAt) return -1;
    return Math.max(0, Math.floor((e.expiresAt - Date.now()) / 1000));
  },
};

// ─── Room lock logic (mirrors lib/redis/roomLock.ts) ────────────────────────

const LOCK_TTL = 600;
const LOCK_KEY = (id) => `room:lock:${id}`;

function makeLock(roomId, sessionId, checkIn, checkOut, guestName) {
  return {
    roomId, sessionId,
    lockedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + LOCK_TTL * 1000).toISOString(),
    guestName, checkIn, checkOut,
  };
}

function datesOverlap(aIn, aOut, bIn, bOut) {
  return new Date(aIn) < new Date(bOut) && new Date(bIn) < new Date(aOut);
}

async function acquireRoomLock(roomId, sessionId, checkIn, checkOut, guestName) {
  const lock = makeLock(roomId, sessionId, checkIn, checkOut, guestName);
  const result = await redis.set(LOCK_KEY(roomId), JSON.stringify(lock), 'EX', LOCK_TTL, 'NX');
  if (result === 'OK') return { success: true, lock, expiresAt: lock.expiresAt };
  const raw = await redis.get(LOCK_KEY(roomId));
  const existing = raw ? JSON.parse(raw) : lock;
  return { success: false, lock: existing, expiresAt: existing.expiresAt };
}

async function getRoomLockStatus(roomId, checkIn, checkOut) {
  const raw = await redis.get(LOCK_KEY(roomId));
  if (!raw) return { status: 'available' };
  const lock = JSON.parse(raw);
  const secondsRemaining = Math.max(0, Math.floor((new Date(lock.expiresAt) - Date.now()) / 1000));
  let dateConflict;
  if (checkIn && checkOut && lock.checkIn && lock.checkOut) {
    dateConflict = datesOverlap(checkIn, checkOut, lock.checkIn, lock.checkOut);
  }
  return { status: 'locked', lock, secondsRemaining, dateConflict };
}

async function releaseRoomLock(roomId, sessionId) {
  const raw = await redis.get(LOCK_KEY(roomId));
  if (!raw) return true;
  const lock = JSON.parse(raw);
  if (lock.sessionId !== sessionId) throw new Error('Not your lock');
  await redis.del(LOCK_KEY(roomId));
  return true;
}

// ─── What the rooms API / RoomCard would show ────────────────────────────────

function roomDisplay(lockStatusResponse) {
  const { status, dateConflict } = lockStatusResponse;
  const effectiveLock = status === 'locked' && dateConflict !== false;
  if (status !== 'locked') return '🟢 View Room →  (available)';
  if (!effectiveLock)      return '🟢 View Room →  (lock exists but dates are free)';
  if (dateConflict === true) return '🔴 Not Available';
  return '🟠 Checkout in Progress';
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let pass = 0, fail = 0;

function check(label, condition, got) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    pass++;
  } else {
    console.log(`  ✗  ${label}  ← got: ${JSON.stringify(got)}`);
    fail++;
  }
}

async function run() {
  const ROOM = 'room-001';
  const A = 'session-A';
  const B = 'session-B';
  let s, r;

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(' LondonStay — Redis Reservation Lock Test Suite');
  console.log('══════════════════════════════════════════════════════════');

  // ── 1. Initial state ───────────────────────────────────────────────────────
  console.log('\n[ 1 ] Room starts available');
  s = await getRoomLockStatus(ROOM, '2026-12-10', '2026-12-15');
  check('status = available', s.status === 'available', s.status);
  console.log(`      UI: ${roomDisplay(s)}`);

  // ── 2. User A acquires lock ────────────────────────────────────────────────
  console.log('\n[ 2 ] User A reserves room for Dec 10–15');
  r = await acquireRoomLock(ROOM, A, '2026-12-10', '2026-12-15', 'Alice');
  check('lock acquired (success = true)', r.success === true, r.success);
  check('sessionId = session-A', r.lock.sessionId === A, r.lock.sessionId);
  check('checkIn stored in lock', r.lock.checkIn === '2026-12-10', r.lock.checkIn);
  check('checkOut stored in lock', r.lock.checkOut === '2026-12-15', r.lock.checkOut);
  check('expiresAt ~10 min from now',
    new Date(r.expiresAt).getTime() > Date.now() + 590_000, r.expiresAt);
  const ttl = await redis.ttl(LOCK_KEY(ROOM));
  check(`TTL set in Redis (~600s, got ${ttl}s)`, ttl > 590 && ttl <= 600, ttl);

  // ── 3. User B tries to grab same lock ─────────────────────────────────────
  console.log('\n[ 3 ] User B tries to reserve same room (conflict)');
  r = await acquireRoomLock(ROOM, B, '2026-12-10', '2026-12-15', 'Bob');
  check('second acquire fails (success = false)', r.success === false, r.success);
  check('returns existing lock owner (session-A)', r.lock.sessionId === A, r.lock.sessionId);

  // ── 4. Scenario A — same dates ────────────────────────────────────────────
  console.log('\n[ 4 ] Scenario A: User B queries /rooms with SAME dates (Dec 10–15)');
  s = await getRoomLockStatus(ROOM, '2026-12-10', '2026-12-15');
  check('status = locked', s.status === 'locked', s.status);
  check('dateConflict = true', s.dateConflict === true, s.dateConflict);
  check('effectiveLock = true (room blocked)', s.status === 'locked' && s.dateConflict !== false, null);
  console.log(`      UI: ${roomDisplay(s)}`);

  // ── 5. Overlapping dates ───────────────────────────────────────────────────
  console.log('\n[ 5 ] User B queries with OVERLAPPING dates (Dec 12–17)');
  s = await getRoomLockStatus(ROOM, '2026-12-12', '2026-12-17');
  check('status = locked', s.status === 'locked', s.status);
  check('dateConflict = true (Dec 12-17 overlaps Dec 10-15)', s.dateConflict === true, s.dateConflict);
  console.log(`      UI: ${roomDisplay(s)}`);

  // ── 6. Non-overlapping dates ───────────────────────────────────────────────
  console.log('\n[ 6 ] User B queries with NON-OVERLAPPING dates (Dec 20–25)');
  s = await getRoomLockStatus(ROOM, '2026-12-20', '2026-12-25');
  check('status = locked (lock still exists)', s.status === 'locked', s.status);
  check('dateConflict = false (Dec 20-25 does not overlap Dec 10-15)', s.dateConflict === false, s.dateConflict);
  check('effectiveLock = false (room is bookable for these dates)',
    !(s.status === 'locked' && s.dateConflict !== false), null);
  console.log(`      UI: ${roomDisplay(s)}`);

  // ── 7. No dates selected ──────────────────────────────────────────────────
  console.log('\n[ 7 ] User B queries with NO dates selected');
  s = await getRoomLockStatus(ROOM);
  check('status = locked', s.status === 'locked', s.status);
  check('dateConflict = undefined (nothing to compare)', s.dateConflict === undefined, s.dateConflict);
  check('effectiveLock = true (show Checkout in Progress)',
    s.status === 'locked' && s.dateConflict !== false, null);
  console.log(`      UI: ${roomDisplay(s)}`);

  // ── 8. Adjacent dates (check-in = lock checkout) ──────────────────────────
  console.log('\n[ 8 ] Edge case: adjacent dates (Dec 15–20, starts when lock ends)');
  s = await getRoomLockStatus(ROOM, '2026-12-15', '2026-12-20');
  check('dateConflict = false (adjacent = no overlap)', s.dateConflict === false, s.dateConflict);
  console.log(`      UI: ${roomDisplay(s)}`);

  // ── 9. Wrong session cannot release ───────────────────────────────────────
  console.log('\n[ 9 ] User B tries to release User A\'s lock');
  try {
    await releaseRoomLock(ROOM, B);
    check('Should have thrown "Not your lock"', false, 'no error thrown');
  } catch (e) {
    check('Throws "Not your lock"', e.message === 'Not your lock', e.message);
  }

  // ── 10. Correct session releases ──────────────────────────────────────────
  console.log('\n[ 10 ] User A releases the lock');
  const released = await releaseRoomLock(ROOM, A);
  check('Release succeeds', released === true, released);
  s = await getRoomLockStatus(ROOM, '2026-12-10', '2026-12-15');
  check('Room is available again', s.status === 'available', s.status);
  console.log(`       UI: ${roomDisplay(s)}`);

  // ── 11. Lock is idempotent on re-acquire ──────────────────────────────────
  console.log('\n[ 11 ] User B can now acquire the room (lock was released)');
  r = await acquireRoomLock(ROOM, B, '2026-12-10', '2026-12-15', 'Bob');
  check('User B acquires lock successfully', r.success === true, r.success);
  check('sessionId = session-B', r.lock.sessionId === B, r.lock.sessionId);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(` Results: ${pass} passed, ${fail} failed`);
  console.log('══════════════════════════════════════════════════════════\n');
  if (fail > 0) process.exit(1);
}

run().catch(console.error);
