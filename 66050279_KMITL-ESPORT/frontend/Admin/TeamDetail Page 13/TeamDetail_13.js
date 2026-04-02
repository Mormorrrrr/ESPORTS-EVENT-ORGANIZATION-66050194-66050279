(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Login Page/login.html";}}

document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const teamId = urlParams.get('id');
            let currentAppId = null;

            // --- Load Real Team Data ---
            async function loadTeamData() {
                if (!teamId) return;
                try {
                    const res = await fetch(`${API_BASE_URL}/teams/${teamId}`);
                    const data = await res.json();
                    
                    if (res.ok && data) {
                        const team = data.team || data;
                        // Update Identity
                        document.getElementById('team-name-display').textContent = team.team_name;
                        
                        const logoImg = document.getElementById('team-logo-img');
                        const logoInitial = document.getElementById('team-logo-initial');
                        const fallbackLogo = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400';
                        if (team.team_banner_url && logoImg) {
                            logoImg.src = team.team_banner_url;
                            logoImg.onerror = () => logoImg.src = fallbackLogo;
                            logoImg.style.display = 'block';
                            if (logoInitial) logoInitial.style.display = 'none';
                        } else if (logoInitial) {
                            logoInitial.textContent = team.team_name.substring(0, 1).toUpperCase();
                            logoInitial.style.display = 'flex';
                            if (logoImg) logoImg.style.display = 'none';
                        }
                        
                        // Update Leader
                        document.getElementById('leader-initial-display').textContent = team.leader_name ? team.leader_name.charAt(0).toUpperCase() : '-';
                        document.getElementById('leader-name-display').textContent = team.leader_name || 'No Leader';
                        
                        // Update Members
                        const memberList = document.getElementById('member-list-container');
                        if (memberList) {
                            memberList.innerHTML = '';
                            const members = [team.member_1, team.member_2, team.member_3, team.member_4].filter(m => m);
                            members.forEach((m, index) => {
                                const li = document.createElement('li');
                                li.className = 'member-bar';
                                li.innerHTML = `<span class="member-rank">${index + 1}</span><span class="member-name">${m}</span>`;
                                memberList.appendChild(li);
                            });
                            for(let i = members.length; i < 4; i++) {
                                const li = document.createElement('li');
                                li.className = 'member-bar';
                                li.innerHTML = `<span class="member-rank">${i+1}</span><span class="member-name">-</span>`;
                                memberList.appendChild(li);
                            }
                        }

                        // Tournament Context
                        const statusBadge = document.getElementById('status-badge');
                        if (data.applications && data.applications.length > 0) {
                            const app = data.applications[0];
                            currentAppId = app.app_id;
                            const tournament = app.tournament;
                            document.getElementById('tournament-display-name').textContent = tournament.tournament_name;

                            const tBanner = document.getElementById('tournament-banner-img');
                            const fallbackTournament = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200';
                            if (tBanner) {
                                tBanner.src = tournament.tournament_banner || fallbackTournament;
                                tBanner.onerror = () => tBanner.src = fallbackTournament;
                            }

                            const tDate = document.getElementById('tournament-date-display');
                            if (tDate && tournament.start_date) {
                                tDate.textContent = new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            }

                            // Badge Status
                            if (statusBadge) {
                                const badgeText = statusBadge.querySelector('.status-text');
                                if (badgeText) badgeText.textContent = app.status;
                                statusBadge.style.display = 'flex';
                                if (app.status === 'Approved') {
                                    statusBadge.style.background = '#dcfce7'; statusBadge.style.color = '#15803d';
                                } else if (app.status === 'Rejected') {
                                    statusBadge.style.background = '#fee2e2'; statusBadge.style.color = '#b91c1c';
                                } else {
                                    statusBadge.style.background = '#fef08a'; statusBadge.style.color = '#a16207';
                                }
                            }
                        } else {
                            // No application found — hide badge
                            if (statusBadge) statusBadge.style.display = 'none';
                        }
                    }
                } catch (error) { console.error('Error:', error); }
            }
            loadTeamData();

            // Navigation
            const editBtn = document.getElementById('edit-team-btn');
            if (editBtn && teamId) {
                editBtn.addEventListener('click', () => {
                    window.location.href = `../EditTeamDetail Page 14/EditTeam_14.html?id=${teamId}`;
                });
            }
            const cancelBtn = document.getElementById('cancel-action-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    window.location.href = '../TeamList Page 12/TeamList_12.html';
                });
            }

            // Approval Interaction
            const badge = document.getElementById('status-badge');
            if (badge && teamId) {
                badge.style.cursor = 'pointer';
                badge.addEventListener('click', async () => {
                    if (!currentAppId) {
                        alert('No application data found (currentAppId = null)');
                        return;
                    }
                    const action = confirm(`Approve this team?\n(app_id: ${currentAppId})`);
                    if (action) {
                        try {
                            const res = await fetch(`${API_BASE_URL}/applications/${currentAppId}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'Approved' })
                            });
                            const result = await res.json();
                            if (res.ok) {
                                showToast('Status updated to Approved ✓');
                                const badgeText = badge.querySelector('.status-text');
                                if (badgeText) badgeText.textContent = 'Approved';
                                badge.style.background = '#dcfce7'; 
                                badge.style.color = '#15803d';
                                // Disable further clicks to prevent redundant updates
                                badge.style.cursor = 'default';
                                badge.onclick = null;
                            } else {
                                alert('Error: ' + (result.error || 'Unknown'));
                            }
                        } catch (e) { alert('Fetch error: ' + e.message); }
                    }
                });
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
