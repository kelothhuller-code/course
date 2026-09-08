// Dashboard Module
window.DashboardModule = {
    async render() {
        try {
            const data = await API.getDashboard();
            const coursesData = await API.getCourses();
            const courses = Helpers.extractCourses(coursesData);

            const totalCourses = courses.length;
            const freeCourses = courses.filter(c => c.isFree).length;
            const paidCourses = totalCourses - freeCourses;

            return `
                <div class="grid-cards">
                    ${Renderers.statCard('Total Enrolled Users', data.totalEnrollments || 0)}
                    ${Renderers.statCard('Total Payments (INR)', `₹${data.totalPayments || 0}`)}
                    ${Renderers.statCard('Total Courses', totalCourses || 0)}
                    ${Renderers.statCard('Free / Paid Courses', `${freeCourses || 0} / ${paidCourses || 0}`)}
                </div>
                
                <div class="panel">
                    <div class="panel-header flex justify-between items-center">
                        <h3>Quick Actions</h3>
                        <button class="btn btn-secondary" onclick="AuthModule.logout()">Logout</button>
                    </div>
                    <div class="flex gap-4">
                        <button class="btn btn-primary" onclick="CoursesModule.renderForm()">+ Add New Course</button>
                        <button class="btn btn-secondary" onclick="App.navigateTo('courses')">📚 Manage Courses</button>
                    </div>
                </div>
            `;
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                console.error('Dashboard error:', error);
                return Renderers.errorMessage(error.message);
            }
            return '';
        }
    }
};