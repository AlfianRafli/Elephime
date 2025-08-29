// Menunggu DOM siap sebelum menjalankan script
document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const elements = {
        body: document.body,
        toggleBtn: document.getElementById('theme-toggle-button'),
        title: document.getElementById('title-text'),
        image: document.querySelector('.anime-image'),
        metaGrid: document.querySelector('.meta-grid'),
        rating: document.getElementById('rating-text'),
        synopsis: document.querySelector('.synopsis-text'),
        episodesList: document.querySelector('.episodes-list'),
        bookmarkButton: document.getElementById('bookmark-button'),
    };

    const SKELETON_CLASSES = '.skeleton, .skeleton-text';

    // === Skeleton UI Functions (BARU) ===
    const showSkeleton = () => {
        // Hapus konten sebelumnya dan tampilkan skeleton
        elements.title.textContent = '';
        elements.rating.textContent = '';
        elements.synopsis.textContent = '';
        
        // Buat skeleton untuk grid meta dan episode
        const createSkeletons = (count, className) => Array(count).fill().map(() => {
            const el = document.createElement('div');
            el.className = `${className} skeleton`;
            return el;
        });
        
        elements.metaGrid.replaceChildren(...createSkeletons(6, 'meta-item'));
        elements.episodesList.replaceChildren(...createSkeletons(12, 'episode-link'));
        
        // Tambahkan kelas skeleton ke elemen utama
        document.querySelectorAll('[id*="-text"], .anime-image, .bookmark-btn').forEach(el => el.classList.add('skeleton'));
    };
    
    const hideSkeleton = () => {
        document.querySelectorAll(SKELETON_CLASSES).forEach(el => el.classList.remove('skeleton', 'skeleton-text'));
    };

    // === Dark Mode ===
    const setupDarkMode = () => {
        const isDark = localStorage.getItem('darkMode') === 'true';
        elements.body.classList.toggle('dark', isDark);
        elements.toggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        elements.toggleBtn.addEventListener('click', () => {
            const newIsDark = elements.body.classList.toggle('dark');
            localStorage.setItem('darkMode', newIsDark);
            elements.toggleBtn.innerHTML = newIsDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    };
    
    // === UI Rendering Functions (REFACTORED) ===
    const renderMetaGrid = (data) => {
        const fragment = document.createDocumentFragment();
        const metaItems = [
            ...(data.genres || []),
            data.totalEpisode ? `Episodes: ${data.totalEpisode}` : null,
            data.status ? `Status: ${data.status}` : null,
            data.released ? `Released: ${data.released}` : null,
            data.studio ? `Studio: ${data.studio}` : null,
        ].filter(Boolean); // Hapus item yang null/undefined

        metaItems.forEach(text => {
            const item = document.createElement('div');
            item.className = 'meta-item';
            item.textContent = text;
            fragment.appendChild(item);
        });
        elements.metaGrid.replaceChildren(fragment);
    };
    
    const renderEpisodes = (data, watched) => {
        if (!data.episodes?.length) {
            elements.episodesList.innerHTML = '<p>No episodes available</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        data.episodes.forEach((ep, index) => {
            const epLink = document.createElement('a');
            epLink.href = '/watch'; // Arahkan ke halaman watch
            epLink.className = 'episode-link';
            if (watched.includes(ep.url)) epLink.classList.add('watched');
            epLink.textContent = ep.episode || index + 1;
            
            epLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Simpan data untuk halaman selanjutnya dan redirect
                localStorage.setItem('ClickedEpisode', ep.url);
                localStorage.setItem('listEpisode', JSON.stringify({ current: index, listEpisodes: data.episodes }));
                window.location.href = epLink.href;
            });
            fragment.appendChild(epLink);
        });
        elements.episodesList.replaceChildren(fragment);
    };

    // === Bookmark Logic ===
    const setupBookmarkButton = (animeData) => {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
        let isBookmarked = bookmarks.some(b => b.url === animeData.url);

        const updateButtonState = () => {
            if (isBookmarked) {
                elements.bookmarkButton.innerHTML = '<i class="fas fa-bookmark"></i> <span>Bookmarked</span>';
                elements.bookmarkButton.classList.add('bookmarked');
            } else {
                elements.bookmarkButton.innerHTML = '<i class="far fa-bookmark"></i> <span>Bookmark</span>';
                elements.bookmarkButton.classList.remove('bookmarked');
            }
        };

        elements.bookmarkButton.addEventListener('click', () => {
            const currentBookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
            const index = currentBookmarks.findIndex(b => b.url === animeData.url);
            
            if (index === -1) {
                currentBookmarks.unshift({ title: animeData.title, img: animeData.img, url: animeData.url });
            } else {
                currentBookmarks.splice(index, 1);
            }
            localStorage.setItem('bookmarks', JSON.stringify(currentBookmarks.slice(0, 100)));
            isBookmarked = !isBookmarked;
            updateButtonState();
        });

        updateButtonState();
    };

    // === Main Data Loading Function ===
    const loadAnimeData = async () => {
        showSkeleton();
        try {
            const storage = JSON.parse(localStorage.getItem('selectedAnime'));
            const selectedUrl = storage?.link || storage?.url;
            if (!selectedUrl) throw new Error('No anime selected');

            const [animeResponse, watchedResponse] = await Promise.all([
                fetch(`/API/anime?url=${encodeURIComponent(selectedUrl)}`),
                Promise.resolve(JSON.parse(localStorage.getItem('watched')) || [])
            ]);

            if (!animeResponse.ok) throw new Error('Failed to fetch anime data');
            const data = await animeResponse.json();
            if (!data?.title) throw new Error('Invalid anime data');
            
            // Simpan data lengkap untuk halaman watch
            localStorage.setItem('detail_anime', JSON.stringify({ ...data, img: storage?.img, url: selectedUrl }));
            
            // Populate UI
            elements.title.textContent = data.title;
            elements.image.style.backgroundImage = `url('${storage.img}')`;
            elements.rating.textContent = data.rating ? `${data.rating} / 10` : 'N/A';
            elements.synopsis.textContent = data.sinopsis || 'No synopsis available.';
            
            renderMetaGrid(data);
            renderEpisodes(data, watchedResponse);
            setupBookmarkButton({ title: data.title, img: storage.img, url: selectedUrl });

        } catch (error) {
            console.error('Error loading anime data:', error);
            // Tampilkan pesan error di UI
        } finally {
            hideSkeleton();
        }
    };
    
    // === Initialize App ===
    setupDarkMode();
    loadAnimeData();
});