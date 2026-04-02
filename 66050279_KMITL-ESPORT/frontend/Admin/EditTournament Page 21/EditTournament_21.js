(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Login Page/login.html";}}

document.addEventListener('DOMContentLoaded', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tournamentId = urlParams.get('id');

            // Banner logic
            let currentBannerUrl = '';
            const uploadPlaceholder = document.getElementById('upload-placeholder');
            const urlInputContainer = document.getElementById('url-input-container');
            const bannerPreviewContainer = document.getElementById('banner-preview-container');
            const bannerPreviewImg = document.getElementById('banner-preview-img');
            const bannerUrlInput = document.getElementById('banner-url-input');

            function showBannerPreview(url) {
                currentBannerUrl = url;
                bannerPreviewImg.src = url;
                uploadPlaceholder.style.display = 'none';
                urlInputContainer.style.display = 'none';
                bannerPreviewContainer.style.display = 'block';
            }

            document.getElementById('select-url-btn').addEventListener('click', (e) => {
                e.preventDefault();
                uploadPlaceholder.style.display = 'none';
                urlInputContainer.style.display = 'block';
                bannerUrlInput.focus();
            });

            document.getElementById('cancel-url-btn').addEventListener('click', (e) => {
                e.preventDefault();
                urlInputContainer.style.display = 'none';
                uploadPlaceholder.style.display = currentBannerUrl ? 'none' : 'flex';
                if (currentBannerUrl) bannerPreviewContainer.style.display = 'block';
            });

            document.getElementById('confirm-url-btn').addEventListener('click', (e) => {
                e.preventDefault();
                const url = bannerUrlInput.value.trim();
                if (url) showBannerPreview(url);
            });

            bannerUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); document.getElementById('confirm-url-btn').click(); }
            });

            document.getElementById('remove-banner-btn').addEventListener('click', (e) => {
                e.preventDefault();
                currentBannerUrl = '';
                bannerPreviewContainer.style.display = 'none';
                uploadPlaceholder.style.display = 'flex';
                bannerUrlInput.value = '';
            });
            if(!tournamentId) {
                alert('No Tournament ID specified');
                location.href = '../TournamentList Page 9/TournamentList_9.html';
                return;
            }

            const formatOptions = document.querySelectorAll('.format-option');
            const setActiveType = (type) => {
                // type comes from backend as 'Single Elimination' or 'Double Elimination'
                const targetType = type.includes('Double') ? 'double-elimination' : 'single-elimination';
                formatOptions.forEach(opt => {
                    const isMatch = opt.getAttribute('data-type') === targetType;
                    const radio = opt.querySelector('input');
                    radio.checked = isMatch;
                    if(isMatch) opt.classList.add('active');
                    else opt.classList.remove('active');
                });
            };

            // Load Data
            try {
                const res = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`);
                if(!res.ok) throw new Error('Tournament not found');
                const t = await res.json();

                if (t.tournament_name) document.getElementById('tournament-name').value = t.tournament_name;
                if (t.description) document.getElementById('tournament-description').value = t.description;
                if (t.match_date) {
                    document.getElementById('match-date').value = t.match_date.substring(0, 10);
                    document.getElementById('match-time').value = t.match_date.substring(11, 16);
                }
                if (t.start_date) document.getElementById('start-date').value = t.start_date.substring(0, 10);
                if (t.end_date) document.getElementById('end-date').value = t.end_date.substring(0, 10);
                if (t.tournament_type) setActiveType(t.tournament_type);
                if (t.tournament_banner) showBannerPreview(t.tournament_banner);
            } catch (err) { 
                console.error(err);
                alert('Error loading tournament: ' + err.message); 
            }

            // Type Switching
            formatOptions.forEach(opt => {
                opt.addEventListener('click', () => {
                    setActiveType(opt.getAttribute('data-type') === 'double-elimination' ? 'Double Elimination' : 'Single Elimination');
                });
            });

            // Prevent Enter key from submitting the form accidentally
            const form = document.getElementById('edit-tournament-form');
            form.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            });

            form.addEventListener('submit', (e) => {
                e.preventDefault();
            });

            // Update
            document.getElementById('submit-edit-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                const name = document.getElementById('tournament-name').value;
                const description = document.getElementById('tournament-description').value;
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;
                const checkedRadio = document.querySelector('input[name="tournament-type"]:checked');
                const typeInput = checkedRadio ? checkedRadio.value : 'single-elimination';
                const finalType = typeInput === 'double-elimination' ? 'Double Elimination' : 'Single Elimination';

                if(!name || !startDate || !endDate) return alert('Please fill all fields');

                try {
                    const res = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tournament_name: name,
                            tournament_type: finalType,
                            description: description,
                            match_date: document.getElementById('match-date').value + 'T' + (document.getElementById('match-time').value || '00:00'),
                            start_date: startDate,
                            end_date: endDate,
                            tournament_banner: currentBannerUrl || null
                        })
                    });
                    if(res.ok) {
                        alert('Updated successfully');
                        location.href = '../TournamentList Page 9/TournamentList_9.html';
                    } else {
                        const errData = await res.json();
                        alert('Update failed: ' + (errData.error || 'Unknown error'));
                    }
                } catch (err) { 
                    console.error(err);
                    alert('Network error'); 
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
