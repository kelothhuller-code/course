import React from 'react';

export default function CourseCurriculum({ course }) {
  // If there is no featured course, do not display the curriculum section
  if (!course) return null;

  // Extract chapters/modules dynamically from the featured course
  let modules = [];

  if (Array.isArray(course.content) && course.content.length > 0) {
    course.content.forEach(lang => {
      if (Array.isArray(lang.chapters)) {
        lang.chapters.forEach(ch => {
          if (ch && ch.title && !modules.some(m => m.title === ch.title)) {
            modules.push({
              title: ch.title,
              duration: ch.duration || 'Lesson'
            });
          }
        });
      }
    });
  }

  if (modules.length === 0 && Array.isArray(course.chapters) && course.chapters.length > 0) {
    modules = course.chapters.map(ch => ({
      title: typeof ch === 'string' ? ch : ch.title,
      duration: ch.duration || 'Lesson'
    }));
  }

  if (modules.length === 0 && Array.isArray(course.modules) && course.modules.length > 0) {
    modules = course.modules.map(m => ({
      title: typeof m === 'string' ? m : m.title,
      duration: m.duration || 'Lesson'
    }));
  }

  // If no chapters are configured but outcomes exist, show outcomes as milestones
  if (modules.length === 0 && Array.isArray(course.outcomes) && course.outcomes.length > 0) {
    modules = course.outcomes.map((outcome, idx) => ({
      title: outcome,
      duration: `Module ${idx + 1}`
    }));
  }

  // If the featured course genuinely has no modules or curriculum data, do not display a fake predefined list
  if (modules.length === 0) return null;

  return (
    <section className="why-section" id="curriculum" style={{ background: 'var(--background-white)' }}>
      <div className="container">
        <div className="section-label">CURRICULUM</div>
        <h2 className="section-title">Course Modules & Breakdown</h2>
        <p className="section-subtitle">
          Explore what you will learn in <strong>{course.title}</strong>
        </p>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {modules.map((module, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              borderBottom: index < modules.length - 1 ? '1px solid var(--border)' : 'none',
              gap: '1rem'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  width: '26px', 
                  height: '26px', 
                  borderRadius: '50%', 
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {index + 1}
                </span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{module.title}</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {module.duration}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}