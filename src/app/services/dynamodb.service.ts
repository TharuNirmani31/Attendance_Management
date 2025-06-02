import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DynamoDbService {
  private apiUrl = 'http://localhost:8000';  // Update if hosted elsewhere

  constructor(private http: HttpClient) {}

  getAttendanceStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/attendance/stats`);
  }

  getRecentAttendanceLogs(limit: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attendance/recent?limit=${limit}`);
  }

  getAttendanceByDateRange(start: string, end: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attendance/by-date/records`, {
      params: { start_date: start, end_date: end }
    });
  }

  getAttendanceChartData(start: string, end: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attendance/by-date`, {
      params: { start_date: start, end_date: end }
    });
  }

  getEmployees(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employees`);
  }

  getAllAttendance(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attendance`);
  }
}