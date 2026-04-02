(function () { var u = JSON.parse(localStorage.getItem("user") || "null"); if (u && u.username) document.getElementById("header-username").textContent = u.username; })();
                    function logoutUser() { if (confirm("Do you want to logout?")) { localStorage.removeItem("user"); window.location.href = "../../Login Page/login.html"; } }

document.addEventListener('DOMContentLoaded', async () => {
            const listContainer = document.getElementById('admin-tournaments-list');
            try {
                const res = await fetch(`${API_BASE_URL}/tournaments`);
                if (!res.ok) throw new Error('Failed to fetch tournaments');
                const tournaments = await res.json();

                listContainer.innerHTML = '';

                if (tournaments.length === 0) {
                    listContainer.innerHTML = '<li style="color:#64748b; padding: 20px; text-align: center; width: 100%;">No tournaments found.</li>';
                    return;
                }

                tournaments.forEach(t => {
                    const startDateText = new Date(t.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                    const article = document.createElement('div');
                    article.className = 'premium-list-row';
                    article.id = `tournament-card-${t.tournament_id}`;
                    article.style.cursor = 'pointer';
                    article.onclick = (e) => {
                        if (e.target.closest('button')) return;
                        window.location.href = `../TournamentDetail Page 10/TournamentDetail_10.html?id=${t.tournament_id}`;
                    };

                    const fallbackBanner = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
                    const displayBanner = t.tournament_banner || fallbackBanner;

                    // Building the Viewer-Equivalent Row for Admin
                    article.innerHTML = `
                        <!-- Column 1: Image -->
                        <div class="row-image-container">
                            <img src="${displayBanner}" class="row-image-rect" onerror="this.src='${fallbackBanner}'">
                        </div>

                        <!-- Column 2: Tournament Title & Metadata -->
                        <div class="row-main-content">
                            <h2 class="row-title" title="${t.tournament_name}">${t.tournament_name}</h2>
                            <p class="row-subtitle">${(t.tournament_type || '').split(' • ')[0] || 'Tournament'}</p>
                            <div class="row-meta-wrap">
                                <div class="row-meta-item">
                                    <img src="../../icons/calendar-clock.svg" alt="calendar" />
                                    <span>${startDateText}</span>
                                </div>
                                <div class="row-meta-item">
                                    <img src="../../icons/users.svg" alt="teams" />
                                    <span>${t._count?.applications || 0} Teams</span>
                                </div>
                            </div>
                        </div>

                        <!-- Column 3: Actions (Preserving Admin Functionality) -->
                        <div class="row-actions-wrap">
                            <button class="row-icon-btn" onclick="event.stopPropagation(); window.location.href='../EditTournament Page 21/EditTournament_21.html?id=${t.tournament_id}'" title="Edit Tournament">
                                <img src="../../icons/pencil.svg" style="width: 18px; height: 18px; opacity: 0.7;">
                            </button>
                            <button class="row-icon-btn" onclick="event.stopPropagation(); window.location.href='../TournamentDetail%20Page%2010/TournamentDetail_10.html?id=${t.tournament_id}'" title="Manage Matches & Scores">
                                <img src="../../icons/gamepad.svg" style="width: 18px; height: 18px; opacity: 0.7;">
                            </button>
                            <button class="row-icon-btn delete" onclick="deleteTournament(event, ${t.tournament_id})" title="Delete Tournament">
                                <img src="../../icons/trash.svg" style="width: 18px; height: 18px; filter: invert(34%) sepia(87%) saturate(3078%) hue-rotate(345deg) brightness(98%) contrast(92%);">
                            </button>
                        </div>
                    `;
                    listContainer.appendChild(article);
                });
            } catch (err) {
                console.error(err);
                listContainer.innerHTML = '<li style="color:red; padding:20px;">Error loading tournaments. Ensure backend server is running.</li>';
            }
        });

        window.deleteTournament = async function (event, id) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (!confirm('Are you sure you want to delete this tournament?')) return;
            try {
                const res = await fetch(`${API_BASE_URL}/tournaments/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    showToast('Tournament deleted successfully ✓');
                    const card = document.getElementById(`tournament-card-${id}`);
                    if (card) {
                        card.style.opacity = '0';
                        card.style.transform = 'translateX(20px)';
                        card.style.transition = 'all 0.4s ease';
                        setTimeout(() => {
                            card.remove();
                            if (listContainer.children.length === 0) {
                                listContainer.innerHTML = '<li style="color:#64748b; padding: 20px; text-align: center; width: 100%;">No tournaments found.</li>';
                            }
                        }, 400);
                    }
                } else {
                    const data = await res.json();
                    alert('Error: ' + (data.error || 'Failed to delete'));
                }
            } catch (err) {
                console.error(err);
                alert('Failed to connect to backend.');
            }
        };

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
