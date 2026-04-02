document.addEventListener('DOMContentLoaded', async () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            if (!id) return;

            const matchListContainer = document.getElementById('match-list-container');

            try {
                const res = await fetch(`${API_BASE_URL}/tournaments/${id}`);
                const tournament = await res.json();

                document.getElementById('tournament-display-name').textContent = tournament.tournament_name;

                // Bind Description
                if (tournament.description) {
                    document.getElementById('tournament-description-banner').style.display = 'block';
                    document.getElementById('tournament-description-banner').textContent = tournament.description;
                } else {
                    document.getElementById('tournament-description-banner').style.display = 'none';
                }

                document.getElementById('detail-type').textContent = tournament.tournament_type || 'N/A';
                document.getElementById('detail-duration').textContent = tournament.duration || 'N/A';
                document.getElementById('detail-age').textContent = `${tournament.age_min || 0} - ${tournament.age_max || 100} years old`;
                document.getElementById('detail-format').textContent = tournament.tournament_type || 'N/A';
                if (tournament.match_date) {
                    const mDateObj = new Date(tournament.match_date);
                    const mDate = mDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    const mTime = mDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    const matchDateEl = document.getElementById('detail-match-date');
                    if (matchDateEl) matchDateEl.textContent = `${mDate} · ${mTime}`;
                }

                // Banner Fallback
                const bannerImg = document.querySelector('.image-2');
                const fallbackBanner = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200';
                if (tournament.tournament_banner) {
                    bannerImg.src = tournament.tournament_banner;
                    bannerImg.onerror = () => bannerImg.src = fallbackBanner;
                } else {
                    bannerImg.src = fallbackBanner;
                }

                // Fetch Matches
                const matchesRes = await fetch(`${API_BASE_URL}/tournaments/${id}/matches`);
                const matches = await matchesRes.json();

                const seenCounts = {};
                const teams = (tournament.Application || tournament.applications || [])
                    .filter(app => app.status === 'Approved')
                    .sort((a, b) => (a.app_id || 0) - (b.app_id || 0))
                    .map(app => {
                        const name = (app.Team || app.team || {}).team_name;
                        if (!name) return null;
                        seenCounts[name] = (seenCounts[name] || 0) + 1;
                        return name + '\u200B'.repeat(seenCounts[name] - 1);
                    })
                    .filter(n => n);

                if (!matches || matches.length === 0) {
                    matchListContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; color: #64748b;">
                        <img src="../../icons/info.svg" style="width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.5;" />
                        <p style="font-weight: 500;">No matches scheduled yet.</p>
                    </div>`;
                    return;
                }

                // Build bracket data from saved matches
                const isDouble = (tournament.tournament_type || '').toLowerCase().includes('double');
                const numTeams = Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(2, teams.length)))));
                const bracketTeams = [];
                for (let i = 0; i < numTeams; i += 2) bracketTeams.push([teams[i] || null, teams[i + 1] || null]);

                let bracketData;
                if (isDouble) {
                    const wbRounds = Math.log2(numTeams);
                    const wb = Array.from({ length: wbRounds }, (_, r) => Array.from({ length: numTeams / Math.pow(2, r + 1) }, () => [null, null]));
                    const lbRounds = 2 * wbRounds - 2;
                    let mc = numTeams / 4;
                    const lb = Array.from({ length: lbRounds }, (_, r) => { const a = Array.from({ length: Math.floor(mc) }, () => [null, null]); if (r % 2 === 1) mc /= 2; return a; });
                    const finals = [[null, null], [null, null]];
                    matches.forEach(m => {
                        if (m.round > 0 && m.round < 100 && wb[m.round - 1]?.[m.position]) wb[m.round - 1][m.position] = [m.score1, m.score2];
                        else if (m.round < 0 && lb[Math.abs(m.round) - 1]?.[m.position]) lb[Math.abs(m.round) - 1][m.position] = [m.score1, m.score2];
                        else if (m.round >= 101) {
                            let matchIdx = m.round - 101;
                            if (finals[matchIdx] !== undefined) finals[matchIdx] = [m.score1, m.score2];
                        }
                    });
                    bracketData = { teams: bracketTeams, results: [wb, lb, [finals]] };
                } else {
                    let slotTeams = Array.from({ length: numTeams }, (_, i) => teams[i] || 'BYE');
                    const numRounds = Math.log2(numTeams);
                    const results = [];
                    for (let r = 0; r < numRounds; r++) {
                        const roundArr = [], nextSlot = [];
                        const matchCount = slotTeams.length / 2;
                        for (let m = 0; m < matchCount; m++) {
                            const t1 = slotTeams[m * 2], t2 = slotTeams[m * 2 + 1];
                            const md = matches.find(x => x.round === r + 1 && x.position === m);
                            let score = md ? [md.score1, md.score2] : [null, null];
                            if (score[0] === null && score[1] === null) {
                                if (t1 !== 'BYE' && t2 === 'BYE') score = [1, 0];
                                else if (t1 === 'BYE' && t2 !== 'BYE') score = [0, 1];
                            }
                            const winner = (t1 === 'BYE' && t2 === 'BYE') ? 'BYE' : (score[0] !== null && score[1] !== null) ? (score[0] >= score[1] ? t1 : t2) : 'TBD';
                            nextSlot.push(winner);
                            roundArr.push(score);
                        }
                        results.push(roundArr);
                        slotTeams = nextSlot;
                    }
                    bracketData = { teams: bracketTeams, results };
                }

                // Render read-only bracket in iframe
                matchListContainer.innerHTML = '';
                matchListContainer.style.display = 'block';
                const iframeHtml = '\x3C!DOCTYPE html\x3E\x3Chtml\x3E\x3Chead\x3E\x3Cmeta charset="utf-8"\x3E'
                    + '\x3Clink rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-bracket/0.11.1/jquery.bracket.min.css"\x3E'
                    + '\x3Cscript src="https://code.jquery.com/jquery-3.6.0.min.js"\x3E\x3C/script\x3E'
                    + '\x3Cscript src="https://cdnjs.cloudflare.com/ajax/libs/jquery-bracket/0.11.1/jquery.bracket.min.js"\x3E\x3C/script\x3E'
                    + '\x3Cstyle\x3E'
                    + 'body{margin:0;padding:16px;background:transparent;overflow-x:auto;}'
                    + '.jQBracket .tools{display:none!important;}'
                    + '.jQBracket .team{background-color:#ffffff!important;border:1px solid #e2e8f0!important;border-radius:4px!important;color:#334155!important;}'
                    + '.jQBracket .win{color:#15803d!important;background-color:#dcfce7!important;border-color:#86efac!important;font-weight:700!important;}'
                    + '.jQBracket .score{color:#2563eb!important;background:#f8fafc!important;font-weight:600!important;pointer-events:none!important;}'
                    + '.jQBracket .connector{border-color:#cbd5e1!important;}'
                    + '.jQBracket input[type=text]{pointer-events:none!important;cursor:default!important;background:#f1f5f9!important;border-color:#e2e8f0!important;color:#374151!important;}'
                    + '.jQBracket .loser{margin-top:8px!important;}'
                    + '\x3C/style\x3E'
                    + '\x3C/head\x3E\x3Cbody\x3E\x3Cdiv id="bc"\x3E\x3C/div\x3E\x3C/body\x3E\x3C/html\x3E';

                const iframe = document.createElement('iframe');
                iframe.id = 'bracket-iframe';
                iframe.srcdoc = iframeHtml;
                iframe.style.cssText = 'width:100%;min-height:500px;border:none;background:transparent;';
                matchListContainer.appendChild(iframe);

                iframe.onload = () => {
                    const win = iframe.contentWindow;
                    if (!win || !win.jQuery) return;
                    win.jQuery('#bc').bracket({ init: bracketData, save: function () { } });
                    
                    // Disable and beautify after render
                    setTimeout(() => {
                        win.document.querySelectorAll('input').forEach(inp => { 
                            inp.disabled = true; 
                            inp.style.pointerEvents = 'none'; 
                        });

                        if (isDouble) {
                            const bracket = win.document.querySelector('.bracket');
                            const loserBracket = win.document.querySelector('.loserBracket');
                            if (bracket && loserBracket) {
                                // LB Alignment Fix (match admin logic)
                                const wbMatches = bracket.querySelectorAll('.match');
                                let wbBottom = bracket.getBoundingClientRect().top;
                                wbMatches.forEach(m => { const r = m.getBoundingClientRect(); if (r.bottom > wbBottom) wbBottom = r.bottom; });
                                
                                const lbMatches = loserBracket.querySelectorAll('.match');
                                let lbTop = loserBracket.getBoundingClientRect().bottom;
                                lbMatches.forEach(m => { const r = m.getBoundingClientRect(); if (r.top < lbTop) lbTop = r.top; });
                                
                                const gap = lbTop - wbBottom;
                                if (gap > 20) {
                                    const loserStyle = win.getComputedStyle(loserBracket);
                                    if (loserStyle.position === 'absolute') {
                                        loserBracket.style.top = (parseInt(loserStyle.top) - (gap - 20)) + 'px';
                                    } else {
                                        loserBracket.style.marginTop = (parseInt(loserStyle.marginTop || 0) - (gap - 20)) + 'px';
                                    }
                                }
                            }
                        }
                        const h = win.document.body.scrollHeight;
                        if (h > 0) iframe.style.minHeight = (h + 40) + 'px';
                    }, 1200);
                };

            } catch (error) {
                console.error('Error fetching tournament detail:', error);
                matchListContainer.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Failed to load bracket data.</div>`;
            }
        });

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
                    return `<div class="explore-item" onclick="closeModal();window.location.href='../TournamentDetail Page 18/tournamentdetail_18.html?id=${t.tournament_id}'">
                        <img class="explore-item-img" src="${banner}" onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'" />
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.tournament_name}</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${t.tournament_type || ''} • ${t._count?.applications || 0} Teams</div>
                        </div>
                        <span class="explore-status ${statusClass}">${statusLabel}</span>
                    </div>`;
                }).join('');
            } catch (e) {
                list.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:14px;">Failed to load data</div>';
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
