(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Viewer/Tournament Page 17/tournament_17.html";}}

document.addEventListener('DOMContentLoaded', async () => {
            const teamDataStr = sessionStorage.getItem('pendingTeamData');
            if (teamDataStr) {
                const teamData = JSON.parse(teamDataStr);
                
                // Fetch tournament details
                if (teamData.tournament_id) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/tournaments/${teamData.tournament_id}`);
                        const tourney = await res.json();
                        document.getElementById('tourney-name').textContent = tourney.tournament_name;
                        document.getElementById('tourney-banner').src = tourney.tournament_banner || 'https://placehold.co/1200x400/0f172a/white?text=KMITL+Tournament';
                        
                        if (tourney.start_date) {
                            const date = new Date(tourney.start_date).toLocaleDateString();
                            document.getElementById('summary-tournament-date').textContent = `Starts ${date}`;
                        }
                    } catch (e) { console.error(e); }
                }

                document.getElementById('confirm-team-name').textContent = teamData.team_name;
                document.getElementById('confirm-leader-name').textContent = teamData.leader_name;
                const fallbackTeamLogo = '../../icons/users.svg';
                const teamLogoImg = document.getElementById('team-logo-preview');
                teamLogoImg.src = teamData.team_banner_url || fallbackTeamLogo;
                teamLogoImg.onerror = () => teamLogoImg.src = fallbackTeamLogo;
                
                if (teamData.leader_name) {
                    const initials = teamData.leader_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    document.getElementById('leader-initials-bg').textContent = initials;
                }
                
                document.getElementById('member-1').textContent = teamData.member_1 || '-';
                document.getElementById('member-2').textContent = teamData.member_2 || '-';
                document.getElementById('member-3').textContent = teamData.member_3 || '-';
                document.getElementById('member-4').textContent = teamData.member_4 || '-';
            }
        });

        document.getElementById('confirm-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            const btn = e.currentTarget;
            if (btn.disabled) return;
            
            btn.disabled = true;
            btn.textContent = 'Registering...';

            const teamDataStr = sessionStorage.getItem('pendingTeamData');
            if (!teamDataStr) {
                alert('No team data found.'); 
                btn.disabled = false;
                btn.textContent = 'Confirm';
                return;
            }
            const teamData = JSON.parse(teamDataStr);
            
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                alert('You must be logged in to create a team');
                window.location.href = '../../Login Page/login.html';
                return;
            }
            const user = JSON.parse(userStr);
            teamData.created_by = user.user_id;

            try {
                // 1. Create Team (strip tournament_id — it belongs in Application, not Team)
                const { tournament_id, ...teamOnly } = teamData;
                const teamRes = await fetch(`${API_BASE_URL}/teams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(teamOnly)
                });

                if (teamRes.ok) {
                    const newTeam = await teamRes.json();

                    // 2. Register for Tournament
                    const appRes = await fetch(`${API_BASE_URL}/applications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            team_id: newTeam.team_id,
                            tournament_id: parseInt(tournament_id)
                        })
                    });

                    if (appRes.ok) {
                        alert('Team created and registered successfully!');
                        sessionStorage.removeItem('pendingTeamData');
                        window.location.href = '../Team(Have) Page 6/HistoryTeam_6.html';
                    } else {
                        const appErr = await appRes.json();
                        alert('Team created, but registration failed: ' + (appErr.error || appErr.message || 'Unknown error'));
                        window.location.href = '../Team(Have) Page 6/HistoryTeam_6.html';
                    }
                } else {
                    const teamErr = await teamRes.json();
                    alert('Team creation failed: ' + (teamErr.error || teamErr.message || 'Unknown error'));
                    btn.disabled = false;
                    btn.textContent = 'Confirm';
                }
            } catch(err) {
                console.error(err);
                alert('Error connecting to server.');
                btn.disabled = false;
                btn.textContent = 'Confirm';
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
                    return `<div class="explore-item" onclick="closeModal();window.location.href='../../Viewer/TournamentDetail Page 18/tournamentdetail_18.html?id=${t.tournament_id}'">
                        <img class="explore-item-img" src="${banner}" onerror="this.src='https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200'" />
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.tournament_name}</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:3px;">${t.tournament_type || ''} • ${t._count?.applications || 0} Teams</div>
                        </div>
                        <span class="explore-status ${statusClass}">${statusLabel}</span>
                    </div>`;
                }).join('');
            } catch(e) {
                list.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:14px;">Failed to load data</div>';
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
