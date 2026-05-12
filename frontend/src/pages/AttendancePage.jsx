import React from 'react';
import TeacherAttendanceDashboard from '../components/attendance/TeacherAttendanceDashboard';
import StudentAttendanceDashboard from '../components/attendance/StudentAttendanceDashboard';

const AttendancePage = ({ user }) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0c] p-4 md:p-8 transition-colors duration-300">
            {user?.role === 'teacher' ? (
                <TeacherAttendanceDashboard user={user} />
            ) : (
                <StudentAttendanceDashboard user={user} />
            )}
        </div>
    );
};

export default AttendancePage;
