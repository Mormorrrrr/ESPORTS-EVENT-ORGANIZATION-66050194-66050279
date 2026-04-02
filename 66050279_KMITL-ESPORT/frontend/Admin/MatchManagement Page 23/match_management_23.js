const urlParams = new URLSearchParams(window.location.search);
        const tournamentId = urlParams.get('id');

        (function () { 
            const u = JSON.parse(localStorage.getItem("user") || "null"); 
            if (u && u.username) document.getElementById("header-username").textContent = u.username; 
            else window.location.href = "../../Login Page/login.html";
        })();

        function logoutUser() { if (confirm("Do you want to logout?")) { localStorage.removeItem("user"); window.location.href = "../../Login Page/login.html"; } }
        function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }
        function openModal(id) { 
            document.getElementById('modal-overlay').style.display = 'flex';
            document.querySelectorAll('.modal-box').forEach(m => m.style.display = 'none');
            document.getElementById(id).style.display = 'block';
        }

        function goToBracket() {
            window.location.href = `../TournamentDetail Page 10/TournamentDetail_10.html?id=${tournamentId}`;
        }

        async function loadMatches() {
            if (!tournamentId) {
                alert('Tournament ID is missing');
                return;
            }

            const container = document.getElementById('match-list-container');
            try {
                // Fetch Tournament Detail
                const tRes = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`);
                if (tRes.ok) {
                    const t = await tRes.json();
                    document.getElementById('tournament-title').textContent = t.tournament_name + ' - Match Management';
                }

                // Fetch Matches
                const mRes = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/matches`);
                if (!mRes.ok) throw new Error('Failed to fetch matches');
                const matches = await mRes.json();

                if (matches.length === 0) {
                    container.innerHTML = '<p style="padding: 60px; text-align: center; color: #94a3b8; font-size: 16px;">No matches generated for this tournament yet.</p>';
                    return;
                }

                // Fetch Teams for banners and Fallback names
                const teamRes = await fetch(`${API_BASE_URL}/teams`);
                const allTeams = teamRes.ok ? await teamRes.json() : [];
                const bannerMap = {};
                allTeams.forEach(t => { if (t.team_name) bannerMap[t.team_name] = t.team_banner_url; });

                // Propagation Logic (Simplified for List View display labels)
                const nameMap = {};
                matches.forEach(m => { nameMap[`${m.round}:${m.position}`] = { t1: m.team1_name, t2: m.team2_name }; });

                // Seed Propagation
                const tdRes = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`);
                if (tdRes.ok) {
                    const td = await tdRes.json();
                    const approvedTeams = (td.Application || td.applications || [])
                        .filter(a => a.status === 'Approved')
                        .sort((a, b) => (a.app_id || 0) - (b.app_id || 0))
                        .map(a => (a.Team || a.team || {}).team_name);
                    
                    matches.filter(m => m.round === 1).forEach(m => {
                        const key = `1:${m.position}`;
                        if (!nameMap[key].t1) nameMap[key].t1 = approvedTeams[m.position * 2] || null;
                        if (!nameMap[key].t2) nameMap[key].t2 = approvedTeams[m.position * 2 + 1] || null;
                    });
                }

                // Sort matches
                matches.sort((a, b) => {
                    const rankA = a.round > 0 && a.round < 100 ? 0 : a.round > 100 ? 1 : 2;
                    const rankB = b.round > 0 && b.round < 100 ? 0 : b.round > 100 ? 1 : 2;
                    if (rankA !== rankB) return rankA - rankB;
                    return Math.abs(a.round || 0) - Math.abs(b.round || 0) || (a.position || 0) - (b.position || 0);
                });

                container.innerHTML = '';
                matches.forEach(m => {
                    const n = nameMap[`${m.round}:${m.position}`] || {};
                    const team1 = m.team1_name || n.t1 || 'TBD';
                    const team2 = m.team2_name || n.t2 || 'TBD';
                    const banner1 = bannerMap[team1] || '../../icons/user.svg';
                    const banner2 = bannerMap[team2] || '../../icons/user.svg';
                    const isFinished = m.score1 !== null && m.score2 !== null;

                    const row = document.createElement('article');
                    row.className = 'premium-match-row';
                    row.style.height = '110px'; 
                    row.style.padding = '0 32px';
                    row.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 24px; flex: 1; justify-content: center;">
                            <!-- Team 1 -->
                            <div class="match-team-container" style="justify-content: flex-end; flex: 2;">
                                <span class="match-team-name">${team1}</span>
                                <img class="team-banner-circle" src="${banner1}" onerror="this.src='../../icons/user.svg'" />
                            </div>
                            
                            <!-- Score & Meta -->
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span class="status-badge ${isFinished ? 'status-finished' : 'status-pending'}" style="font-size: 9px; padding: 2px 8px;">${isFinished ? 'Finished' : 'Pending'}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 8px 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                    <input type="number" class="score-input" id="score1-${m.match_id}" value="${m.score1 !== null ? m.score1 : ''}" placeholder="0">
                                    <span style="font-weight: 800; color: #94a3b8;">-</span>
                                    <input type="number" class="score-input" id="score2-${m.match_id}" value="${m.score2 !== null ? m.score2 : ''}" placeholder="0">
                                </div>
                            </div>

                            <!-- Team 2 -->
                            <div class="match-team-container" style="flex: 2; justify-content: flex-start;">
                                <span class="match-team-name">${team2}</span>
                                <img class="team-banner-circle" src="${banner2}" onerror="this.src='../../icons/user.svg'" />
                            </div>
                        </div>
                        <div class="match-round-info" style="width: 80px; display: flex; justify-content: flex-end;">
                            <button class="save-match-btn" onclick="saveScore(${m.match_id}, ${m.round}, ${m.position})">Save</button>
                        </div>
                    `;
                    container.appendChild(row);
                });

            } catch (err) {
                container.innerHTML = `<p style="padding: 40px; text-align: center; color: #ef4444;">Error: ${err.message}</p>`;
            }
        }

        async function saveScore(matchId, round, position) {
            const s1 = document.getElementById(`score1-${matchId}`).value;
            const s2 = document.getElementById(`score2-${matchId}`).value;

            if (s1 === '' || s2 === '') {
                alert('Please specify scores for both teams');
                return;
            }

            try {
                const saveRes = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        score1: parseInt(s1),
                        score2: parseInt(s2)
                    })
                });

                if (saveRes.ok) {
                    alert('Score saved successfully');
                    loadMatches(); // Reload to refresh and show finished status
                } else {
                    const error = await saveRes.json();
                    alert('Error occurred: ' + (error.error || 'Failed to save'));
                }
            } catch (e) {
                console.error(e);
                alert('Connection error occurred');
            }
        }

        document.addEventListener('DOMContentLoaded', loadMatches);
