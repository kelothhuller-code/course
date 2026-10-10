// Admin Dedicated Sales Page Builder Module
const SalesBuilderModule = {
    async render() {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            const res = await fetch('/api/courses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const courses = Array.isArray(data) ? data : (data.courses || []);

            const frontendUrl = window.location.origin.includes('5000') || window.location.origin.includes('5001')
                ? 'http://localhost:5173'
                : window.location.origin;

            return `
                <div class="sales-builder-module" style="padding: 1rem 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <h2 style="font-size:1.6rem; font-weight:700; margin:0 0 0.25rem 0;">⚡ Dedicated Course Sales Page & Landing Builder</h2>
                            <p style="color:var(--text-muted, #64748b); margin:0;">Configure Sales Headlines, Badges, CTAs, Trailers, and Shareable Links for Every Course</p>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:1.5rem;">
                        ${courses.map(course => {
                            const isFree = course.isFree || course.price === 0;
                            const salesUrl = `${frontendUrl}/sale/${course.salesPageConfig?.slug || course._id}`;
                            const config = course.salesPageConfig || {};

                            return `
                                <div class="panel" style="background:#fff; border-radius:14px; padding:1.25rem; border:1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-space-between;">
                                    <div>
                                        <div style="position:relative; height:150px; border-radius:10px; overflow:hidden; margin-bottom:1rem;">
                                            <img src="${course.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}" alt="${course.title}" style="width:100%; height:100%; object-fit:cover;" />
                                            <span style="position:absolute; top:0.5rem; right:0.5rem; background:${isFree ? '#10b981' : '#6366f1'}; color:#fff; padding:0.25rem 0.65rem; border-radius:40px; font-size:0.75rem; font-weight:700;">
                                                ${isFree ? 'FREE' : `₹${course.discountedPrice || course.price} (Incl. GST)`}
                                            </span>
                                        </div>

                                        <h3 style="font-size:1.15rem; font-weight:700; margin:0 0 0.5rem 0; color:#0f172a;">${course.title}</h3>
                                        <p style="font-size:0.85rem; color:#64748b; line-height:1.5; margin:0 0 1rem 0;">${course.description?.substring(0, 90)}...</p>

                                        <div style="background:#f8fafc; padding:0.75rem; border-radius:8px; border:1px solid #e2e8f0; font-size:0.8rem; margin-bottom:1rem;">
                                            <div style="margin-bottom:0.35rem;">
                                                <span style="color:#64748b;">Headline:</span>
                                                <strong style="color:#0f172a; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${config.headline || course.title}</strong>
                                            </div>
                                            <div style="margin-bottom:0.35rem;">
                                                <span style="color:#64748b;">Badge:</span>
                                                <span style="color:#4f46e5; font-weight:600;">${config.badgeText || (isFree ? '🎁 FREE ENROLLMENT' : '⚡ 18% GST INCLUSIVE')}</span>
                                            </div>
                                            <div>
                                                <span style="color:#64748b;">CTA Button:</span>
                                                <span style="color:#047857; font-weight:600;">${config.ctaText || (isFree ? 'Enroll Now - Free' : 'Buy Course')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
                                        <a href="${salesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="flex:1; text-align:center; text-decoration:none; padding:0.5rem 0.75rem; font-size:0.82rem;">
                                            🌐 Sales Page Link
                                        </a>
                                        <button onclick="navigator.clipboard.writeText('${salesUrl}'); alert('🔗 Sales link copied to clipboard!');" class="btn btn-secondary btn-sm" style="padding:0.5rem 0.75rem; font-size:0.82rem;">
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Error rendering Sales Builder module:', err);
            return `<div class="panel"><h3 style="color:#ef4444;">Failed to load Sales Builder</h3><p>${err.message}</p></div>`;
        }
    }
};

window.SalesBuilderModule = SalesBuilderModule;
