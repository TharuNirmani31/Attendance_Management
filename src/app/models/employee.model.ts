
export interface Employee {
    EmployeeId: string;
    EmployeeName: string;
    Email?: string;
    PhoneNumber?: string;
    Department?: string;
    Address?: string;
    // Add other employee properties as needed
  }
  
  export interface AttendanceRecord {
    EmployeeId: string;
    Timestamp: string;
    EmployeeName: string;
    MatchDistance?: number;
    // Add other attendance properties as needed
  }
  
  export interface EmployeeEmbedding {
    EmployeeId: string;
    EmbeddingVector: number[];
  }
  
  export interface DashboardStats {
    totalEmployees: number;
    todaysAttendance: number;
    attendanceRate: number;
  }
  
  export interface ActivityItem {
    type: string;
    icon: string;
    title: string;
    time: string;
  }
  
  export interface AttendanceChartData {
    date: string;
    count: number;
  }