// Trial Tutorials Module
window.TutorialsModule = {
    async renderForm(tutorialId = null) {
        let tutorial = null;
        if (tutorialId) {
            try {
                const data = await API.get(`/api/trials/${tutorialId}`);
                tutorial = data.tutorial || data;
            } catch (error) {
                return Renderers.errorMessage('Failed to load tutorial: ' + error.message);
            }
        }

        const isEdit = !!tutorial;

        return `
            <div class="panel">
                <div class="panel-header flex justify-between items-center">
                    <h3>${isEdit ? 'Edit Trial Tutorial' : 'Create Trial Tutorial'}</h3>
                    <button class="btn btn-secondary" onclick="App.navigateTo('content')">← Back</button>
                </div>
                
                <form id="tutorial-form">
                    <div class="form-group full-width">
                        <label class="form-label">Tutorial Title *</label>
                        <input type="text" id="tutorial-title" class="form-control" 
                               value="${tutorial?.title || ''}" required>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Description *</label>
                        <textarea id="tutorial-description" class="form-control" rows="3" required>${tutorial?.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Video URL *</label>
                        <input type="url" id="tutorial-video" class="form-control" 
                               value="${tutorial?.videoUrl || ''}" required>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <input type="text" id="tutorial-category" class="form-control" 
                                   value="${tutorial?.category || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Duration</label>
                            <input type="text" id="tutorial-duration" class="form-control" 
                                   value="${tutorial?.duration || ''}" placeholder="e.g. 5 mins">
                        </div>
                    </div>
                    
                    <div class="form-group full-width">
                        <label class="form-label">Thumbnail URL</label>
                        <input type="url" id="tutorial-thumbnail" class="form-control" 
                               value="${tutorial?.thumbnail || ''}">
                    </div>

                    <div style="margin-top:32px;display:flex;justify-content:flex-end;gap:12px;">
                        <button type="button" class="btn btn-secondary" onclick="App.navigateTo('content')">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                    </div>
                </form>
            </div>
        `;
    },

    setupForm(tutorialId) {
        const form = document.getElementById('tutorial-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();

            const data = {
                title: document.getElementById('tutorial-title').value.trim(),
                description: document.getElementById('tutorial-description').value.trim(),
                videoUrl: document.getElementById('tutorial-video').value.trim(),
                category: document.getElementById('tutorial-category').value.trim(),
                duration: document.getElementById('tutorial-duration').value.trim(),
                thumbnail: document.getElementById('tutorial-thumbnail').value.trim()
            };

            if (!data.title || !data.description || !data.videoUrl) {
                return alert('Title, description, and video URL are required');
            }

            try {
                let result;
                if (tutorialId) {
                    result = await API.put(`/api/trials/${tutorialId}`, data);
                } else {
                    result = await API.post('/api/trials', data);
                }

                if (result.success || result._id) {
                    alert(tutorialId ? 'Tutorial updated!' : 'Tutorial created!');
                    App.navigateTo('content');
                } else {
                    alert('Error: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        };
    }
};