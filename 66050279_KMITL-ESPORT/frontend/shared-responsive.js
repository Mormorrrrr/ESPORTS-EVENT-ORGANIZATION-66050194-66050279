/**
 * shared-responsive.js
 * Injects a hamburger button and sidebar toggle for mobile layout.
 * Safe on all pages — no-ops if standard header/sidebar not found.
 */
(function () {
    function init() {
        var header = document.querySelector('header.namespaced-header');
        if (!header) return;

        var left = header.querySelector('.ns-header-left');
        if (!left) return;

        // Inject hamburger button into header-left
        var btn = document.createElement('button');
        btn.className = 'sidebar-hamburger';
        btn.setAttribute('aria-label', 'Toggle navigation');
        btn.innerHTML = '<span class="hb-bar"></span>';
        left.insertBefore(btn, left.firstChild);

        // Inject full-screen overlay behind sidebar
        var overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        var sidebar = document.querySelector('.aside-sidebar');

        function openSidebar() {
            if (sidebar) sidebar.classList.add('sidebar-open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            if (sidebar) sidebar.classList.remove('sidebar-open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        btn.addEventListener('click', function () {
            if (sidebar && sidebar.classList.contains('sidebar-open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        overlay.addEventListener('click', closeSidebar);

        // Close sidebar when resizing to desktop
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) closeSidebar();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// ===== HEADER SEARCH =====
(function () {
    function initSearch() {
        var searchInput = document.querySelector('.ns-search-input');
        if (!searchInput) return;

        var currentQuery = '';

        // Watch #explore-list for changes (loadExplore is async — apply filter after it populates)
        function watchExploreList() {
            var exploreList = document.getElementById('explore-list');
            if (!exploreList) return;
            new MutationObserver(function () {
                if (currentQuery) applyFilter(currentQuery);
            }).observe(exploreList, { childList: true });
        }

        function applyFilter(query) {
            var exploreList = document.getElementById('explore-list');
            if (!exploreList) return;
            exploreList.querySelectorAll('.explore-item').forEach(function (item) {
                var text = item.textContent.toLowerCase();
                item.style.display = (!query || text.includes(query)) ? '' : 'none';
            });
        }

        function triggerSearch() {
            currentQuery = searchInput.value.trim().toLowerCase();
            var overlay = document.getElementById('modal-overlay');
            var exploreModal = document.getElementById('explore-modal');
            if (!overlay || !exploreModal) return;

            var isOpen = overlay.style.display === 'flex' && exploreModal.style.display !== 'none';
            if (!isOpen) {
                if (typeof openModal === 'function') openModal('explore-modal');
                // MutationObserver will apply filter after loadExplore finishes
            } else {
                applyFilter(currentQuery);
            }
        }

        var debounceTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(triggerSearch, 300);
        });

        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                clearTimeout(debounceTimer);
                triggerSearch();
            }
        });

        watchExploreList();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSearch);
    } else {
        initSearch();
    }
})();
