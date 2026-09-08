// Landing/AdvancedCourses.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function AdvancedCourses({ user }) {
    // These are sample advanced courses - replace with real data from your API
    const advancedCourses = [
        {
            id: 1,
            icon: '🤖',
            title: 'Advanced AI Development',
            description: 'Build complex AI applications with advanced techniques.',
            level: 'Intermediate'
        },
        {
            id: 2,
            icon: '📊',
            title: 'AI for Business Analytics',
            description: 'Use AI for data analysis and business intelligence.',
            level: 'Intermediate'
        },
        {
            id: 3,
            icon: '🧠',
            title: 'Deep Learning Fundamentals',
            description: 'Understand neural networks and modern AI architectures.',
            level: 'Advanced'
        },
        {
            id: 4,
            icon: '⚡',
            title: 'AI Automation & Workflows',
            description: 'Build automated systems using AI tools and APIs.',
            level: 'Intermediate'
        }
    ];

    return (
        <section className="advanced-section" id="advanced-courses">
            <div className="container">
                <div className="section-label">ADVANCED LEARNING</div>
                <h2 className="section-title">Take Your Skills to the Next Level</h2>
                <p className="section-subtitle">
                    Ready for more? Access our complete library of advanced AI courses.
                </p>

                {/* Course Cards */}
                <div className="advanced-grid">
                    {advancedCourses.map((course) => (
                        <div key={course.id} className="advanced-card">
                            <div className="advanced-icon">{course.icon}</div>
                            <div className="advanced-content">
                                <h3>{course.title}</h3>
                                <p>{course.description}</p>
                                <span className={`advanced-level level-${course.level.toLowerCase()}`}>
                                    {course.level}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Call to Action - Changes based on login status */}
                <div className="advanced-cta">
                    <div className="advanced-cta-card">
                        <div className="advanced-cta-content">
                            <span className="advanced-cta-badge">🚀 UNLOCK FULL ACCESS</span>
                            <h3>Ready for Advanced AI Courses?</h3>
                            <p>
                                Access our complete library of advanced AI courses, workshops, and resources.
                                Learn from industry experts and build enterprise-level AI solutions.
                            </p>

                            {/* Show different buttons based on login status */}
                            {user ? (
                                // Logged in: Show Dashboard button
                                <Link to="/dashboard" className="btn btn-primary btn-lg">
                                    Go to Dashboard →
                                </Link>
                            ) : (
                                // Not logged in: Show Login/Register buttons
                                <div className="advanced-cta-buttons">
                                    <Link to="/auth" className="btn btn-primary btn-lg">
                                        Login to Access Courses
                                    </Link>
                                    <Link to="/auth" className="btn btn-secondary btn-lg">
                                        Create Free Account
                                    </Link>
                                </div>
                            )}

                            {/* Feature list */}
                            <div className="advanced-cta-features">
                                <span>✓ 50+ Advanced Courses</span>
                                <span>✓ Live Workshops</span>
                                <span>✓ Expert Instructors</span>
                                <span>✓ Project-Based Learning</span>
                            </div>
                        </div>

                        {/* Visual Stats */}
                        <div className="advanced-cta-visual">
                            <div className="visual-badge">🎓</div>
                            <div className="visual-stats">
                                <div className="stat">
                                    <span className="stat-number">50+</span>
                                    <span className="stat-label">Courses</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-number">100+</span>
                                    <span className="stat-label">Hours of Content</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-number">20+</span>
                                    <span className="stat-label">Live Workshops/Month</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}