document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    const userId = document.body.dataset.userId;
    
    if (userId) {
        socket.emit('join', userId);
    }
    
    socket.on('notification', function(data) {
        updateNotificationBadge();
        showToast(data.message);
    });
    
    socket.on('newMessage', function(data) {
        updateNotificationBadge();
        showToast('New message received');
    });
    
    function updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            let count = parseInt(badge.textContent) || 0;
            count++;
            badge.textContent = count;
            badge.classList.remove('d-none');
            badge.style.display = 'inline-block';
        }
    }
    
    function showToast(message) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        const toastEl = document.createElement('div');
        toastEl.className = 'toast show';
        toastEl.setAttribute('role', 'alert');
        toastEl.innerHTML = `
            <div class="toast-header">
                <i class="bi bi-bell-fill text-primary me-2"></i>
                <strong class="me-auto">Notification</strong>
                <small>Just now</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        container.appendChild(toastEl);
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        toast.show();
        
        toastEl.addEventListener('hidden.bs.toast', function() {
            toastEl.remove();
        });
    }
    
    document.querySelectorAll('.react-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const postId = this.dataset.postId;
            const type = this.dataset.reaction || 'like';
            const btnElement = this;
            
            fetch(`/posts/${postId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type: type })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update the reaction count display
                    const postCard = btnElement.closest('.post-card');
                    const reactionsSpan = postCard.querySelector('.reactions-display');
                    
                    if (reactionsSpan) {
                        if (data.reactionCount > 0) {
                            let likersText = '';
                            if (data.likers && data.likers.length > 0) {
                                const names = data.likers.map(l => l.name);
                                if (data.reactionCount <= 3) {
                                    likersText = names.join(', ');
                                } else {
                                    likersText = names.slice(0, 2).join(', ') + ' and ' + (data.reactionCount - 2) + ' others';
                                }
                            }
                            reactionsSpan.innerHTML = `<i class="bi bi-hand-thumbs-up-fill text-primary"></i> <span class="likers-text">${likersText}</span>`;
                        } else {
                            reactionsSpan.innerHTML = '';
                        }
                    }
                    
                    // Toggle the button icon
                    const icon = btnElement.querySelector('i');
                    if (data.reacted) {
                        icon.className = 'bi bi-hand-thumbs-up-fill text-primary';
                    } else {
                        icon.className = 'bi bi-hand-thumbs-up';
                    }
                }
            })
            .catch(console.error);
        });
    });
    
    const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    imageInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const preview = document.getElementById(this.dataset.preview);
            if (preview && this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });
    
    const autoResize = function(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    };
    
    document.querySelectorAll('textarea[data-autoresize]').forEach(function(textarea) {
        textarea.addEventListener('input', function() {
            autoResize(this);
        });
    });
    
    const forms = document.querySelectorAll('form[data-confirm]');
    forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            if (!confirm(this.dataset.confirm)) {
                e.preventDefault();
            }
        });
    });
    
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(el) {
        return new bootstrap.Tooltip(el);
    });
    
    const filterForms = document.querySelectorAll('.filter-form select');
    filterForms.forEach(function(select) {
        select.addEventListener('change', function() {
            this.closest('form').submit();
        });
    });
    
    function updateTimeAgo() {
        document.querySelectorAll('[data-time]').forEach(function(el) {
            const time = new Date(el.dataset.time);
            el.textContent = timeAgo(time);
        });
    }
    
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval + ' ' + unit + (interval > 1 ? 's' : '') + ' ago';
            }
        }
        return 'Just now';
    }
    
    setInterval(updateTimeAgo, 60000);
});
