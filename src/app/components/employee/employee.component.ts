
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { DynamoDbService } from '../../services/dynamodb.service';

@Component({
  selector: 'app-employee',
  templateUrl: './employee.component.html',
  styleUrls: ['./employee.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
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
export class EmployeeComponent implements OnInit {

  viewMode: 'table' | 'grid' = 'table'; // Default to table view
  sidebarCollapsed: boolean = false;
  loading: boolean = true;

  lastUpdated: string = '';
attendanceRate: number = 0;

  employees: any[] = [];
  displayedEmployees: any[] = [];
  

  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  sortColumn: string = 'EmployeeId';
  sortDirection: 'asc' | 'desc' = 'asc';
  searchTerm: string = '';
  
  showEmployeeModal: boolean = false;
  showDeleteModal: boolean = false;
  isEditing: boolean = false;
  employeeForm!: FormGroup;
  selectedEmployee: any = null;
  employeeToDelete: any = null;

  constructor(
    private router: Router,
    private dynamoService: DynamoDbService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadEmployees();
    this.initForm();
  }

  initForm(): void {
    this.employeeForm = this.fb.group({
      employeeId: [''],
      employeeName: ['', [Validators.required]],
      department: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      address: ['']
    });
  }

  async loadEmployees(): Promise<void> {
    try {
      this.loading = true;
      const employees = await this.dynamoService.getEmployees().toPromise();
      
      this.employees = employees?.map((emp: any) => ({ ...emp, selected: false })) || [];

      this.lastUpdated = new Date().toLocaleString(); 

      // attendance calculation
      const total = this.employees.length;
      const presentCount = this.employees.filter(emp => emp.PresentToday).length;
      this.attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      
      this.applyFilter();
      this.updatePagination();
      this.loading = false;
    } catch (error) {
      console.error('Error loading employees:', error);
      this.loading = false;
    }
  }

  applyFilter(): void {
    // Filter employees based on search term
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      this.displayedEmployees = this.employees.filter(emp => 
        emp.EmployeeId.toLowerCase().includes(search) ||
        emp.EmployeeName.toLowerCase().includes(search) ||
        emp.Department.toLowerCase().includes(search) ||
        emp.Email.toLowerCase().includes(search) ||
        emp.PhoneNumber.includes(search) ||
        (emp.Address && emp.Address.toLowerCase().includes(search))
      );
    } else {
      this.displayedEmployees = [...this.employees];
    }
    
    // Apply sorting
    this.applySorting();
    
    // Reset to first page when filter changes
    this.currentPage = 1;
    this.updatePagination();
  }

  applySorting(): void {
    this.displayedEmployees.sort((a, b) => {
      const valA = a[this.sortColumn] || '';
      const valB = b[this.sortColumn] || '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return this.sortDirection === 'asc' 
          ? (valA > valB ? 1 : -1) 
          : (valB > valA ? 1 : -1);
      }
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.displayedEmployees.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedEmployees = this.displayedEmployees.slice(startIndex, endIndex);
  }

  goToPage(pageNumber: number): void {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      this.currentPage = pageNumber;
      this.loadEmployees(); 
    }
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      // Toggle direction if clicking the same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending order for new column
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.applyFilter();
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  toggleSelection(employee: any): void {
    employee.selected = !employee.selected;
    
    if (employee.selected) {
      this.selectedEmployee = employee;
      this.employees.forEach(emp => {
        if (emp !== employee) {
          emp.selected = false;
        }
      });
    } else {
      this.selectedEmployee = null;
    }
  }

  isAllSelected(): boolean {
    return this.displayedEmployees.length > 0 && 
           this.displayedEmployees.every(emp => emp.selected);
  }

  toggleAllSelection(): void {
    const allSelected = this.isAllSelected();
    this.displayedEmployees.forEach(emp => emp.selected = !allSelected);
    this.selectedEmployee = null;
  }

  openEmployeeModal(employee?: any): void {
    this.isEditing = !!employee;
    
    if (employee) {
      // Edit mode - populate form
      this.employeeForm.patchValue({
        employeeId: employee.EmployeeId,
        employeeName: employee.EmployeeName,
        department: employee.Department,
        email: employee.Email,
        phoneNumber: employee.PhoneNumber,
        address: employee.Address || ''
      });
    } else {
      this.employeeForm.reset();
      const newId = 'EMP' + Math.floor(100000 + Math.random() * 900000);
      this.employeeForm.get('employeeId')?.setValue(newId);
    }
    
    this.showEmployeeModal = true;
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal = false;
    this.employeeForm.reset();
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      Object.keys(this.employeeForm.controls).forEach(key => {
        const control = this.employeeForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    const formData = this.employeeForm.value;
    
    const employee = {
      EmployeeId: formData.employeeId,
      EmployeeName: formData.employeeName,
      Department: formData.department,
      Email: formData.email,
      PhoneNumber: formData.phoneNumber,
      Address: formData.address || ''
    };
    
    if (this.isEditing) {
      const index = this.employees.findIndex(emp => emp.EmployeeId === employee.EmployeeId);
      if (index !== -1) {
        this.employees[index] = { ...this.employees[index], ...employee };
      }
    } else {
      this.employees.push({ ...employee, selected: false });
    }
 
    
    this.closeEmployeeModal();
    this.applyFilter();
  }

  confirmDelete(employee: any): void {
    this.employeeToDelete = employee;
    this.showDeleteModal = true;
  }

  // closeDeleteModal(): void {
  //   this.showDeleteModal = false;
  //   this.employeeToDelete = null;
  // }

  // deleteEmployee(): void {
  //   if (this.employeeToDelete) {
  //     this.employees = this.employees.filter(
  //       emp => emp.EmployeeId !== this.employeeToDelete.EmployeeId
  //     );
        
  //     this.closeDeleteModal();
  //     this.applyFilter();
  //   }
  // }

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

getDepartmentClass(department: string): string {
  switch(department) {
    case 'IT':
      return 'dept-IT';
    case 'HR':
      return 'dept-HR';
    case 'Finance':
      return 'dept-Finance';
    case 'Marketing':
      return 'dept-Marketing';
    case 'Operations':
      return 'dept-Operations';
    default:
      return '';
  }
}
}