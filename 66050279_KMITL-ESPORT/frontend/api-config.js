/**
 * API Config — Supabase Direct Connection
 * Data → Supabase | Auth → Express backend (port 8080)
 */

// ── Always define API_BASE_URL first (pages depend on this) ─────────────────
const _isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = _isLocal
    ? `http://${window.location.hostname}:8080`
    : window.location.origin;

// ── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://obkldhyqftfmlskyxkaq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_tEA5Tb6qtp8llFbSvHcaPg_0TPmsH8k';

// ── Init Supabase client (safe — won't crash if CDN not loaded yet) ──────────
let _sb = null;
try {
    if (window.supabase && window.supabase.createClient) {
        _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Supabase] ✅ client ready');
    } else {
        console.error('[Supabase] ❌ CDN not loaded — window.supabase is undefined');
    }
} catch (e) {
    console.error('[Supabase] ❌ createClient failed:', e);
}

// ── Mock Response helper ─────────────────────────────────────────────────────
function _mockRes(data, status) {
    status = status || 200;
    return {
        ok: status >= 200 && status < 300,
        status: status,
        json: function() { return Promise.resolve(data); },
        text: function() { return Promise.resolve(JSON.stringify(data)); },
    };
}

// ── Auth via Supabase ────────────────────────────────────────────────────────
async function _sbLogin(body) {
    var identifier = (body && (body.identifier || body.username || body.email)) || '';
    var password   = String((body && body.password) || '');

    // Find user by username or email
    var q = _sb.from('User').select('*');
    q = identifier.includes('@') ? q.eq('email', identifier) : q.eq('username', identifier);
    var { data: user, error } = await q.maybeSingle();

    if (error) return _mockRes({ message: 'DB error: ' + error.message, error: error.message }, 500);
    if (!user)  return _mockRes({ message: 'ไม่พบผู้ใช้งาน', error: 'ไม่พบผู้ใช้งาน' }, 401);

    // Compare password directly (plain-text stored in DB)
    if (String(user.password) !== password) {
        return _mockRes({ message: 'รหัสผ่านไม่ถูกต้อง', error: 'รหัสผ่านไม่ถูกต้อง' }, 401);
    }

    // Build a simple session token (base64 of user info)
    var token = btoa(JSON.stringify({ user_id: user.user_id, role: user.role, ts: Date.now() }));

    var userInfo = { user_id: user.user_id, username: user.username, email: user.email, role: user.role };
    localStorage.setItem('user',  JSON.stringify(userInfo));
    localStorage.setItem('token', token);

    var redirect = (user.role || '').toLowerCase() === 'admin'
        ? '../Admin/Dashboard Page 8/Dashboard_8.html'
        : (user.role || '').toLowerCase() === 'viewer'
            ? '../Viewer/Tournament Page 17/tournament_17.html'
            : '../User/Tournament List Page 1/userlogin_1.html';

    return _mockRes({ message: 'Login successful', user: userInfo, token: token, redirectUrl: redirect });
}

async function _sbRegister(body) {
    var username = (body && body.username) || '';
    var email    = (body && body.email) || '';
    var password = (body && body.password) || '';
    var role     = (body && body.role) || 'User';

    // Check duplicate username
    var { data: existing } = await _sb.from('User').select('user_id').eq('username', username).maybeSingle();
    if (existing) return _mockRes({ message: 'Username already exists', error: 'Username already exists' }, 400);

    var { error } = await _sb.from('User').insert({
        username: username,
        email: email,
        password: password,
        role: role
    });

    if (error) return _mockRes({ message: error.message, error: error.message }, 400);
    return _mockRes({ message: 'สมัครสมาชิกสำเร็จ' });
}

