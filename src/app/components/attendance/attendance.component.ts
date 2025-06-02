
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { DynamoDbService } from '../../services/dynamodb.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
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
export class AttendanceComponent implements OnInit {

  sidebarCollapsed: boolean = false;
  loading: boolean = true;
  exportLoading: boolean = false;

  startDate: string = '';
  endDate: string = '';
  searchQuery: string = '';
  
  attendanceRecords: any[] = [];
  filteredRecords: any[] = [];
  totalRecords: number = 0;
  formattedDateRange: string = '';
  
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  
  matchThreshold: number = 80;

  sortColumn: string = 'timestamp';
  sortAscending: boolean = false;

  constructor(
    private router: Router,
    private dynamoService: DynamoDbService
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadAttendanceData();
  }

  initializeDates(): void {

    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    this.endDate = this.formatDateForInput(today);
    this.startDate = this.formatDateForInput(lastWeek);
    this.updateFormattedDateRange();
  }

  formatDateForInput(date: Date): string {
 
    return date.toISOString().split('T')[0];
  }

  updateFormattedDateRange(): void {
    const startDateObj = new Date(this.startDate);
    const endDateObj = new Date(this.endDate);
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    
    this.formattedDateRange = `${startDateObj.toLocaleDateString(undefined, options)} - ${endDateObj.toLocaleDateString(undefined, options)}`;
  }

  async loadAttendanceData(): Promise<void> {
    try {
      this.loading = true;
      
      const formattedStart = new Date(this.startDate).toISOString();
      const formattedEnd = new Date(this.endDate);
      formattedEnd.setHours(23, 59, 59, 999); 
      
      console.log(`Fetching attendance from ${formattedStart} to ${formattedEnd.toISOString()}`);
      
      const response = await this.dynamoService.getAttendanceByDateRange(
        formattedStart,
        formattedEnd.toISOString()
      ).toPromise();
      
      this.attendanceRecords = response || [];
      
      console.log(`Retrieved ${this.attendanceRecords.length} attendance records`);
      
      // Process the data for display
      this.attendanceRecords = this.attendanceRecords.map(record => ({
        employeeId: record.EmployeeId,
        employeeName: record.EmployeeName,
        timestamp: new Date(record.Timestamp),
        matchDistance: record.MacthDistance || 0 
      }));
      
      this.sortRecords(); 
      this.totalRecords = this.filteredRecords.length;
      this.calculateTotalPages();
      this.loading = false;
    } catch (error) {
      console.error('Error loading attendance data:', error);
      this.attendanceRecords = [];
      this.filteredRecords = [];
      this.loading = false;
    }
  }

  filterAttendance(): void {
    this.updateFormattedDateRange();
    this.loadAttendanceData();
  }

  resetFilter(): void {
    this.initializeDates();
    this.searchQuery = '';
    this.loadAttendanceData();
  }

  sortRecords(): void {

    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredRecords = this.attendanceRecords.filter(record => 
        record.employeeId.toLowerCase().includes(query) || 
        record.employeeName.toLowerCase().includes(query)
      );
    } else {
      this.filteredRecords = [...this.attendanceRecords];
    }
    
    this.filteredRecords.sort((a, b) => {
      let compareResult = 0;
      
      switch (this.sortColumn) {
        case 'employeeId':
          compareResult = a.employeeId.localeCompare(b.employeeId);
          break;
        case 'employeeName':
          compareResult = a.employeeName.localeCompare(b.employeeName);
          break;
        case 'timestamp':
          compareResult = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'matchDistance':
          compareResult = a.matchDistance - b.matchDistance;
          break;
        default:
          compareResult = 0;
      }
      
      return this.sortAscending ? compareResult : -compareResult;
    });
    
    this.totalRecords = this.filteredRecords.length;
    this.calculateTotalPages();
    this.currentPage = 1; 
  }

  sortBy(column: string): void {

    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }
    
    this.sortRecords();
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredRecords.length / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  getPaginatedRecords(): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredRecords.slice(startIndex, endIndex);
  }

  onPageSizeChange(): void {
    this.calculateTotalPages();

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getMatchScoreClass(score: number): string {
    if (score <= 0.7) return 'good';
    if (score <= 0.85) return 'warning';
    return 'poor';
  }

  getStatusLabel(score: number): string {
    if (score <= 0.7) return 'Verified';
    if (score <= 0.85) return 'Needs Review';
    return 'Rejected';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    localStorage.removeItem('isLoggedIn');
    this.router.navigate(['/login']);
  }
  
  async exportToPDF(): Promise<void> {
    try {
      this.exportLoading = true;
      
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      let currentY = margin;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Employee Attendance Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date Range: ${this.formattedDateRange}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 16, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      currentY += 10;
      doc.text(`Total Records: ${this.totalRecords}`, margin + 10, currentY);
      doc.text(`Match Threshold: ${this.matchThreshold}%`, pageWidth - margin - 50, currentY);
      currentY += 15;
      
      const headers = ['Employee ID', 'Employee Name', 'Date & Time', 'Match Distance', 'Status'];
      const columnWidths = [40, 60, 60, 40, 40];
      const headerHeight = 10;
      
      doc.setFillColor(52, 152, 219); 
      doc.setTextColor(255, 255, 255); 
      doc.rect(margin, currentY, pageWidth - (margin * 2), headerHeight, 'F');
      
      let xPos = margin + 5;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], xPos, currentY + 7);
        xPos += columnWidths[i];
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      currentY += headerHeight;
      
      let rowColor = false;
      
      for (const record of this.filteredRecords) {
   
        if (rowColor) {
          doc.setFillColor(248, 249, 250);
          doc.rect(margin, currentY, pageWidth - (margin * 2), 10, 'F');
        }
        rowColor = !rowColor;
        
        const date = new Date(record.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        const status = this.getStatusLabel(record.matchDistance);
        
        xPos = margin + 5;
        doc.text(record.employeeId, xPos, currentY + 7);
        xPos += columnWidths[0];
        
        doc.text(record.employeeName, xPos, currentY + 7);
        xPos += columnWidths[1];
        
        doc.text(formattedDate, xPos, currentY + 7);
        xPos += columnWidths[2];
        
        doc.text(record.matchDistance.toFixed(2), xPos, currentY + 7);
        xPos += columnWidths[3];
        
        if (status === 'Verified') {
          doc.setTextColor(39, 174, 96); // Green
        } else if (status === 'Needs Review') {
          doc.setTextColor(243, 156, 18); // Orange
        } else {
          doc.setTextColor(231, 76, 60); // Red
        }
        
        doc.text(status, xPos, currentY + 7);
        doc.setTextColor(0, 0, 0); // Reset to black
        
        currentY += 10;
        
        if (currentY > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = margin;
          
          // Add table headers to new page
          doc.setFillColor(52, 152, 219);
          doc.setTextColor(255, 255, 255);
          doc.rect(margin, currentY, pageWidth - (margin * 2), headerHeight, 'F');
          
          xPos = margin + 5;
          for (let i = 0; i < headers.length; i++) {
            doc.text(headers[i], xPos, currentY + 7);
            xPos += columnWidths[i];
          }
          
          doc.setTextColor(0, 0, 0);
          currentY += headerHeight;
        }
      }
      
      // Add footer
      const pageCount = (doc as any).internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount} - Generated on ${new Date().toLocaleString()}`, pageWidth - margin, doc.internal.pageSize.height - 10, { align: 'right' });
      }
      
      // Save the PDF
      const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      this.exportLoading = false;
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      this.exportLoading = false;
      
    }
  }
}