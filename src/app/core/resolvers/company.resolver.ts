// src/app/core/resolvers/company.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { Observable, of, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyService, GetCompanyResponse } from '../services/company/company.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyResolver implements Resolve<GetCompanyResponse | null> {

  constructor(
    private companyService: CompanyService,
    private router: Router
  ) {}

  resolve(): Observable<GetCompanyResponse | null> {
    return this.companyService.get().pipe(
      map((response: GetCompanyResponse) => {
        console.log('Company data resolved:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Failed to resolve company data:', error);
        
        // Handle different error scenarios
        if (error.status === 404) {
          console.log('No company found for user');
          // You might want to redirect to a company setup page
          // this.router.navigate(['/setup-company']);
          return of(null);
        }
        
        if (error.status === 401) {
          console.log('User not authenticated');
          this.router.navigate(['/login']);
          return of(null);
        }
        
        // For other errors, you might want to show an error page
        // or allow the route to load with null data
        return of(null);
      })
    );
  }
}