// ── Supabase router ──────────────────────────────────────────────────────────
async function _sbRoute(path, method, body) {
    const sb = _sb;
    if (!sb) throw new Error('Supabase client not initialized');

    console.log('[Supabase]', method, path);

    // GET /tournaments
    if (path === '/tournaments' && method === 'GET') {
        const { data, error } = await sb
            .from('Tournament')
            .select('*, Application(count)')
            .order('start_date', { ascending: true });
        console.log('[Supabase] /tournaments →', { count: data && data.length, error: error && error.message });
        if (error) return _mockRes({ message: error.message }, 500);
        var mapped = (data || []).map(function(t) {
            return Object.assign({}, t, { _count: { applications: (t.Application && t.Application[0] && t.Application[0].count) || 0 } });
        });
        return _mockRes(mapped);
    }

    // GET /matches (all matches with tournament info)
    if (path === '/matches' && method === 'GET') {
        const { data: matches, error } = await sb.from('Match').select('*, Tournament(tournament_name, tournament_banner)').order('match_id');
        if (error) return _mockRes({ message: error.message }, 500);
        
        // Fetch teams to get banners
        const teamNames = new Set();
        (matches || []).forEach(m => {
            if (m.team1_name) teamNames.add(m.team1_name);
            if (m.team2_name) teamNames.add(m.team2_name);
        });
        
        if (teamNames.size > 0) {
            const { data: teams } = await sb.from('Team').select('team_name, team_banner_url').in('team_name', Array.from(teamNames));
            const teamMap = {};
            (teams || []).forEach(t => teamMap[t.team_name] = t.team_banner_url);
            matches.forEach(m => {
                m.team1_banner_url = teamMap[m.team1_name] || null;
                m.team2_banner_url = teamMap[m.team2_name] || null;
            });
        }
        
        return _mockRes(matches || []);
    }

    // GET /tournaments/:id/matches
    var matchesM = path.match(/^\/tournaments\/(\d+)\/matches$/);
    if (matchesM && method === 'GET') {
        var tid = parseInt(matchesM[1]);
        const { data: matches, error } = await sb.from('Match').select('*').eq('tournament_id', tid).order('round').order('position');
        if (error) return _mockRes({ message: error.message }, 500);
        
        // Fetch teams to get banners
        const teamNames = new Set();
        (matches || []).forEach(m => {
            if (m.team1_name) teamNames.add(m.team1_name);
            if (m.team2_name) teamNames.add(m.team2_name);
        });
        
        if (teamNames.size > 0) {
            const { data: teams } = await sb.from('Team').select('team_name, team_banner_url').in('team_name', Array.from(teamNames));
            const teamMap = {};
            (teams || []).forEach(t => teamMap[t.team_name] = t.team_banner_url);
            matches.forEach(m => {
                m.team1_banner_url = teamMap[m.team1_name] || null;
                m.team2_banner_url = teamMap[m.team2_name] || null;
            });
        }
        
        return _mockRes(matches || []);
    }

    // POST /tournaments/:id/matches/save
    var matchesSaveM = path.match(/^\/tournaments\/(\d+)\/matches\/save$/);
    if (matchesSaveM && method === 'POST') {
        var tid = parseInt(matchesSaveM[1]);
        var matches = (body && body.matches) || [];
        if (!matches.length) return _mockRes({ message: 'No matches provided' }, 400);

        // Delete existing matches for this tournament then re-insert
        const { error: delError } = await sb.from('Match').delete().eq('tournament_id', tid);
        if (delError) return _mockRes({ message: delError.message }, 500);

        function toInt(v) {
            if (v === null || v === undefined) return null;
            if (Array.isArray(v)) return v.length > 0 && v[0] !== null ? parseInt(v[0]) : null;
            const n = parseInt(v);
            return isNaN(n) ? null : n;
        }

        const rows = matches.map(function(m) {
            // score might be an array [s1,s2] if bracket callback passes the pair instead of individual value
            const s1 = Array.isArray(m.score1) ? m.score1[0] : m.score1;
            const s2 = Array.isArray(m.score2) ? m.score2[1] : m.score2;
            return {
                tournament_id: tid,
                team1_name: m.team1_name || null,
                team2_name: m.team2_name || null,
                round: m.round,
                position: m.position,
                score1: toInt(s1),
                score2: toInt(s2)
            };
        });

        const { error: insError } = await sb.from('Match').insert(rows);
        if (insError) return _mockRes({ message: insError.message }, 500);
        return _mockRes({ message: 'Saved successfully', count: rows.length });
    }

    // GET /tournaments/:id  OR  PUT/DELETE /tournaments/:id
    var tournM = path.match(/^\/tournaments\/(\d+)$/);
    if (tournM) {
        var id = parseInt(tournM[1]);
        if (method === 'GET') {
            const { data, error } = await sb.from('Tournament').select('*, Application(*, Team(*))').eq('tournament_id', id).single();
            if (error) return _mockRes({ message: 'Tournament not found' }, 404);
            return _mockRes(data);
        }
        if (method === 'PUT') {
            const { data, error } = await sb.from('Tournament').update(body).eq('tournament_id', id).select().single();
            if (error) return _mockRes({ message: error.message }, 500);
            return _mockRes(data);
        }
        if (method === 'DELETE') {
            const { error } = await sb.from('Tournament').delete().eq('tournament_id', id);
            if (error) return _mockRes({ message: error.message }, 500);
            return _mockRes({ message: 'Deleted' });
        }
    }

    // POST /tournaments
    if (path === '/tournaments' && method === 'POST') {
        const { data, error } = await sb.from('Tournament').insert(body).select().single();
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data, 201);
    }

    // Teams
    var teamM = path.match(/^\/teams\/(\d+)$/);
    if (path === '/teams' && method === 'GET') {
        const { data, error } = await sb.from('Team').select('*').order('team_id');
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data || []);
    }
    if (teamM) {
        var teamId = parseInt(teamM[1]);
        if (method === 'GET') {
            const { data, error } = await sb.from('Team').select('*, applications:Application(*, tournament:Tournament(*))').eq('team_id', teamId).single();
            if (error) return _mockRes({ message: 'Team not found' }, 404);
            return _mockRes(data);
        }
        if (method === 'PATCH') {
            const { data, error } = await sb.from('Team').update(body).eq('team_id', teamId).select().single();
            if (error) return _mockRes({ message: error.message }, 500);
            return _mockRes(data);
        }
        if (method === 'DELETE') {
            // Delete related applications first to avoid FK constraint
            const { error: appErr } = await sb.from('Application').delete().eq('team_id', teamId);
            if (appErr) return _mockRes({ error: appErr.message }, 500);
            const { error } = await sb.from('Team').delete().eq('team_id', teamId);
            if (error) return _mockRes({ error: error.message }, 500);
            return _mockRes({ message: 'Deleted' });
        }
    }
    if (path === '/teams' && method === 'POST') {
        const { data, error } = await sb.from('Team').insert(body).select().single();
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data, 201);
    }

    // Applications
    var appStatusM = path.match(/^\/applications\/(\d+)\/status$/);
    if (appStatusM && method === 'PATCH') {
        const { data, error } = await sb.from('Application').update({ status: body.status }).eq('app_id', parseInt(appStatusM[1])).select().single();
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data);
    }
    if (path.startsWith('/applications') && method === 'GET') {
        var teamIdParam = new URLSearchParams((path.split('?')[1]) || '').get('team_id');
        var q = sb.from('Application').select('*, Tournament(*), Team(*)');
        if (teamIdParam) q = q.eq('team_id', parseInt(teamIdParam));
        const { data, error } = await q;
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data || []);
    }
    if (path === '/applications' && method === 'POST') {
        const { data, error } = await sb.from('Application').insert(body).select().single();
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data, 201);
    }

    // Users
    if (path === '/users' && method === 'GET') {
        const { data, error } = await sb.from('User').select('user_id, username, email, role');
        if (error) return _mockRes({ message: error.message }, 500);
        return _mockRes(data || []);
    }

    return _mockRes({ message: 'Route not found: ' + method + ' ' + path }, 404);
}

// ── Override window.fetch ────────────────────────────────────────────────────
var _origFetch = window.fetch.bind(window);
window.fetch = async function(input, init) {
    init = init || {};
    var url = String(input);

    // Only intercept our backend calls
    if (!url.startsWith(API_BASE_URL)) return _origFetch(input, init);

    var path = url.slice(API_BASE_URL.length);
    var method = (init.method || 'GET').toUpperCase();
    var body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch(e) {}

    // Auth → handle in Supabase
    if (path === '/login' || path === '/api/auth/login') {
        return _sbLogin(body);
    }
    if (path === '/register' || path === '/api/auth/register') {
        return _sbRegister(body);
    }
    // Other auth paths → backend
    if (path.startsWith('/api/auth')) return _origFetch(input, init);

    // No Supabase client → fall back to backend
    if (!_sb) {
        console.warn('[Supabase] No client — falling back to backend for:', path);
        return _origFetch(input, init);
    }

    return _sbRoute(path, method, body).catch(function(err) {
        console.error('[Supabase route error]', err);
        return _mockRes({ message: 'Supabase error: ' + err.message }, 500);
    });
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL };
}
