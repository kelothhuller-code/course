// Comments Module
window.CommentsModule = {
    state: {
        comments: []
    },

    setComments(comments) {
        this.state.comments = comments;
    },

    buildHtml(comments) {
        this.setComments(comments);

        if (!comments || comments.length === 0) {
            return '<p class="text-muted" style="padding:16px;text-align:center;">No comments in this course yet.</p>';
        }

        const topLevelComments = comments.filter(c => !c.parentCommentId);

        if (topLevelComments.length === 0) {
            return '<p class="text-muted" style="padding:16px;text-align:center;">No top-level comments found.</p>';
        }

        return topLevelComments.map(c => {
            const hasReplies = c.replies && c.replies.length > 0;
            const isOpen = c.status !== 'closed';

            return `
                <div class="comment" style="border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:12px;background:${isOpen ? 'var(--bg)' : 'var(--bg-muted)'};">
                    <div class="comment-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span class="comment-author" style="font-weight:600;color:var(--primary);">
                                ${Helpers.safeString(c.userId?.name, 'Unknown User')}
                            </span>
                            <span class="comment-date" style="color:var(--text-muted);font-size:0.8rem;">
                                ${Helpers.formatDateTime(c.createdAt)}
                            </span>
                            <span class="comment-status" style="font-size:0.7rem;padding:2px 10px;border-radius:12px;background:${isOpen ? 'var(--success)' : 'var(--danger)'};color:white;">
                                ${isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                            ${hasReplies ? `<span style="font-size:0.7rem;color:var(--text-muted);">${c.replies.length} replies</span>` : ''}
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button class="btn ${isOpen ? 'btn-secondary' : 'btn-primary'}" 
                                    style="padding:2px 10px;font-size:0.7rem;" 
                                    onclick="CommentsModule.toggleStatus('${c._id}')">
                                ${isOpen ? 'Close' : 'Re-open'}
                            </button>
                        </div>
                    </div>
                    <div class="comment-body" style="margin-bottom:12px;">${c.text}</div>
                    <div class="comment-actions" style="display:flex;gap:8px;align-items:center;">
                        <button class="btn btn-secondary" style="padding:4px 12px;font-size:0.8rem;" 
                                onclick="CommentsModule.toggleReplyBox('${c._id}')">
                            💬 Reply
                        </button>
                    </div>
                    
                    <div id="reply-box-${c._id}" style="display:none;margin-top:12px;">
                        <textarea class="form-control" id="reply-text-${c._id}" rows="2" placeholder="Write a reply..."></textarea>
                        <button class="btn btn-primary" style="margin-top:8px;padding:4px 12px;" 
                                onclick="CommentsModule.submitReply('${c._id}')">Send Reply</button>
                    </div>

                    ${hasReplies ? `
                    <div class="reply-list" style="margin-top:12px;padding-left:24px;border-left:3px solid var(--border);">
                        ${c.replies.map(r => `
                            <div class="reply" style="padding:8px 0;border-bottom:1px solid var(--border-light);">
                                <div class="comment-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span class="comment-author" style="font-weight:500;color:var(--success);">
                                        ${Helpers.safeString(r.userId?.name, 'Admin')}
                                    </span>
                                    <span class="comment-date" style="color:var(--text-muted);font-size:0.7rem;">
                                        ${Helpers.formatDate(r.createdAt)}
                                    </span>
                                </div>
                                <div class="comment-body" style="margin-bottom:0;">${r.text}</div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    filter(filterType) {
        const buttons = document.querySelectorAll('#tab-discussion .panel-header .btn');
        buttons.forEach(btn => {
            btn.className = 'btn btn-secondary';
            btn.style.padding = '4px 12px';
            btn.style.fontSize = '0.8rem';
        });

        const filterMap = { all: 0, unreplied: 1, open: 2, closed: 3, latest: 4 };
        const index = filterMap[filterType];
        if (index !== undefined && buttons[index]) {
            buttons[index].className = 'btn btn-primary';
            buttons[index].style.padding = '4px 12px';
            buttons[index].style.fontSize = '0.8rem';
        }

        let filtered = [...this.state.comments];
        let topLevel = filtered.filter(c => !c.parentCommentId);

        switch (filterType) {
            case 'unreplied':
                topLevel = topLevel.filter(c => !c.replies || c.replies.length === 0);
                break;
            case 'open':
                topLevel = topLevel.filter(c => c.status !== 'closed');
                break;
            case 'closed':
                topLevel = topLevel.filter(c => c.status === 'closed');
                break;
            case 'latest':
                topLevel.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        const container = document.getElementById('course-comments-container');
        if (container) {
            container.innerHTML = this.buildHtml(topLevel);
        }
    },

    toggleReplyBox(commentId) {
        const box = document.getElementById(`reply-box-${commentId}`);
        if (box) {
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        }
    },

    async toggleStatus(commentId) {
        try {
            const comment = this.state.comments.find(c => c._id === commentId);
            if (!comment) return;

            const newStatus = comment.status === 'closed' ? 'open' : 'closed';
            await API.updateCommentStatus(commentId, newStatus);

            comment.status = newStatus;
            this.filter('all');
        } catch (error) {
            alert('Error updating comment status: ' + error.message);
        }
    },

    async submitReply(commentId) {
        const textInput = document.getElementById(`reply-text-${commentId}`);
        const text = textInput.value.trim();

        if (!text) return alert('Reply cannot be empty');

        try {
            const data = await API.replyToComment(commentId, text);

            const comment = this.state.comments.find(c => c._id === commentId);
            if (comment) {
                if (!comment.replies) comment.replies = [];
                comment.replies.push({
                    _id: data.replyId || Date.now().toString(),
                    text: text,
                    userId: { name: 'Admin' },
                    createdAt: new Date().toISOString()
                });
            }

            this.filter('all');
            textInput.value = '';
            document.getElementById(`reply-box-${commentId}`).style.display = 'none';
        } catch (error) {
            alert('Error posting reply: ' + error.message);
        }
    }
};