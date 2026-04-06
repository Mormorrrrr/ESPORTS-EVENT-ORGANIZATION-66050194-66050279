(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Login Page/login.html";}}

document.addEventListener('DOMContentLoaded', async () => {
            const listContainer = document.getElementById('admin-team-list-container');
            
            listContainer.innerHTML = '<p style="color:#64748b; text-align:center; padding:40px;">Loading...</p>';
            try {
                const res = await fetch(`${API_BASE_URL}/teams`);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || 'HTTP ' + res.status);
                }
                const allTeams = await res.json();

                listContainer.innerHTML = '';

                if (!allTeams || allTeams.length === 0) {
                    listContainer.innerHTML = '<p style="color:#64748b; font-size: 18px; text-align: center; padding: 40px; width: 100%;">No team data in system yet.</p>';
                    return;
                }

                // Fetch all statuses concurrently, then sort pending first
                const teamsWithStatus = await Promise.all(allTeams.map(async (team) => {
                    let status = 'No Apply';
                    let statusColor = '#94a3b8';
                    try {
                        const appRes = await fetch(`${API_BASE_URL}/applications?team_id=${team.team_id}`);
                        const apps = await appRes.json();
                        if (apps.length > 0) {
                            status = apps[0].status.toUpperCase();
                            if (status === 'APPROVED') statusColor = '#4ade80';
                            else if (status === 'PENDING') statusColor = '#fbbf24';
                        }
                    } catch (e) {
                        console.error('Error fetching status for team', team.team_id, e);
                    }
                    return { ...team, status, statusColor };
                }));

                // Sort: PENDING first, then others
                teamsWithStatus.sort((a, b) => {
                    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                    return 0;
                });

                teamsWithStatus.forEach((team) => {
                    const { status, statusColor } = team;

                    // Render the card using pure robust styles to bypass any style12.css conflicts
                    const article = document.createElement('div');
                    article.id = `team-card-${team.team_id}`;
                    article.style.display = 'flex';
                    article.style.alignItems = 'center';
                    article.style.justifyContent = 'space-between';
                    article.style.padding = '16px 24px';
                    article.style.backgroundColor = '#ffffff';
                    article.style.borderRadius = '16px';
                    article.style.border = '1px solid #f1f5f9';
                    article.style.boxShadow = '0px 1px 2px rgba(0,0,0,0.05)';
                    article.style.width = '100%';
                    article.style.boxSizing = 'border-box';
                    
                    const fallbackTeamImg = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200';
                    const logoHtml = `<img src="${team.team_banner_url || fallbackTeamImg}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${fallbackTeamImg}'" />`;

                    // Left Side: Logo and Text
                    const leftSide = `
                        <div style="display:flex; align-items:center; gap: 24px;">
                            <!-- Circle Avatar -->
                            <div style="width: 64px; height: 64px; border-radius: 50%; background-color: #333; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                                ${logoHtml}
                            </div>
                            <!-- Text Details -->
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <span style="font-size: 16px; font-weight: 700; color: #0f172a; ">${team.team_name}</span>
                                <span style="font-size: 14px; color: #64748b;  display:flex; align-items:center; gap: 4px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    Leader: ${team.leader_name}
                                </span>
                            </div>
                        </div>
                    `;

                    // Right Side: Badges & Buttons
                    let badgeBg = statusColor;
                    let badgeText = status === 'APPROVED' ? '#15803d' : status === 'PENDING' ? '#ca8a04' : '#b91c1c';
                    if(status === 'No Apply' || status === 'NO APPLY') { badgeBg = '#f1f5f9'; badgeText = '#475569'; }

                    const rightSide = `
                        <div style="display:flex; align-items:center; gap: 16px;">
                            <!-- Status Badge -->
                            <div style="background-color: ${badgeBg}; padding: 4px 12px; border-radius: 9999px; display:flex; align-items:center; justify-content:center;">
                                <span style="color: ${badgeText}; font-size: 11px; font-weight: 700; ">${status}</span>
                            </div>
                            <!-- Edit Button -->
                            <button onclick="event.stopPropagation(); editTeam(${team.team_id})" style="width: 36px; height: 36px; border-radius: 50%; background-color: #f1f5f9; border: none; cursor: pointer; display:flex; align-items:center; justify-content:center; padding:0;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <!-- Delete Button -->
                            <button onclick="event.stopPropagation(); deleteTeam(${team.team_id})" style="width: 36px; height: 36px; border-radius: 50%; background-color: #f1f5f9; border: none; cursor: pointer; display:flex; align-items:center; justify-content:center; padding:0;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    `;

                    article.innerHTML = leftSide + rightSide;
                    listContainer.appendChild(article);
                });
            } catch (error) {
                console.error('Error fetching teams:', error);
                listContainer.innerHTML = `<p style="color:#ef4444; font-size:16px; text-align:center; padding: 40px;">Failed to load data: ${error.message}</p>`;
            }
        });

        async function deleteTeam(teamId) {
            if (!confirm('Are you sure you want to delete this team?')) return;
            try {
                const res = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    showToast('Team deleted successfully ✓');
                    const card = document.getElementById(`team-card-${teamId}`);
                    if (card) {
                        card.style.opacity = '0';
                        card.style.transform = 'translateX(20px)';
                        card.style.transition = 'all 0.4s ease';
                        setTimeout(() => {
                            card.remove();
                            if (listContainer.children.length === 0) {
                                listContainer.innerHTML = '<p style="color:#64748b; font-size: 18px; text-align: center; padding: 40px; width: 100%;">No team data in system yet.</p>';
                            }
                        }, 400);
                    }
                } else {
                    const err = await res.json();
                    alert('Delete failed: ' + err.error);
                }
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Network error while deleting team');
            }
        }

        function editTeam(teamId) {
            location.href = `../TeamDetail Page 13/TeamDetail_13.html?id=${teamId}`;
        }

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
