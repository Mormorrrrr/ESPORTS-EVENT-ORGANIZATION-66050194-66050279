(function(){var u=JSON.parse(localStorage.getItem("user")||"null");if(u&&u.username)document.getElementById("header-username").textContent=u.username;})();
            function logoutUser(){if(confirm("Do you want to logout?")){localStorage.removeItem("user");window.location.href="../../Login Page/login.html";}}

document.addEventListener('DOMContentLoaded', () => {
            const form = document.querySelector('form');
            
            // Prevent Enter key from submitting the form accidentally (except in textareas)
            form.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                }
            });
            
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

            let currentBannerUrl = '';

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
                    currentBannerUrl = url;
                    bannerPreviewImg.src = url;
                    urlInputContainer.style.display = 'none';
                    bannerPreviewContainer.style.display = 'block';
                }
            });

            removeBannerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                currentBannerUrl = '';
                bannerPreviewContainer.style.display = 'none';
                uploadPlaceholder.style.display = 'contents';
                bannerUrlInput.value = '';
            });

            bannerUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmUrlBtn.click();
                }
            });

            // Tournament Type Selection Logic
            const formatOptions = document.querySelectorAll('.format-option');
            formatOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    // Reset all options
                    formatOptions.forEach(opt => {
                        const radio = opt.querySelector('input[type="radio"]');
                        radio.checked = false;
                        opt.classList.remove('active');
                        opt.style.borderColor = '#e2e8f0';
                        
                        const indicator = opt.querySelector('.selection-indicator');
                        if (indicator) {
                            indicator.style.background = 'transparent';
                            indicator.style.borderColor = '#cbd5e1';
                            const checkmark = indicator.querySelector('.vector');
                            if (checkmark) checkmark.style.display = 'none';
                        }
                    });

                    // Set active option
                    option.classList.add('active');
                    option.style.borderColor = '#ff8c00';
                    const radio = option.querySelector('input[type="radio"]');
                    if (radio) {
                        radio.checked = true;
                    }

                    const indicator = option.querySelector('.selection-indicator');
                    if (indicator) {
                        indicator.style.background = '#ff8c00';
                        indicator.style.borderColor = '#ff8c00';
                        const checkmark = indicator.querySelector('.vector');
                        if (checkmark) checkmark.style.display = 'block';
                    }
                });
            });

            // Age Range Dropdown Population
            const minAgeSelect = document.getElementById('min-age');
            const maxAgeSelect = document.getElementById('max-age');
            
            function populateAgeDropdowns() {
                for (let i = 10; i <= 50; i++) {
                    const minOpt = document.createElement('option');
                    minOpt.value = i;
                    minOpt.textContent = i;
                    minAgeSelect.appendChild(minOpt);

                    const maxOpt = document.createElement('option');
                    maxOpt.value = i;
                    maxOpt.textContent = i;
                    maxAgeSelect.appendChild(maxOpt);
                }
                // Set defaults
                minAgeSelect.value = "18";
                maxAgeSelect.value = "25";
            }
            populateAgeDropdowns();

            // Form Submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const name = document.getElementById('tournament-name').value;
                const description = document.getElementById('tournament-description').value;
                const typeEntry = document.querySelector('input[name="tournament-type"]:checked');
                const type = typeEntry ? typeEntry.value : 'single-elimination';
                const matchDate = document.getElementById('match-date').value;
                const matchTime = document.getElementById('match-time').value || '00:00';
                const startDate = document.getElementById('start-date').value;
                const endDate = document.getElementById('end-date').value;
                const duration = document.getElementById('duration').value;
                const format = document.getElementById('tournament-format').value;
                const minAge = minAgeSelect.value;
                const maxAge = maxAgeSelect.value;

                if (!name || !matchDate || !startDate || !endDate) {
                    alert('Please fill in required fields (Name, Match Date, Registration Window)');
                    return;
                }

                if (parseInt(minAge) > parseInt(maxAge)) {
                    alert('Minimum age cannot be greater than maximum age.');
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/tournaments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            tournament_name: name,
                            tournament_type: type === 'double-elimination' ? 'Double Elimination' : 'Single Elimination',
                            description: description,
                            match_date: matchDate + 'T' + matchTime,
                            start_date: startDate,
                            end_date: endDate,
                            tournament_banner: currentBannerUrl,
                            age_min: parseInt(minAge),
                            age_max: parseInt(maxAge),
                            duration: duration,
                            format: format
                        })
                    });

                    const data = await res.json();
                    if (res.ok) {
                        alert('Tournament Created Successfully!');
                        window.location.href = '../TournamentList Page 9/TournamentList_9.html';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (err) {
                    console.error('Error creating tournament', err);
                    alert('Failed to connect to backend.');
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
