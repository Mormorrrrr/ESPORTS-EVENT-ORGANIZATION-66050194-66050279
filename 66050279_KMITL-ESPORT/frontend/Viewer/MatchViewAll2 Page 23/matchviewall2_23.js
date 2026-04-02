(function () {
            const container = document.getElementById('match-list-container');
            async function loadMatches() {
                try {
                    const res = await fetch(`${API_BASE_URL}/matches`);
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const matches = await res.json();
                    container.innerHTML = '';
                    if (!matches || matches.length === 0) {
                        container.innerHTML = '<p style="padding:40px;text-align:center;color:#64748b;font-size:16px;">No matches scheduled yet.</p>';
                        return;
                    }
                    // Group by tournament and fetch tournament details for team name lookup
                    const byTournament = {};
                    matches.forEach(m => { const tid = m.tournament_id; if (!byTournament[tid]) byTournament[tid] = []; byTournament[tid].push(m); });
                    const tournamentIds = Object.keys(byTournament);
                    // tdMap[tid] = [{name, banner}], bannerMap[tid][teamName] = bannerUrl
                    const tdMap = {};
                    const bannerMap = {};
                    await Promise.all(tournamentIds.map(async tid => {
                        try {
                            const r = await fetch(`${API_BASE_URL}/tournaments/${tid}`);
                            if (r.ok) {
                                const td = await r.json();
                                bannerMap[tid] = {};
                                tdMap[tid] = (td.Application || td.applications || [])
                                    .filter(a => a.status === 'Approved')
                                    .sort((a, b) => (a.app_id || 0) - (b.app_id || 0))
                                    .map(a => {
                                        const team = a.team || a.Team || {};
                                        if (team.team_name) bannerMap[tid][team.team_name] = team.team_banner_url || null;
                                        return { name: team.team_name, banner: team.team_banner_url || null };
                                    })
                                    .filter(t => t.name);
                            }
                        } catch (e) {}
                    }));
                    // Fill missing R1 team names from approved teams list
                    matches.forEach(m => {
                        if (m.round === 1 && !m.team1_name && !m.team2_name) {
                            const teams = tdMap[m.tournament_id] || [];
                            if (teams.length > 0) {
                                m.team1_name = teams[m.position * 2]?.name || null;
                                m.team2_name = teams[m.position * 2 + 1]?.name || null;
                            }
                        }
                    });
                    for (const tMatches of Object.values(byTournament)) {
                        const tid = tMatches[0].tournament_id;
                        const nameMap = {};
                        tMatches.forEach(m => { nameMap[`${m.round}:${m.position}`] = { t1: m.team1_name, t2: m.team2_name }; });

                        // 2a. Fetch initial teams for seeds
                        try {
                            const tdRes = await fetch(`${API_BASE_URL}/tournaments/${tid}`);
                            if (tdRes.ok) {
                                const td = await tdRes.json();
                                const approvedTeams = (td.applications || td.Application || [])
                                    .filter(a => a.status === 'Approved')
                                    .sort((a, b) => (a.app_id || 0) - (b.app_id || 0))
                                    .map(a => (a.Team || a.team || {}).team_name);
                                
                                const r1Matches = tMatches.filter(m => m.round === 1);
                                r1Matches.forEach(m => {
                                    const key = `1:${m.position}`;
                                    if (!nameMap[key].t1) nameMap[key].t1 = approvedTeams[m.position * 2] || null;
                                    if (!nameMap[key].t2) nameMap[key].t2 = approvedTeams[m.position * 2 + 1] || null;
                                });
                            }
                        } catch (e) { }

                        // 2b. Propagate
                        const sorted = [...tMatches].sort((a,b) => {
                            const order = (r) => (r > 0 && r < 100) ? 1 : (r < 0) ? 2 : 3;
                            if (order(a.round) !== order(b.round)) return order(a.round) - order(b.round);
                            return Math.abs(a.round) - Math.abs(b.round) || a.position - b.position;
                        });

                        sorted.forEach(m => {
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

                    // Sort: WB first, Finals second, LB last
                    matches.sort((a, b) => {
                        const rankA = a.round > 0 && a.round < 100 ? 0 : a.round > 100 ? 1 : 2;
                        const rankB = b.round > 0 && b.round < 100 ? 0 : b.round > 100 ? 1 : 2;
                        if (rankA !== rankB) return rankA - rankB;
                        return Math.abs(a.round || 0) - Math.abs(b.round || 0) || (a.position || 0) - (b.position || 0);
                    });

                    matches.forEach(m => {
                        const tBanners = bannerMap[m.tournament_id] || {};
                        const banner1 = (m.team1_name && tBanners[m.team1_name]) || '../../icons/user.svg';
                        const banner2 = (m.team2_name && tBanners[m.team2_name]) || '../../icons/user.svg';
                        const tourName = m.Tournament ? m.Tournament.tournament_name : 'Tournament';
                        const hasScore = m.score1 !== null && m.score2 !== null;
                        const vsContent = hasScore ? `<div class="results-badge-premium">${m.score1} - ${m.score2}</div>` : '<div class="vs-badge-premium">VS</div>';

                        const row = document.createElement('article');
                        row.className = 'premium-match-row';
                        row.innerHTML = `
                            <div class="match-meta-info">
                                <span class="match-tournament-tag" style="color: #ff8c00; font-size: 11px;">${tourName}</span>
                                <span class="match-time-tag">${hasScore ? 'FINISHED' : 'START IN <strong>15:30</strong>'}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 32px; flex: 1; justify-content: center; min-width: 0;">
                                <div class="match-team-container" style="justify-content: flex-end;">
                                    <span class="match-team-name">${m.team1_name || 'TBD'}</span>
                                    <img class="team-banner-circle" src="${banner1}" onerror="this.src='../../icons/user.svg'" />
                                </div>
                                ${vsContent}
                                <div class="match-team-container">
                                    <img class="team-banner-circle" src="${banner2}" onerror="this.src='../../icons/user.svg'" />
                                    <span class="match-team-name">${m.team2_name || 'TBD'}</span>
                                </div>
                            </div>
                        `;
                        container.appendChild(row);
                    });
                } catch (err) {
                    container.innerHTML = `<p style="padding:40px;text-align:center;color:#ef4444;">Failed to load: ${err.message}</p>`;
                }
            }
            loadMatches();
        })();

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
                position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
                background:'#1e293b', color:'#fff', padding:'12px 24px', borderRadius:'48px',
                fontSize:'14px', fontWeight:'700', zIndex:'9999', transition:'opacity 0.3s'
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
                    if (start && end && start <= now && end >= now) { statusClass='status-ongoing'; statusLabel='Ongoing'; }
                    else if (end && end < now) { statusClass='status-ended'; statusLabel='Ended'; }
                    const banner = t.tournament_banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200';
                    return `<div class="explore-item" onclick="closeModal();window.location.href='../TournamentDetail Page 18/tournamentdetail_18.html?id=${t.tournament_id}'">
                        <img class="explore-item-img" src="${banner}" onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'" />
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.tournament_name}</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${t.tournament_type || ''} • ${t._count?.applications || 0} Teams</div>
                        </div>
                        <span class="explore-status ${statusClass}">${statusLabel}</span>
                    </div>`;
                }).join('');
            } catch(e) {
                list.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:14px;">Load failed</div>';
            }
        }

        // Restore saved settings
        (function() {
            const lang = localStorage.getItem('kmitl_lang');
            if (lang) document.getElementById('lang-select').value = lang;
            const nm = localStorage.getItem('kmitl_notif_match');
            if (nm !== null) document.getElementById('notif-match').checked = nm === 'true';
            const nn = localStorage.getItem('kmitl_notif_news');
            if (nn !== null) document.getElementById('notif-news').checked = nn === 'true';
        })();
