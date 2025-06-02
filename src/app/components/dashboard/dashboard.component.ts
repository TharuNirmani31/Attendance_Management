
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { DynamoDbService } from '../../services/dynamodb.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule,
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-10px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {

  totalEmployees: number = 0;
  todaysAttendance: number = 0;
  attendanceRate: number = 0;
  loading: boolean = true;
  

  attendanceData: any[] = [];
  

  sidebarCollapsed: boolean = false;

  recentActivities: any[] = [];

  constructor(
    private router: Router,
    private dynamoService: DynamoDbService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }
  
  async loadDashboardData() {
    try {
      this.loading = true;
      console.log('Fetching attendance stats...');
  
      const stats = await this.dynamoService.getAttendanceStats().toPromise();
      console.log('Attendance stats:', stats);
  
      this.totalEmployees = stats?.totalEmployees || 0;
      this.todaysAttendance = stats?.todaysAttendance || 0;
      this.attendanceRate = stats?.attendanceRate || 0;
  
      console.log('Fetching recent logs...');
      const recentLogs = await this.dynamoService.getRecentAttendanceLogs(5).toPromise();
      console.log('Recent logs:', recentLogs);
  
      this.recentActivities = recentLogs?.map((log: any) => ({
        type: 'check-in',
        icon: 'user-check',
        title: `${log.EmployeeName} checked in`,
        time: new Date(log.Timestamp).toLocaleTimeString(),
      })) || [];
  
      console.log('Fetching chart data...');
      const today = new Date().toISOString();
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      const attendanceData = await this.dynamoService.getAttendanceByDateRange(
        last30Days.toISOString(),
        today
      ).toPromise();
      console.log('Chart data:', attendanceData);
  
      this.attendanceData = attendanceData || [];
      this.loading = false;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.loading = false;
    }
  }
  

  
  private processAttendanceData(attendanceRecords: any[]) {
    
    const groupedByDate = this.groupAttendanceByDate(attendanceRecords);
    
    this.attendanceData = Object.keys(groupedByDate).map(date => {
      return {
        date: date,
        count: groupedByDate[date]
      };
    });
    
    this.attendanceData.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    console.log(`Processed chart data: ${this.attendanceData.length} data points`);
  }
  
  private groupAttendanceByDate(records: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    
    records.forEach(record => {
     
      const date = record.Timestamp.split('T')[0];
      if (!result[date]) {
        result[date] = 0;
      }
      result[date]++;
    });
    
    return result;
  }
  
  private formatDateTime(date: Date): string {
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && 
                   date.getMonth() === now.getMonth() && 
                   date.getFullYear() === now.getFullYear();
    
    if (isToday) {
      return `Today at ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && 
                       date.getMonth() === yesterday.getMonth() && 
                       date.getFullYear() === yesterday.getFullYear();
    
    if (isYesterday) {
      return `Yesterday at ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    
    return `${date.toLocaleDateString()} at ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {

    this.router.navigate(['/login']);
    localStorage.removeItem('isLoggedIn');
    
  }
}
