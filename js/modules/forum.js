import { api, escapeHtml as esc } from './api-client.js';
 
function formatContent(text) {
    return esc(text).replace(/\r?\n/g, '<br>');
}
 
function normalize(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
}

function formatTime(iso) {
    const d = new Date(iso);
    if (Date.now() - d.getTime() < 60000) return 'VỪA XONG';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())} THÁNG ${d.getMonth() + 1}, ${d.getFullYear()}`;
}
 
export function initForum(userProfile) {
    const feedContainer = document.getElementById('forum-feed-container');
    const btnAnon = document.getElementById('btn-toggle-anon');
    const btnSubmit = document.getElementById('btn-submit-post');
    const textarea = document.getElementById('post-textarea');
    const categorySelect = document.getElementById('post-category');
    const searchInput = document.getElementById('forum-search');
    const sortSelect = document.getElementById('forum-sort');
    
    let isAnonymous = false;
    let currentPosts = [];
 
    const commentsMap = {};
 
    const uid = userProfile.id;
 
    if (!feedContainer) return;
 
    btnAnon.addEventListener('click', () => {
        isAnonymous = !isAnonymous;
        if (isAnonymous) {
            btnAnon.classList.add('active');
            btnAnon.innerHTML = '<span class="icon">🥷</span> Đang ẩn danh';
        } else {
            btnAnon.classList.remove('active');
            btnAnon.innerHTML = '<span class="icon">👁️</span> Ẩn danh';
        }
    });
 
    function currentCategory() {
        const activeFilter = document.querySelector('.filter-tag.active');
        return activeFilter ? activeFilter.getAttribute('data-cat') : 'all';
    }
 
    function renderCurrent() {
        const cat = currentCategory();
        let list = cat === 'all' ? currentPosts : currentPosts.filter(p => p.category === cat);

        const q = normalize(searchInput ? searchInput.value.trim() : '');
        if (q) {
            list = list.filter(p => normalize([p.content, p.author, p.tags.join(' ')].join(' ')).includes(q));
        }
        if (sortSelect && sortSelect.value === 'hot') {
            list = [...list].sort((a, b) => (b.likes * 2 + b.commentCount) - (a.likes * 2 + a.commentCount));
        }
        renderFeed(list, !!q);
    }

    if (searchInput) searchInput.addEventListener('input', renderCurrent);
    if (sortSelect) sortSelect.addEventListener('change', renderCurrent);
 
    async function loadPosts() {
        feedContainer.innerHTML = '<div style="text-align:center; padding: 40px; color:#666;">Đang tải bài viết...</div>';
        try {
            currentPosts = await api.get(`/posts?userId=${uid}`);
            renderCurrent();
        } catch (err) {
            console.error('Lỗi tải bài viết:', err);
            feedContainer.innerHTML = `<div style="text-align:center; padding: 40px; color:#666;">${esc(err.message)}</div>`;
        }
    }
 
    btnSubmit.addEventListener('click', async () => {
        const content = textarea.value.trim();
        if (!content) {
            alert("Bạn ơi, nhập nội dung trước khi gửi nha!");
            return;
        }
 
        btnSubmit.innerHTML = '⏳ Đang gửi...';
        btnSubmit.disabled = true;
 
        try {
            const newPost = await api.post('/posts', {
                userId: uid,
                content: content,
                category: categorySelect.value,
                isAnonymous: isAnonymous
            });
 
            currentPosts.unshift(newPost);
 
            const cat = currentCategory();
            if (cat === 'all' || cat === newPost.category) renderCurrent();
 
            textarea.value = '';
        } catch (err) {
            alert(err.message);
        } finally {
            btnSubmit.innerHTML = 'Gửi bài ✈️';
            btnSubmit.disabled = false;
        }
    });
 
    function renderFeed(posts, searching) {
        if (posts.length === 0) {
            feedContainer.innerHTML = `<div style="text-align:center; padding: 40px; color:#666;">${searching ? 'Không tìm thấy bài viết phù hợp.' : 'Chưa có bài viết nào trong chủ đề này.'}</div>`;
            return;
        }
 
        feedContainer.innerHTML = posts.map(post => {
            const postComments = commentsMap[post.id] || [];
 
            return `
            <div class="post-card" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author-info">
                        <div class="author-avatar ${post.isAnonymous ? 'anon' : ''}">
                            ${post.isAnonymous ? '🥷' : esc(post.author.charAt(0).toUpperCase())}
                        </div>
                        <div class="author-meta">
                            <h4>
                                ${esc(post.author)} 
                                ${post.isAnonymous ? '<span class="anon-badge">ẨN DANH</span>' : ''}
                            </h4>
                            <p>🕒 ${formatTime(post.createdAt)} • ${esc(post.university)}</p>
                        </div>
                    </div>
                    ${post.isMine ? `<button class="action-btn btn-delete-post" data-id="${post.id}" style="color:#ccc;" title="Xóa bài viết">🗑️</button>` : ''}
                </div>
                
                <div class="post-content">
                    ${formatContent(post.content)}
                </div>
                
                <div class="post-tags">
                    ${post.tags.map(tag => `<span class="post-tag">${esc(tag)}</span>`).join('')}
                </div>
                
                <div class="post-footer">
                    <button class="action-btn btn-like ${post.likedByMe ? 'liked' : ''}" data-post-id="${post.id}">
                        ${post.likedByMe ? '❤️' : '🤍'} ${post.likes}
                    </button>
                    <button class="action-btn btn-toggle-comments" data-post-id="${post.id}">
                        💬 Thảo luận (${post.commentCount})
                    </button>
                </div>
 
                <div class="comments-section" id="comments-${post.id}" style="display:none;">
                    <div class="comments-list" id="comments-list-${post.id}">
                        ${renderCommentsList(postComments)}
                    </div>
                    <div class="comment-input-area">
                        <div class="author-avatar comment-avatar ${isAnonymous ? 'anon' : ''}" style="width:32px;height:32px;font-size:14px;flex-shrink:0;">
                            ${isAnonymous ? '🥷' : esc(userProfile.name.charAt(0).toUpperCase())}
                        </div>
                        <div class="comment-input-wrapper">
                            <textarea 
                                class="comment-textarea" 
                                data-post-id="${post.id}"
                                placeholder="Viết bình luận của bạn..." 
                                rows="1"
                            ></textarea>
                            <button class="btn-submit-comment" data-post-id="${post.id}">Gửi 💬</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
    }
 
    function renderCommentsList(comments) {
        if (comments.length === 0) {
            return '<p class="no-comments-text">Chưa có bình luận nào. Hãy là người đầu tiên! 🎉</p>';
        }
        return comments.map(c => `
            <div class="comment-item" id="comment-${c.id}">
                <div class="author-avatar ${c.isAnonymous ? 'anon' : ''}" style="width:32px;height:32px;font-size:14px;flex-shrink:0;">
                    ${c.isAnonymous ? '🥷' : esc(c.author.charAt(0).toUpperCase())}
                </div>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-author">${esc(c.author)}</span>
                        ${c.isAnonymous ? '<span class="anon-badge" style="font-size:9px;">ẨN DANH</span>' : ''}
                        <span class="comment-time">• ${formatTime(c.createdAt)}</span>
                    </div>
                    <div class="comment-content">${formatContent(c.content)}</div>
                </div>
                ${c.isMine ? `<button class="btn-delete-comment" data-comment-id="${c.id}" data-post-id="${c.postId}" title="Xóa bình luận">🗑️</button>` : ''}
            </div>
        `).join('');
    }
 
    function updateCommentCount(postId) {
        const post = currentPosts.find(p => p.id === postId);
        if (!post) return;
        const btn = feedContainer.querySelector(`.btn-toggle-comments[data-post-id="${postId}"]`);
        if (btn) btn.innerHTML = `💬 Thảo luận (${post.commentCount})`;
    }
 
    function refreshCommentsList(postId) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        if (commentsList) commentsList.innerHTML = renderCommentsList(commentsMap[postId] || []);
    }
 
    const filters = document.querySelectorAll('.filter-tag, .topic-list li');
    filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.currentTarget.getAttribute('data-cat');
            
            filters.forEach(f => f.classList.remove('active'));
            document.querySelectorAll(`[data-cat="${cat}"]`).forEach(el => el.classList.add('active'));
 
            renderCurrent();
        });
    });
 
    feedContainer.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.btn-like');
        if (likeBtn) {
            const postId = Number(likeBtn.getAttribute('data-post-id'));
            try {
                const result = await api.post(`/posts/${postId}/like`, { userId: uid });
                const post = currentPosts.find(p => p.id === postId);
                if (post) {
                    post.likes = result.likes;
                    post.likedByMe = result.liked;
                }
                likeBtn.classList.toggle('liked', result.liked);
                likeBtn.innerHTML = `${result.liked ? '❤️' : '🤍'} ${result.likes}`;
            } catch (err) {
                alert(err.message);
            }
            return;
        }
 
        const deleteBtn = e.target.closest('.btn-delete-post');
        if (deleteBtn) {
            const postId = Number(deleteBtn.getAttribute('data-id'));
            const isConfirmed = confirm('Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác đâu nhé!');
            
            if (isConfirmed) {
                try {
                    await api.del(`/posts/${postId}?userId=${uid}`);
                } catch (err) {
                    alert(err.message);
                    return;
                }
                currentPosts = currentPosts.filter(p => p.id !== postId);
                delete commentsMap[postId];
                
                // Render lại danh sách dựa theo tab đang chọn
                renderCurrent();
            }
            return;
        }
 
        const toggleBtn = e.target.closest('.btn-toggle-comments');
        if (toggleBtn) {
            const postId = Number(toggleBtn.getAttribute('data-post-id'));
            const section = document.getElementById(`comments-${postId}`);
            if (section) {
                const isHidden = section.style.display === 'none';
                section.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    const ta = section.querySelector('.comment-textarea');
                    if (ta) ta.focus();
 
                    if (!commentsMap[postId]) {
                        const list = document.getElementById(`comments-list-${postId}`);
                        if (list) list.innerHTML = '<p class="no-comments-text">Đang tải bình luận...</p>';
                        try {
                            commentsMap[postId] = await api.get(`/posts/${postId}/comments?userId=${uid}`);
                        } catch (err) {
                            if (list) list.innerHTML = `<p class="no-comments-text">${esc(err.message)}</p>`;
                            return;
                        }
                        refreshCommentsList(postId);
                    }
                }
            }
            return;
        }
 
        const submitCommentBtn = e.target.closest('.btn-submit-comment');
        if (submitCommentBtn) {
            const postId = Number(submitCommentBtn.getAttribute('data-post-id'));
            const section = document.getElementById(`comments-${postId}`);
            const commentTextarea = section.querySelector(`.comment-textarea[data-post-id="${postId}"]`);
            const content = commentTextarea.value.trim();
 
            if (!content) {
                commentTextarea.focus();
                commentTextarea.placeholder = 'Nhập nội dung bình luận đã nha! 👀';
                return;
            }
 
            submitCommentBtn.disabled = true;
            try {
                const newComment = await api.post(`/posts/${postId}/comments`, {
                    userId: uid,
                    content: content,
                    isAnonymous: isAnonymous
                });
 
                // Nếu chưa mở danh sách lần nào thì tải đủ bình luận cũ trước khi thêm
                if (!commentsMap[postId]) {
                    commentsMap[postId] = await api.get(`/posts/${postId}/comments?userId=${uid}`);
                } else {
                    commentsMap[postId].push(newComment);
                }
 
                const post = currentPosts.find(p => p.id === postId);
                if (post) post.commentCount += 1;
 
                refreshCommentsList(postId);
                updateCommentCount(postId);
 
                commentTextarea.value = '';
                commentTextarea.placeholder = 'Viết bình luận của bạn...';
                commentTextarea.rows = 1;
            } catch (err) {
                alert(err.message);
            } finally {
                submitCommentBtn.disabled = false;
            }
            return;
        }
 
        const deleteCommentBtn = e.target.closest('.btn-delete-comment');
        if (deleteCommentBtn) {
            const commentId = Number(deleteCommentBtn.getAttribute('data-comment-id'));
            const postId = Number(deleteCommentBtn.getAttribute('data-post-id'));
            const isConfirmed = confirm('Xóa bình luận này không?');
 
            if (isConfirmed && commentsMap[postId]) {
                try {
                    await api.del(`/comments/${commentId}?userId=${uid}`);
                } catch (err) {
                    alert(err.message);
                    return;
                }
                commentsMap[postId] = commentsMap[postId].filter(c => c.id !== commentId);
 
                const post = currentPosts.find(p => p.id === postId);
                if (post) post.commentCount = Math.max(0, post.commentCount - 1);
 
                refreshCommentsList(postId);
                updateCommentCount(postId);
            }
            return;
        }
    });
 
    feedContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('comment-textarea')) {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        }
    });
 
    feedContainer.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('comment-textarea') && e.key === 'Enter' && e.ctrlKey) {
            const postId = e.target.getAttribute('data-post-id');
            const submitBtn = feedContainer.querySelector(`.btn-submit-comment[data-post-id="${postId}"]`);
            if (submitBtn) submitBtn.click();
        }
    });
 
    loadPosts();
}
