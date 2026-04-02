(function () { var u = JSON.parse(localStorage.getItem("user") || "null"); if (u && u.username) document.getElementById("header-username").textContent = u.username; })();
                    function logoutUser() { if (confirm("Do you want to logout?")) { localStorage.removeItem("user"); window.location.href = "../../Login Page/login.html"; } }

document.addEventListener('DOMContentLoaded', () => {
            const dataStr = sessionStorage.getItem('teamCreationData');
            if (!dataStr) {
                alert('No team data found. Please complete Step 1 first.');
                location.href = '../CreateTeamStep1 Page 15/CreateTeamStep1_15.html';
                return;
            }
            const data = JSON.parse(dataStr);

            // Populate DOM
            document.getElementById('summary-tournament-name').textContent = data.tournamentName;
            document.getElementById('summary-banner').src = data.bannerUrl;
            document.getElementById('summary-team-name').textContent = data.teamName;
            document.getElementById('summary-leader-name').textContent = data.leaderName;
            document.getElementById('summary-leader-initials').textContent = data.leaderName.substring(0, 2).toUpperCase();

            document.getElementById('summary-member-1').textContent = data.member1 || '-';
            document.getElementById('summary-member-2').textContent = data.member2 || '-';
            document.getElementById('summary-member-3').textContent = data.member3 || '-';
            document.getElementById('summary-member-4').textContent = data.member4 || '-';

            document.getElementById('summary-tournament-date').textContent = 'Depends on Tournament';

            // Handle submission
            const confirmBtn = document.getElementById('btn-confirm-submit');
            confirmBtn.addEventListener('click', async () => {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<span class="text-wrapper-11">Submitting...</span>';

                try {
                    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
                    if (!currentUser) {
                        alert('Please login before creating a team.');
                        window.location.href = '../../Login Page/login.html';
                        return;
                    }

                    const payload = {
                        team_name: data.teamName,
                        team_banner_url: data.bannerUrl,
                        leader_name: data.leaderName,
                        member_1: data.member1,
                        member_2: data.member2,
                        member_3: data.member3,
                        member_4: data.member4,
                        created_by: currentUser.user_id
                    };

                    const res = await fetch(`${API_BASE_URL}/teams`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        const newTeam = await res.json();
                        // Also apply to tournament if we have tournamentId
                        if (data.tournamentId) {
                            await fetch(`${API_BASE_URL}/applications`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    team_id: newTeam.team_id,
                                    tournament_id: parseInt(data.tournamentId)
                                })
                            });
                        }

                        sessionStorage.removeItem('teamCreationData');
                        alert('Team Created Successfully!');
                        location.href = '../TeamList Page 12/TeamList_12.html';
                    } else {
                        const err = await res.json();
                        alert('Error: ' + (err.message || err.error || 'Unknown error'));
                        confirmBtn.disabled = false;
                        confirmBtn.innerHTML = '<span class="text-wrapper-11">Confirm</span>';
                    }
                } catch (e) {
                    console.error(e);
                    alert('Network error while creating team');
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<span class="text-wrapper-11">Confirm</span>';
                }
            });
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
