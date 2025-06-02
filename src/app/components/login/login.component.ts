import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ADMIN_CREDENTIALS } from '../..//constants/auth.constants';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  showPassword = false;
  isLoading = false;
  loginForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
  
      try {
        const trimmedEmail = email.trim();
        const trimmedPassword = password;
  
        if (
          trimmedEmail === ADMIN_CREDENTIALS.email &&
          trimmedPassword === ADMIN_CREDENTIALS.password
        ) {
          console.log('Login successful!');
          this.router.navigate(['/dashboard']);
          localStorage.setItem('isLoggedIn', 'true');
        } else {
          alert('Invalid email or password');
        }
      } catch (err) {
        console.error('Login error:', err);
        alert('Something went wrong during login.');
      } finally {
        this.isLoading = false;
      }
    }
  }
  
  
}
