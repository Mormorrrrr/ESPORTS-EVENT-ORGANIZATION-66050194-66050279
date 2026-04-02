(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Login Page/login.html";}}

document.addEventListener('DOMContentLoaded', async () => {
            const dropdown = document.getElementById('tournament-dropdown');
            const tournamentList = document.getElementById('tournament-list');
            const tournamentsContainer = document.getElementById('tournaments-container');
            const selectedTournamentText = document.getElementById('selected-tournament');
            let selectedTournamentId = null;

            // Toggle dropdown
            dropdown.addEventListener('click', (e) => {
                const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
                dropdown.setAttribute('aria-expanded', !isExpanded);
                tournamentList.style.display = isExpanded ? 'none' : 'block';
                e.stopPropagation();
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                dropdown.setAttribute('aria-expanded', 'false');
                tournamentList.style.display = 'none';
            });

            // Prevent dropdown from closing when clicking inside the list (like the select)
            tournamentList.addEventListener('click', (e) => e.stopPropagation());

            function renderTournaments(tournaments) {
                if (tournaments.length === 0) {
                    tournamentsContainer.innerHTML = `<div style="padding: 20px; color: #64748b; text-align: center; font-size: 14px;">No tournaments found</div>`;
                } else {
                    tournamentsContainer.innerHTML = tournaments.map(t => `
                        <div class="tournament-option" data-id="${t.tournament_id}" data-name="${t.tournament_name}" style="padding: 14px 20px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
                            <div style="font-weight: 600; font-size: 15px; color: #0f172a; pointer-events: none;">${t.tournament_name}</div>
                            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px; pointer-events: none;">${t.tournament_type}</div>
                        </div>
                    `).join('');

                    // Add click listeners to options
                    document.querySelectorAll('.tournament-option').forEach(option => {
                        option.addEventListener('mouseover', () => option.style.backgroundColor = '#f8fafc');
                        option.addEventListener('mouseout', () => option.style.backgroundColor = 'transparent');
                        option.addEventListener('click', (e) => {
                            selectedTournamentId = option.dataset.id;
                            const name = option.dataset.name;
                            selectedTournamentText.textContent = name;
                            selectedTournamentText.style.color = '#0f172a';
                            dropdown.setAttribute('aria-expanded', 'false');
                            tournamentList.style.display = 'none';
                        });
                    });
                }
            }

            // Banner URL logic
            const selectUrlBtn = document.getElementById('select-url-btn');
            const urlInputContainer = document.getElementById('url-input-container');
            const uploadPlaceholder = document.getElementById('upload-placeholder');
            const bannerUrlInput = document.getElementById('banner-url-input');
            const confirmUrlBtn = document.getElementById('confirm-url-btn');
            const cancelUrlBtn = document.getElementById('cancel-url-btn');
            const bannerPreviewContainer = document.getElementById('banner-preview-container');
            const bannerPreviewImg = document.getElementById('banner-preview-img');
            const removeBannerBtn = document.getElementById('remove-banner-btn');

            selectUrlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadPlaceholder.style.display = 'none';
                urlInputContainer.style.display = 'block';
                bannerUrlInput.focus();
            });

            cancelUrlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                urlInputContainer.style.display = 'none';
                uploadPlaceholder.style.display = 'contents';
            });

            confirmUrlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = bannerUrlInput.value.trim();
                if (url) {
                    bannerPreviewImg.src = url;
                    urlInputContainer.style.display = 'none';
                    bannerPreviewContainer.style.display = 'block';
                }
            });

            removeBannerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                bannerPreviewContainer.style.display = 'none';
                uploadPlaceholder.style.display = 'contents';
                bannerUrlInput.value = '';
            });

            // Prevent Enter key in URL input from reloading the page
            bannerUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmUrlBtn.click();
                }
            });

            // Fetch tournaments from backend
            try {
                const response = await fetch(`${API_BASE_URL}/tournaments`);
                allTournaments = await response.json();
                const now = new Date();
                const openTournaments = allTournaments.filter(t => !t.end_date || new Date(t.end_date) >= now);
                renderTournaments(openTournaments);
            } catch (error) {
                console.error('Error fetching tournaments:', error);
                tournamentsContainer.innerHTML = '<div style="padding: 20px; color: #ef4444; text-align: center; font-size: 14px;">Failed to load tournaments</div>';
            }

            // Map data to Step 2
            const continueBtn = document.getElementById('btn-continue-step2');
            continueBtn.addEventListener('click', () => {
                const teamName = document.getElementById('team-name').value.trim();
                const leaderName = document.getElementById('input-1').value.trim();
                const member1 = document.getElementById('member-1-name').value.trim();
                const member2 = document.getElementById('member-2-name').value.trim();
                const member3 = document.getElementById('member-3-name').value.trim();
                const member4 = document.getElementById('member-4-name').value.trim();
                const bannerUrl = document.getElementById('banner-url-input').value.trim() || 'https://placehold.co/1200x400?text=Tournament+Banner';
                
                if (!selectedTournamentId) {
                    alert('Please select a tournament');
                    return;
                }
                if (!teamName || !leaderName) {
                    alert('Please enter Team Name and Leader Name');
                    return;
                }

                const teamData = {
                    tournamentId: selectedTournamentId,
                    tournamentName: selectedTournamentText.textContent,
                    teamName,
                    leaderName,
                    member1,
                    member2,
                    member3,
                    member4,
                    bannerUrl
                };
                sessionStorage.setItem('teamCreationData', JSON.stringify(teamData));
                location.href = '../CreateTeamStep2 Page 16/CreateTeamStep2_16.html';
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
