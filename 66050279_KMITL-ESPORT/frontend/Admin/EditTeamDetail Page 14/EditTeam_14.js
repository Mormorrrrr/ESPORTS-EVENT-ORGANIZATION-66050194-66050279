(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Login Page/login.html";}}

document.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const teamId = urlParams.get('id');
            const apiBase = API_BASE_URL;

            if (!teamId) {
                alert('No Team ID found');
                window.location.href = '../TeamList Page 12/TeamList_12.html';
                return;
            }

            let currentLogoUrl = "";

            // --- 1. Load Data ---
            async function loadData() {
                try {
                    const res = await fetch(`${API_BASE_URL}/teams/${teamId}`);
                    const data = await res.json();
                    
                    if (res.ok && data) {
                        const team = data.team || data;

                        // Populate Inputs
                        document.getElementById('input-team-name').value = team.team_name || '';
                        document.getElementById('input-leader-name').value = team.leader_name || '';
                        document.getElementById('member-1').value = team.member_1 || '';
                        document.getElementById('member-2').value = team.member_2 || '';
                        document.getElementById('member-3').value = team.member_3 || '';
                        document.getElementById('member-4').value = team.member_4 || '';

                        // Logo Preview
                        currentLogoUrl = team.team_banner_url || '';
                        updateLogoPreview();

                        // Tournament Context
                        const apps = team.applications || data.applications || [];
                        if (apps.length > 0) {
                            const tournament = apps[0].tournament;
                            if (tournament) {
                                document.getElementById('tournament-name').textContent = tournament.tournament_name;
                                document.getElementById('tournament-date').textContent = new Date(tournament.start_date).toLocaleDateString();
                                const fallbackT = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200';
                                const tBanner = document.getElementById('tournament-banner');
                                tBanner.src = tournament.tournament_banner || fallbackT;
                                tBanner.onerror = () => tBanner.src = fallbackT;
                            }
                        } else {
                            document.getElementById('tournament-name').textContent = '-';
                            document.getElementById('tournament-date').textContent = '-';
                        }
                    }
                } catch (e) { console.error('Load Error:', e); }
            }

            function updateLogoPreview() {
                const img = document.getElementById('team-logo-preview');
                const fallbackLogo = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400';
                if (currentLogoUrl) {
                    img.src = currentLogoUrl;
                    img.onerror = () => img.src = fallbackLogo;
                    img.style.display = 'block';
                }
 else {
                    img.style.display = 'none';
                }
            }

            // Logo Trigger
            document.getElementById('logo-trigger').addEventListener('click', () => {
                const newUrl = prompt('Enter New Logo URL:', currentLogoUrl);
                if (newUrl !== null) {
                    currentLogoUrl = newUrl;
                    updateLogoPreview();
                }
            });

            // --- 2. Update Data ---
            document.getElementById('btn-confirm').addEventListener('click', async () => {
                const payload = {
                    team_name: document.getElementById('input-team-name').value,
                    leader_name: document.getElementById('input-leader-name').value,
                    member_1: document.getElementById('member-1').value,
                    member_2: document.getElementById('member-2').value,
                    member_3: document.getElementById('member-3').value,
                    member_4: document.getElementById('member-4').value,
                    team_banner_url: currentLogoUrl
                };

                try {
                    const res = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        alert('Team updated successfully!');
                        window.location.href = `../TeamDetail Page 13/TeamDetail_13.html?id=${teamId}`;
                    } else {
                        const err = await res.json();
                        alert('Update failed: ' + (err.error || 'Unknown error'));
                    }
                } catch (e) {
                    console.error('Update Error:', e);
                    alert('Could not connect to server.');
                }
            });

            // Cancel
            document.getElementById('btn-cancel').addEventListener('click', () => {
                window.history.back();
            });

            loadData();
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
