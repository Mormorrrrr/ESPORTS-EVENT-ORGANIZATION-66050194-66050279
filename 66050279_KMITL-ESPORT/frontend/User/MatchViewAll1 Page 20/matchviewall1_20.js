(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
                function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Viewer/Tournament Page 17/tournament_17.html";}}

(function () {
            const listContainer = document.getElementById('tournament-list-container');
            async function loadTournaments() {
                try {
                    const res = await fetch(`${API_BASE_URL}/tournaments`);
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const tournaments = await res.json();
                    listContainer.innerHTML = '';
                    if (!tournaments || tournaments.length === 0) {
                        listContainer.innerHTML = '<p style="padding:40px;text-align:center;color:#64748b;">No tournaments available.</p>';
                        return;
                    }
                    const fallback = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800';
                    tournaments.forEach(t => {
                        const article = document.createElement('article');
                        const bannerSrc = t.tournament_banner || fallback;
                        article.style.cssText = 'display:flex;align-items:center;gap:20px;padding:16px 24px;background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,0.06);width:100%;box-sizing:border-box;cursor:pointer;transition:all 0.2s ease;';
                        article.onmouseover = () => { article.style.transform = 'translateY(-2px)'; article.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)'; article.style.borderColor = '#e2e8f0'; };
                        article.onmouseout = () => { article.style.transform = 'translateY(0)'; article.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; article.style.borderColor = '#f1f5f9'; };
                        article.onclick = () => window.location.href = `../Tournament Detail Page 2/Usertournament_2.html?id=${t.tournament_id}`;
                        
                        article.innerHTML = `
                            <div style="width:140px;height:90px;border-radius:12px;overflow:hidden;flex-shrink:0;background:#1e293b;">
                                <img src="${bannerSrc}" onerror="this.src='${fallback}'" style="width:100%;height:100%;object-fit:cover;">
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:0;">
                                <h2 style="font-size:17px;font-weight:700;color:#0f172a;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.tournament_name}</h2>
                                <p style="font-size:13px;color:#64748b;margin:0;">${(t.tournament_type||'').split(' • ')[0]||'Tournament'}</p>
                                <div style="display:flex;align-items:center;gap:16px;margin-top:4px;">
                                    <div style="display:flex;align-items:center;gap:5px;font-size:13px;color:#64748b;">
                                        <img src="../../icons/calendar-clock.svg" style="width:14px;height:14px;opacity:0.7;" />
                                        <span>${t.start_date ? new Date(t.start_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : 'TBD'}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:5px;font-size:13px;color:#64748b;">
                                        <img src="../../icons/users.svg" style="width:14px;height:14px;opacity:0.7;" />
                                        <span>${t._count?.applications||0} Teams</span>
                                    </div>
                                </div>
                            </div>
                            <div style="flex-shrink:0;">
                                <button style="background:#ff8c00;color:white;border:none;border-radius:48px;padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#e67e00'" onmouseout="this.style.background='#ff8c00'">
                                    View
                                </button>
                            </div>
                        `;
                        listContainer.appendChild(article);
                    });
                } catch (err) {
                    listContainer.innerHTML = `<p style="padding:40px;text-align:center;color:#ef4444;">Failed to load: ${err.message}</p>`;
                }
            }
            loadTournaments();
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
