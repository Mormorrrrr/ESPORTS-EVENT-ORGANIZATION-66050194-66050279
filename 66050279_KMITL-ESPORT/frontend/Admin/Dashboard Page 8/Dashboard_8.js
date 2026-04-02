(function () { var u = JSON.parse(localStorage.getItem("user") || "null"); if (u && u.username) document.getElementById("header-username").textContent = u.username; })();
                    function logoutUser() { if (confirm("Do you want to logout?")) { localStorage.removeItem("user"); window.location.href = "../../Login Page/login.html"; } }

async function fetchDashboardStats() {
            try {
                const baseUrl = API_BASE_URL; // Consistent use of API_BASE_URL
                const [tournamentsRes, teamsRes, usersRes] = await Promise.all([
                    fetch(`${baseUrl}/tournaments`),
                    fetch(`${baseUrl}/teams`),
                    fetch(`${baseUrl}/users`)
                ]);

                if (tournamentsRes.ok && teamsRes.ok && usersRes.ok) {
                    const tournaments = await tournamentsRes.json();
                    const teams = await teamsRes.json();
                    const users = await usersRes.json();

                    document.getElementById('total-tournaments').textContent = tournaments.length;
                    document.getElementById('total-teams').textContent = teams.length;
                    document.getElementById('total-players').textContent = users.length;

                    // 1. Build Global Banner Map
                    const globalBannerMap = {};
                    teams.forEach(t => { if (t.team_name) globalBannerMap[t.team_name] = t.team_banner_url || null; });

                    // Fetch Matches
                    const matchesContainer = document.getElementById('recent-matches-container');
                    const matchesSection = document.querySelector('section[aria-label="Upcoming Matches"]');
                    let allMatches = [];
                    matchesContainer.innerHTML = '';

                    for (const t of tournaments) {
                        try {
                            const [mRes, tdRes] = await Promise.all([
                                fetch(`${baseUrl}/tournaments/${t.tournament_id}/matches`),
                                fetch(`${baseUrl}/tournaments/${t.tournament_id}`)
                            ]);
                            if (mRes.ok) {
                                const matches = await mRes.json();
                                let approvedTeams = [];
                                if (tdRes.ok) {
                                    const td = await tdRes.json();
                                    approvedTeams = (td.Application || td.applications || [])
                                        .filter(a => a.status === 'Approved')
                                        .sort((a, b) => (a.app_id || 0) - (b.app_id || 0))
                                        .map(a => (a.team || a.Team || {}).team_name)
                                        .filter(name => name);
                                }
                                if (matches.length > 0) {
                                    matches.forEach(m => {
                                        if (m.round === 1 && !m.team1_name && !m.team2_name && approvedTeams.length > 0) {
                                            m.team1_name = approvedTeams[m.position * 2] || null;
                                            m.team2_name = approvedTeams[m.position * 2 + 1] || null;
                                        }
                                        allMatches.push({ ...m, tournament_name: t.tournament_name });
                                    });
                                }
                            }
                        } catch (e) { }
                    }

                    let foundMatches = allMatches.length > 0;
                    if (foundMatches) {
                        // 2. Resolve missing team names/banners by following winners
                        const tournamentGroups = {};
                        allMatches.forEach(m => {
                            if (!tournamentGroups[m.tournament_id]) tournamentGroups[m.tournament_id] = [];
                            tournamentGroups[m.tournament_id].push(m);
                        });

                        for (const tMatches of Object.values(tournamentGroups)) {
                            const tid = tMatches[0].tournament_id;
                            const nameMap = {};
                            tMatches.forEach(m => { nameMap[`${m.round}:${m.position}`] = { t1: m.team1_name, t2: m.team2_name }; });

                            // 2a. Propagate Winners
                            const sortedMatches = [...tMatches].sort((a,b) => {
                                const order = (r) => (r > 0 && r < 100) ? 1 : (r < 0) ? 2 : 3;
                                if (order(a.round) !== order(b.round)) return order(a.round) - order(b.round);
                                return Math.abs(a.round) - Math.abs(b.round) || a.position - b.position;
                            });

                            sortedMatches.forEach(m => {
                                const names = nameMap[`${m.round}:${m.position}`] || { t1: null, t2: null };
                                if (m.score1 !== null && m.score2 !== null) {
                                    const winner = m.score1 >= m.score2 ? names.t1 : names.t2;
                                    const loser = m.score1 >= m.score2 ? names.t2 : names.t1;
                                    if (!winner) return;

                                    if (m.round > 0 && m.round < 100) {
                                        const nextKey = `${m.round + 1}:${Math.floor(m.position / 2)}`;
                                        if (!nameMap[nextKey]) nameMap[nextKey] = { t1: null, t2: null };
                                        if (m.position % 2 === 0) nameMap[nextKey].t1 = winner; else nameMap[nextKey].t2 = winner;
                                        
                                        if (loser) {
                                            if (m.round === 1) {
                                                const lbKey = `-1:${Math.floor(m.position / 2)}`;
                                                if (!nameMap[lbKey]) nameMap[lbKey] = { t1: null, t2: null };
                                                if (m.position % 2 === 0) nameMap[lbKey].t1 = loser; else nameMap[lbKey].t2 = loser;
                                            } else {
                                                const lbKey = `-${2 * m.round - 2}:${m.position}`;
                                                if (!nameMap[lbKey]) nameMap[lbKey] = { t1: null, t2: null };
                                                nameMap[lbKey].t2 = loser;
                                            }
                                        }
                                    } else if (m.round < 0) {
                                        const isDoubleRound = (Math.abs(m.round) % 2 === 0);
                                        const nextR = m.round - 1;
                                        const nextP = isDoubleRound ? Math.floor(m.position / 2) : m.position;
                                        const nextKey = `${nextR}:${nextP}`;
                                        if (!nameMap[nextKey]) nameMap[nextKey] = { t1: null, t2: null };
                                        if (isDoubleRound) {
                                            if (m.position % 2 === 0) nameMap[nextKey].t1 = winner; else nameMap[nextKey].t2 = winner;
                                        } else {
                                            nameMap[nextKey].t1 = winner;
                                        }
                                    }
                                }
                            });
                            
                            tMatches.forEach(m => {
                                const n = nameMap[`${m.round}:${m.position}`] || {};
                                if (!m.team1_name && n.t1) m.team1_name = n.t1;
                                if (!m.team2_name && n.t2) m.team2_name = n.t2;
                            });
                        }

                        // Propagate team names through WB rounds from R1 scores
                        // Sort: WB positive rounds first, then Finals (>100), then LB (negative) last
                        allMatches.sort((a, b) => {
                            const rankA = a.round > 0 && a.round < 100 ? 0 : a.round > 100 ? 1 : 2;
                            const rankB = b.round > 0 && b.round < 100 ? 0 : b.round > 100 ? 1 : 2;
                            if (rankA !== rankB) return rankA - rankB;
                            return Math.abs(a.round || 0) - Math.abs(b.round || 0) || (a.position || 0) - (b.position || 0);
                        });

                        allMatches.slice(0, 4).forEach(m => {
                            const banner1 = (m.team1_name && globalBannerMap[m.team1_name]) || '../../icons/user.svg';
                            const banner2 = (m.team2_name && globalBannerMap[m.team2_name]) || '../../icons/user.svg';
                            const hasScore = m.score1 !== null && m.score2 !== null;
                            const vsContent = hasScore ? `<div class="results-badge-premium">${m.score1} - ${m.score2}</div>` : '<div class="vs-badge-premium">VS</div>';
                            const team1 = m.team1_name || (m.round < 0 ? 'LB Team' : 'TBD');
                            const team2 = m.team2_name || (m.round < 0 ? 'LB Team' : 'TBD');

                            const row = document.createElement('article');
                            row.className = 'premium-match-row';
                            row.style.width = '100%';
                            row.innerHTML = `
                                <div class="match-meta-info">
                                    <span class="match-tournament-tag" style="color: #ff8c00; font-size: 11px;">${m.tournament_name}</span>
                                    <span class="match-time-tag">${hasScore ? 'FINISHED' : 'START IN <strong>15:30</strong>'}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 32px; flex: 1; justify-content: center; min-width: 0;">
                                    <div class="match-team-container" style="justify-content: flex-end;">
                                        <span class="match-team-name">${team1}</span>
                                        <img class="team-banner-circle" src="${banner1}" onerror="this.src='../../icons/user.svg'" />
                                    </div>
                                    ${vsContent}
                                    <div class="match-team-container">
                                        <img class="team-banner-circle" src="${banner2}" onerror="this.src='../../icons/user.svg'" />
                                        <span class="match-team-name">${team2}</span>
                                    </div>
                                </div>
                            `;
                            matchesContainer.appendChild(row);
                        });
                    }

                    if (!foundMatches) {
                        matchesContainer.innerHTML = '<p style="color:#94a3b8; padding: 20px; text-align: center; width: 100%;">No matches scheduled yet.</p>';
                    }
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', fetchDashboardStats);

// ===== MODAL SYSTEM =====
        let allTournamentsCache = [];

        function openModal(id) {
            const overlay = document.getElementById('modal-overlay');
            overlay.style.display = 'flex';
            document.querySelectorAll('.modal-box').forEach(m => m.style.display = 'none');
            document.getElementById(id).style.display = 'flex';
            document.getElementById(id).style.flexDirection = 'column';
            if (id === 'explore-modal') loadExplore('all');
        }

        function closeModal() {
            document.getElementById('modal-overlay').style.display = 'none';
        }

        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

        function setTheme(t) {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('theme-' + t).classList.add('active');
        }

        function saveSettings() {
            const lang = document.getElementById('lang-select').value;
            const notifMatch = document.getElementById('notif-match').checked;
            const notifNews = document.getElementById('notif-news').checked;
            localStorage.setItem('kmitl_lang', lang);
            localStorage.setItem('kmitl_notif_match', notifMatch);
            localStorage.setItem('kmitl_notif_news', notifNews);
            closeModal();
            showToast('Settings saved successfully ✓');
        }

        function showToast(msg) {
            const t = document.createElement('div');
            t.textContent = msg;
            Object.assign(t.style, {
                position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: '48px',
                fontSize: '14px', fontWeight: '700', zIndex: '9999', transition: 'opacity 0.3s'
            });
            document.body.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
        }

        function filterExplore(btn, status) {
            document.querySelectorAll('#explore-filters .filter-tag').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadExplore(status);
        }

        async function loadExplore(filter) {
            const list = document.getElementById('explore-list');
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">Loading...</div>';
            try {
                let tournaments = allTournamentsCache;
                if (!tournaments.length) {
                    const res = await fetch(`${API_BASE_URL}/tournaments`);
                    tournaments = await res.json();
                    allTournamentsCache = tournaments;
                }
                const now = new Date();
                const filtered = filter === 'all' ? tournaments : tournaments.filter(t => {
                    const start = t.start_date ? new Date(t.start_date) : null;
                    const end = t.end_date ? new Date(t.end_date) : null;
                    if (filter === 'ongoing') return start && end && start <= now && end >= now;
                    if (filter === 'upcoming') return start && start > now;
                    if (filter === 'ended') return end && end < now;
                    return true;
                });
                if (!filtered.length) {
                    list.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">No tournaments found</div>';
                    return;
                }
                list.innerHTML = filtered.map(t => {
                    const start = t.start_date ? new Date(t.start_date) : null;
                    const end = t.end_date ? new Date(t.end_date) : null;
                    let statusClass = 'status-upcoming', statusLabel = 'Upcoming';
                    if (start && end && start <= now && end >= now) { statusClass = 'status-ongoing'; statusLabel = 'Ongoing'; }
                    else if (end && end < now) { statusClass = 'status-ended'; statusLabel = 'Ended'; }
                    const banner = t.tournament_banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200';
                    return `<div class="explore-item" onclick="closeModal();window.location.href='../../Viewer/TournamentDetail Page 18/tournamentdetail_18.html?id=${t.tournament_id}'">
                        <img class="explore-item-img" src="${banner}" onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'" />
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.tournament_name}</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${t.tournament_type || ''} • ${t._count?.applications || 0} Teams</div>
                        </div>
                        <span class="explore-status ${statusClass}">${statusLabel}</span>
                    </div>`;
                }).join('');
            } catch (e) {
                list.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:14px;">Load failed</div>';
            }
        }

        // Restore saved settings
        (function () {
            const lang = localStorage.getItem('kmitl_lang');
            if (lang) document.getElementById('lang-select').value = lang;
            const nm = localStorage.getItem('kmitl_notif_match');
            if (nm !== null) document.getElementById('notif-match').checked = nm === 'true';
            const nn = localStorage.getItem('kmitl_notif_news');
            if (nn !== null) document.getElementById('notif-news').checked = nn === 'true';
        })();
