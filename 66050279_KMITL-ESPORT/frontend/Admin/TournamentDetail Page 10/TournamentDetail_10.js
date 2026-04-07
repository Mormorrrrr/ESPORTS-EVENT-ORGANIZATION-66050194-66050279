(function () { var u = JSON.parse(localStorage.getItem("user") || "null"); if (u && u.username) document.getElementById("header-username").textContent = u.username; })();
                    function logoutUser() { if (confirm("Do you want to logout?")) { localStorage.removeItem("user"); window.location.href = "../../Login Page/login.html"; } }

document.addEventListener('DOMContentLoaded', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const tournamentId = urlParams.get('id');
            const $bracket = $('#bracket');

            // Debug: Highlight the container
            $bracket.parent().css('border', '1px dashed #ccc');

            if (!tournamentId) {
                $bracket.html('<p style="text-align:center; color:#94a3b8; padding: 40px;">No tournament ID provided. Please use ?id=1</p>');
                return;
            }

            try {
                console.log('Fetching tournament:', tournamentId);
                const res = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}`);
                const tournament = await res.json();

                // Dynamic Data Binding
                $('#tournament-name').text(tournament.tournament_name || 'Tournament');
                const fallbackBanner = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200';
                const bannerImg = document.getElementById('banner-img');
                bannerImg.src = tournament.tournament_banner || fallbackBanner;
                bannerImg.onerror = () => bannerImg.src = fallbackBanner;

                // Bind Description
                if (tournament.description) {
                    $('#tournament-description-banner').text(tournament.description).show();
                } else {
                    $('#tournament-description-banner').hide();
                }

                $('#details-section .text-2').text(tournament.tournament_type || 'Single Elimination');
                $('#details-section .text-4').text(tournament.duration || 'TBD');
                if (tournament.age_min && tournament.age_max) {
                    $('#details-section .p').text(`${tournament.age_min} - ${tournament.age_max} years old`);
                }
                $('#details-section .text-7').text(tournament.format || 'TBD');
                if (tournament.match_date) {
                    const mDateObj = new Date(tournament.match_date);
                    const mDate = mDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    const mTime = mDateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    $('#match-date-display').text(`${mDate} · ${mTime}`);
                }

                if (tournament.start_date) {
                    const sDate = new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    $('#dates-section .text-wrapper-2').text(sDate);
                }
                if (tournament.end_date) {
                    const eDate = new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    $('#dates-section .text-wrapper-3').text(eDate);
                }

                const seenCounts = {};
                const teams = (tournament.Application || tournament.applications || [])
                    .filter(app => app.status === 'Approved')
                    .sort((a, b) => (a.app_id || 0) - (b.app_id || 0))
                    .map(app => {
                        const name = (app.Team || app.team || {}).team_name;
                        if (!name) return null;
                        seenCounts[name] = (seenCounts[name] || 0) + 1;
                        return name + '\u200B'.repeat(seenCounts[name] - 1);
                    })
                    .filter(name => name);

                const bracketTeams = [];
                for (let i = 0; i < teams.length; i += 2) {
                    bracketTeams.push([teams[i], teams[i + 1] || "TBD"]);
                }

                // Use cache breaker to ensure we get latest matches from server
                console.log('Fetching matches for tournament:', tournamentId);
                const matchesRes = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/matches?t=${Date.now()}`);
                const matches = await matchesRes.json();
                let localMatches = Array.isArray(matches) ? [...matches] : [];
                window.currentMatches = localMatches; // Store globally for sync

                const bracketData = {
                    teams: bracketTeams,
                    results: []
                };

                // Prepare results structure based on number of rounds
                const numRounds = Math.max(1, Math.ceil(Math.log2(teams.length)));
                for (let r = 0; r < numRounds; r++) {
                    const round = [];
                    const expectedMatches = Math.pow(2, numRounds - r - 1);
                    for (let m = 0; m < expectedMatches; m++) round.push([null, null]);
                    bracketData.results.push(round);
                }

                // Map existing matches from DB
                if (matches && matches.length > 0) {
                    matches.forEach(m => {
                        // Diagnostic only - we show what's in DB
                        // WB: 1, 2, 3...
                        // LB: -1, -2, -3...
                        // Finals: 101, 102...
                    });
                }

                console.log('Rendering Custom Interactive Bracket');
                $('#bracket-diagnostic').text(`Loaded ${teams.length} teams, ${matches.length} matches.`);

                const teamLimits = {
                    'Single Elimination': teams.length,
                    'Double Elimination': teams.length
                };

                // Support Format Toggle
                let currentFormat = tournament.tournament_type || 'Single Elimination';
                if (currentFormat.includes('Double')) currentFormat = 'Double Elimination';
                else currentFormat = 'Single Elimination';
                $('#format-toggle').val(currentFormat);

                $('#format-toggle').on('change', function () {
                    currentFormat = $(this).val();
                    renderCurrentBracket();
                });

                // Protection: Prevent accidental reloads or navigation while editing
                let isDirty = false;
                window.addEventListener('beforeunload', (e) => {
                    if (isDirty) {
                        e.preventDefault();
                        e.returnValue = 'You have unsaved changes in the bracket. Are you sure you want to leave?';
                    }
                });

                const saveMatchesToDB = (matchesToSave, tournamentType) => {
                    const $status = $('#save-status');
                    const $btn = $('#save-bracket-btn');
                    
                    $status.text('⏳ Saving data...').css('color', '#6b7280');
                    $btn.prop('disabled', true).css({'opacity': '0.7', 'cursor': 'not-allowed'});

                    return fetch(`${API_BASE_URL}/tournaments/${tournamentId}/matches/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            matches: matchesToSave,
                            tournament_type: tournamentType
                        })
                    })
                        .then(res => {
                            if (!res.ok) return res.json().then(d => { throw new Error(d.message || 'Server error ' + res.status); });
                            return res.json();
                        })
                        .then(res => {
                            isDirty = false;
                            $status.text('✅ Saved successfully!').css('color', '#10b981');
                            $btn.prop('disabled', false).css({'opacity': '1', 'cursor': 'pointer'});
                            
                            // Re-sync local state with server data
                            if (res && res.matches && Array.isArray(res.matches)) {
                                console.log('Syncing local state with saved matches:', res.matches.length);
                                localMatches = [...res.matches];
                                window.currentMatches = localMatches;
                                
                                // REMOVED renderCurrentBracket() here to prevent unnecessary UI flicker
                                // since the bracket already shows the values the user typed.
                            }
                            
                            setTimeout(() => $status.text(''), 3000);
                            return res;
                        })
                        .catch(err => {
                            console.error('[Save Match]', err);
                            $status.text('❌ Save failed: ' + err.message).css('color', '#ef4444');
                            $btn.prop('disabled', false).css({'opacity': '1', 'cursor': 'pointer'});
                            throw err;
                        });
                };

                const injectBracket = (data, isDouble, currentBracketTeams) => {
                    const iframeHtml = '\x3C!DOCTYPE html\x3E\x3Chtml\x3E\x3Chead\x3E\x3Cmeta charset="utf-8"\x3E'
                        + '\x3Clink rel="stylesheet" href="../../lib/jquery-bracket/jquery.bracket.min.css"\x3E'
                        + '\x3Cscript src="../../lib/jquery-bracket/jquery-3.6.0.min.js"\x3E\x3C/script\x3E'
                        + '\x3Cscript src="../../lib/jquery-bracket/jquery.bracket.min.js"\x3E\x3C/script\x3E'
                        + '\x3Cstyle\x3E'
                        + 'body{margin:0;padding:16px;background:transparent;overflow-x:auto;}'
                        + '.jQBracket .tools{display:none!important;}'
                        + '.jQBracket .loser{margin-top:8px!important;}'
                        + '/* Fix Conflict with style10.css .match class */'
                        + '.jQBracket .match { position: relative !important; top: auto !important; left: auto !important; display: block !important; }'
                        + '\x3C/style\x3E'
                        + '\x3C/head\x3E\x3Cbody\x3E\x3Cdiv id="bc"\x3E\x3C/div\x3E\x3C/body\x3E\x3C/html\x3E';

                    const iframe = document.createElement('iframe');
                    iframe.srcdoc = iframeHtml;
                    iframe.style.cssText = 'width:100%;min-height:600px;border:none;background:transparent;';
                    $bracket.empty().append(iframe);

                    iframe.onload = () => {
                        const win = iframe.contentWindow;
                        if (!win || !win.jQuery) return;
                        win.jQuery('#bc').bracket({
                            init: data,
                            save: function(data) {
                                // Placeholder to enable editing. 
                                // We pull final state via .bracket('data') on the main Save button click.
                                console.log('Bracket UI updated');
                            }
                        });

                        setTimeout(() => {
                            if (isDouble) {
                                const bracket = win.document.querySelector('.bracket');
                                const loserBracket = win.document.querySelector('.loserBracket');
                                if (bracket && loserBracket) {
                                    // Find actual bottom edge of last WB match
                                    const wbMatches = bracket.querySelectorAll('.match');
                                    let wbBottom = bracket.getBoundingClientRect().top;
                                    wbMatches.forEach(m => {
                                        const r = m.getBoundingClientRect();
                                        if (r.bottom > wbBottom) wbBottom = r.bottom;
                                    });
                                    // Find actual top edge of first LB match
                                    const lbMatches = loserBracket.querySelectorAll('.match');
                                    let lbTop = loserBracket.getBoundingClientRect().bottom;
                                    lbMatches.forEach(m => {
                                        const r = m.getBoundingClientRect();
                                        if (r.top < lbTop) lbTop = r.top;
                                    });
                                    const gap = lbTop - wbBottom;
                                    if (gap > 20) {
                                        const loserStyle = win.getComputedStyle(loserBracket);
                                        if (loserStyle.position === 'absolute') {
                                            const currentTop = parseInt(loserStyle.top) || 0;
                                            loserBracket.style.top = (currentTop - (gap - 20)) + 'px';
                                        } else {
                                            const currentMarginTop = parseInt(loserStyle.marginTop) || 0;
                                            loserBracket.style.marginTop = (currentMarginTop - (gap - 20)) + 'px';
                                        }
                                    }
                                }
                            }
                            const h = win.document.body.scrollHeight;
                            if (h > 0) iframe.style.minHeight = (h + 40) + 'px';
                        }, 1200);
                    };
                };

                const renderDoubleBracket = () => {
                    $bracket.empty();
                    $('#single-controls').css('display', 'flex');
                    $('#save-bracket-btn').show();

                    // Auto-detect required bracket size from saved matches so that
                    // a refresh never shrinks the bracket below what was saved.
                    const maxWBRound = localMatches
                        .filter(m => m.round > 0 && m.round < 100)
                        .reduce((max, m) => Math.max(max, m.round), 0);
                    if (maxWBRound > 0) {
                        const requiredNTeams = Math.pow(2, maxWBRound);
                        teamLimits['Double Elimination'] = Math.max(teamLimits['Double Elimination'], requiredNTeams);
                    }

                    const nTeams = Math.pow(2, Math.ceil(Math.log2(Math.max(2, teamLimits['Double Elimination']))));
                    const bracketTeams = [];
                    for (let i = 0; i < nTeams; i += 2) {
                        bracketTeams.push([teams[i] || null, teams[i + 1] || null]);
                    }

                    const wbRoundsCount = Math.log2(nTeams);
                    const wb = [];
                    let mCount = nTeams / 2;
                    for (let r = 0; r < wbRoundsCount; r++) {
                        wb.push(Array.from({ length: mCount }, () => [null, null]));
                        mCount /= 2;
                    }

                    const lbRoundsCount = (wbRoundsCount > 1) ? (2 * wbRoundsCount - 2) : 0;
                    const lb = [];
                    let lbc = nTeams / 4;
                    for (let r = 0; r < lbRoundsCount; r++) {
                        lb.push(Array.from({ length: Math.floor(lbc) }, () => [null, null]));
                        if (r % 2 === 1) lbc /= 2;
                    }

                    const finals = [[null, null], [null, null]];
                    console.log(`[Loading Double] Rounds - WB: ${wbRoundsCount}, LB: ${lbRoundsCount}. Matches: ${localMatches.length}`);
                    
                    localMatches.forEach(m => {
                        try {
                            if (m.round > 0 && m.round < 100) {
                                if (wb[m.round - 1] && wb[m.round - 1][m.position] !== undefined) {
                                    wb[m.round - 1][m.position] = [m.score1, m.score2];
                                }
                            } else if (m.round < 0) {
                                let ri = Math.abs(m.round) - 1;
                                if (lb[ri] && lb[ri][m.position] !== undefined) {
                                    lb[ri][m.position] = [m.score1, m.score2];
                                }
                            } else if (m.round >= 101) {
                                let matchIdx = m.round - 101; 
                                if (finals[matchIdx] !== undefined) {
                                    finals[matchIdx] = [m.score1, m.score2];
                                }
                            }
                        } catch (e) {
                            console.warn('Skipping match load error:', e, m);
                        }
                    });
                    console.log('[Loading Double] Prepared results:', [wb, lb, [finals]]);
                    injectBracket({ teams: bracketTeams, results: [wb, lb, [finals]] }, true, bracketTeams);
                };

                const renderSingleBracket = () => {
                    $bracket.empty();
                    $('#single-controls').css('display', 'flex');
                    $('#save-bracket-btn').show();

                    const nTeams = Math.pow(2, Math.ceil(Math.log2(Math.max(2, teamLimits['Single Elimination']))));
                    const bracketTeams = [];
                    for (let i = 0; i < nTeams; i += 2) {
                        bracketTeams.push([teams[i] || null, teams[i + 1] || null]);
                    }

                    let slotTeams = Array.from({ length: nTeams }, (_, i) => teams[i] || 'BYE');
                    const wbRoundsCount = Math.log2(nTeams);
                    const results = [];
                    for (let r = 0; r < wbRoundsCount; r++) {
                        const roundArr = [], nextSlot = [];
                        const matchCount = slotTeams.length / 2;
                        for (let m = 0; m < matchCount; m++) {
                            const t1 = slotTeams[m * 2], t2 = slotTeams[m * 2 + 1];
                            const md = localMatches.find(x => x.round === r + 1 && x.position === m);
                            let score = md ? [md.score1, md.score2] : [null, null];
                            if (score[0] === null && score[1] === null) {
                                if (t1 !== 'BYE' && t2 === 'BYE') score = [1, 0];
                                else if (t1 === 'BYE' && t2 !== 'BYE') score = [0, 1];
                            }
                            const winner = (t1 === 'BYE' && t2 === 'BYE') ? 'BYE'
                                : (score[0] !== null && score[1] !== null) ? (score[0] >= score[1] ? t1 : t2) : 'TBD';
                            nextSlot.push(winner);
                            roundArr.push(score);
                        }
                        results.push(roundArr);
                        slotTeams = nextSlot;
                    }
                    console.log('Final Prepared Single Results:', results);
                    injectBracket({ teams: bracketTeams, results: results }, false, bracketTeams);
                };

                const renderCurrentBracket = () => {
                    if (currentFormat === 'Double Elimination') renderDoubleBracket();
                    else renderSingleBracket();
                };

                // Events
                // Removed old $bracket.on('input change keyup', '.score-input', ...) as iframe handles it

                // Control Button Handlers
                $('#btn-plus').on('click', () => {
                    teamLimits[currentFormat]++;
                    renderCurrentBracket();
                });

                $('#btn-minus').on('click', () => {
                    if (teamLimits[currentFormat] > 2) {
                        teamLimits[currentFormat]--;
                        renderCurrentBracket();
                    }
                });

                $('#btn-reset').on('click', () => {
                    teamLimits[currentFormat] = teams.length;
                    renderCurrentBracket();
                });

                // Manual Save Handling — Pull data DIRECTLY from bracket component on click
                $('#save-bracket-btn').off('click').on('click', async function (e) {
                    if (e) { e.preventDefault(); e.stopPropagation(); }
                    console.log('--- SAVE INITIATED: Direct State Capture ---');
                    const iframe = $bracket.find('iframe')[0];
                    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.jQuery) {
                        alert('❌ Bracket component not found. Please reload the page.');
                        return;
                    }

                    try {
                        const win = iframe.contentWindow;
                        const $ = win.jQuery;
                        
                        // CRITICAL: Force blur on ANY focused input inside the iframe
                        // This ensures the bracket library's internal 'data' is updated
                        // with the value currently being typed.
                        const activeEl = win.document.activeElement;
                        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.contentEditable === 'true')) {
                            activeEl.blur();
                            console.log('Forced blur on active element in bracket iframe');
                        }
                        
                        const $bc = $('#bc', win.document);
                        
                        // Extract RAW data directly from jquery-bracket internal state
                        const newData = $bc.bracket('data');
                        window.debugData = newData; // For console inspection
                        console.log('[DEBUG] results[0] (WB) rounds:', newData.results[0]?.length, 'first round matches:', newData.results[0]?.[0]?.length);
                        console.log('[DEBUG] results[1] (LB) rounds:', newData.results[1]?.length, 'first round matches:', newData.results[1]?.[0]?.length);
                        console.log('[DEBUG] results[2] (Finals):', JSON.stringify(newData.results[2]));
                        console.log('[DEBUG] teams count:', newData.teams?.length, 'sample team:', JSON.stringify(newData.teams?.[0]));
                        
                        const type = currentFormat;
                        const isDouble = (type === 'Double Elimination');
                        
                        const nTeams = Math.pow(2, Math.ceil(Math.log2(Math.max(2, teamLimits[type] || teams.length))));
                        const wbRoundsCount = Math.log2(nTeams);
                        
                        const flatScore = (v, idx) => {
                            if (v === null || v === undefined || v === '') return null;
                            const val = Array.isArray(v) ? (Array.isArray(v[0]) ? v[0][idx] : v[idx]) : v;
                            const parsed = parseInt(val);
                            return isNaN(parsed) ? null : parsed;
                        };
                        const getS1 = (m) => flatScore(m, 0);
                        const getS2 = (m) => flatScore(m, 1);

                        const nameMap = {};
                        const bracketTeams = newData.teams || [];
                        const finalMatches = [];

                        const nwb = newData.results[0] || [];
                        const nlb = newData.results[1] || [];
                        const nfinals = newData.results[2] || [];

                        if (isDouble) {
                            // 1. Initial State for Double

                            // Seed Round 1
                            nwb[0]?.forEach((m, p) => {
                                nameMap[`1:${p}`] = {
                                    t1: bracketTeams[p] ? bracketTeams[p][0] : null,
                                    t2: bracketTeams[p] ? bracketTeams[p][1] : null
                                };
                            });

                            // Process WB
                            nwb.forEach((round, r) => {
                                if (!Array.isArray(round)) return;
                                round.forEach((m, p) => {
                                    const rNum = r + 1, s1 = getS1(m), s2 = getS2(m);
                                    const names = nameMap[`${rNum}:${p}`] || { t1: null, t2: null };
                                    finalMatches.push({ round: rNum, position: p, score1: s1, score2: s2, team1_name: names.t1, team2_name: names.t2 });
                                    if (s1 !== null && s2 !== null) {
                                        const winner = s1 >= s2 ? names.t1 : names.t2;
                                        const loser = s1 >= s2 ? names.t2 : names.t1;
                                        const nextWBR = rNum + 1, nextWBP = Math.floor(p / 2);
                                        if (nwb[r + 1]) {
                                            if (!nameMap[`${nextWBR}:${nextWBP}`]) nameMap[`${nextWBR}:${nextWBP}`] = { t1: null, t2: null };
                                            if (p % 2 === 0) nameMap[`${nextWBR}:${nextWBP}`].t1 = winner; else nameMap[`${nextWBR}:${nextWBP}`].t2 = winner;
                                        } else { if (!nameMap[`101:0`]) nameMap[`101:0`] = { t1: null, t2: null }; nameMap[`101:0`].t1 = winner; }
                                        const lbR = (rNum === 1) ? -1 : -(2 * rNum - 2);
                                        const lbP = (rNum === 1) ? Math.floor(p / 2) : p;
                                        if (!nameMap[`${lbR}:${lbP}`]) nameMap[`${lbR}:${lbP}`] = { t1: null, t2: null };
                                        if (rNum === 1) { if (p % 2 === 0) nameMap[`${lbR}:${lbP}`].t1 = loser; else nameMap[`${lbR}:${lbP}`].t2 = loser; } else { nameMap[`${lbR}:${lbP}`].t2 = loser; }
                                    }
                                });
                            });

                            // Process LB
                            nlb.forEach((round, r) => {
                                if (!Array.isArray(round)) return;
                                round.forEach((m, p) => {
                                    const rNum = -(r + 1), s1 = getS1(m), s2 = getS2(m);
                                    const names = nameMap[`${rNum}:${p}`] || { t1: null, t2: null };
                                    finalMatches.push({ round: rNum, position: p, score1: s1, score2: s2, team1_name: names.t1, team2_name: names.t2 });
                                    if (s1 !== null && s2 !== null) {
                                        const winner = s1 >= s2 ? names.t1 : names.t2;
                                        const nextLBR = rNum - 1;
                                        if (nlb[r + 1]) {
                                            const isDoubleRound = (Math.abs(rNum) % 2 === 0);
                                            const nextLBP = isDoubleRound ? Math.floor(p / 2) : p;
                                            if (!nameMap[`${nextLBR}:${nextLBP}`]) nameMap[`${nextLBR}:${nextLBP}`] = { t1: null, t2: null };
                                            if (isDoubleRound) { if (p % 2 === 0) nameMap[`${nextLBR}:${nextLBP}`].t1 = winner; else nameMap[`${nextLBR}:${nextLBP}`].t2 = winner; } else { nameMap[`${nextLBR}:${nextLBP}`].t1 = winner; }
                                        } else { if (!nameMap[`101:0`]) nameMap[`101:0`] = { t1: null, t2: null }; nameMap[`101:0`].t2 = winner; }
                                    }
                                });
                            });

                            // Process Finals
                            // nfinals = [GF1_match, GF2_match]
                            // Each match = [[game1_s1, game1_s2], [game2_s1, game2_s2], ...]
                            // nfinals = [GF_Round]
                            // GF_Round = [GF1_match, GF2_match]
                            nfinals.forEach((round, ri) => {
                                if (!Array.isArray(round)) return;
                                round.forEach((match, mi) => {
                                    const rNum = 101 + mi; // 0 -> 101, 1 -> 102
                                    const s1 = getS1(match), s2 = getS2(match);
                                    const names = nameMap[`${rNum}:0`] || { t1: null, t2: null };
                                    finalMatches.push({ round: rNum, position: 0, score1: s1, score2: s2, team1_name: names.t1, team2_name: names.t2 });
                                    if (s1 !== null && s2 !== null) {
                                        const winner = s1 >= s2 ? names.t1 : names.t2;
                                        const loser = s1 >= s2 ? names.t2 : names.t1;
                                        if (rNum === 101) {
                                            if (!nameMap[`102:0`]) nameMap[`102:0`] = { t1: winner, t2: loser };
                                        }
                                    }
                                });
                            });
                        } else {
                            // single mapping logic ...
                            nwb.forEach((round, r) => round.forEach((match, m) => {
                                const rNum = r + 1, s1 = getS1(match), s2 = getS2(match);
                                if (r === 0) nameMap[`1:${m}`] = { t1: bracketTeams[m] ? bracketTeams[m][0] : null, t2: bracketTeams[m] ? bracketTeams[m][1] : null };
                                const names = nameMap[`${rNum}:${m}`] || { t1: null, t2: null };
                                finalMatches.push({ round: rNum, position: m, score1: s1, score2: s2, team1_name: names.t1, team2_name: names.t2 });
                                if (s1 !== null && s2 !== null) {
                                    const winner = s1 >= s2 ? names.t1 : names.t2;
                                    const nextR = rNum + 1, nextP = Math.floor(m / 2);
                                    if (!nameMap[`${nextR}:${nextP}`]) nameMap[`${nextR}:${nextP}`] = { t1: null, t2: null };
                                    if (m % 2 === 0) nameMap[`${nextR}:${nextP}`].t1 = winner; else nameMap[`${nextR}:${nextP}`].t2 = winner;
                                }
                            }));
                        }

                        console.log('Mapped Final Matches for DB Insertion:', finalMatches.length);
                        if (finalMatches.length > 0) console.log('Sample match:', finalMatches[0]);

                        if (finalMatches.length === 0) {
                            throw new Error('No data to save (Mapped matches are empty)');
                        }

                        await saveMatchesToDB(finalMatches, type);
                        alert(`✅ Scores saved successfully!\nSystem has recorded ${finalMatches.length} matches.`);
                        // localMatches is updated inside saveMatchesToDB.then now
                    } catch (err) {
                        console.error('CRITICAL SAVE ERROR:', err);
                        alert(`❌ An error occurred during saving: ${err.message}`);
                    }
                });

                // Initial Render
                console.log('Starting Bracket Render. Format:', currentFormat);
                renderCurrentBracket();
                console.log('Bracket Rendered Successfully.');

            } catch (error) {
                console.error('Bracket Error:', error);
                $bracket.html('<p style="color:red; text-align:center; padding: 20px;">Error: ' + error.message + '</p>');
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
