import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { clientAngularInterceptor } from './client-angular.interceptor';
import { environment } from '../../environments/environment';
import { of, throwError } from 'rxjs';
import { USERS_MOCK } from '../mocks/users.mocks';

describe('clientAngularInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) => 
    TestBed.runInInjectionContext(() => clientAngularInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('deberia crear el interceptor', () => {
    expect(interceptor).toBeTruthy();
  });

  it('debería concatenar el baseUrl a la URL de la petición', () => {
    const requestMock = new HttpRequest('GET', 'test');

    const next: HttpHandlerFn = (req) => {
      expect(req.url).toBe(`${environment.baseUrl}/test`);
      return of(new HttpResponse({ status: 200 }));
    };

    interceptor(requestMock, next).subscribe();
  });

  it('debería devolver datos locales cuando el backend no está disponible', () => {
    const requestMock = new HttpRequest('GET', 'api/users/5');
    const backendError = new HttpErrorResponse({ status: 0, statusText: 'Network Error' });
    const next: HttpHandlerFn = () => throwError(() => backendError);
    let response: HttpResponse<unknown> | undefined;

    interceptor(requestMock, next).subscribe((event) => {
      response = event as HttpResponse<unknown>;
    });

    expect(response?.status).toBe(200);
    expect(response?.headers.get('X-Data-Source')).toBe('local-fallback');
    expect(response?.body).toEqual(USERS_MOCK);
  });

  it('debería propagar errores de endpoints que no tienen fallback', () => {
    const requestMock = new HttpRequest('GET', 'api/unknown');
    const backendError = new HttpErrorResponse({ status: 503, statusText: 'Unavailable' });
    const next: HttpHandlerFn = () => throwError(() => backendError);
    let receivedError: HttpErrorResponse | undefined;

    interceptor(requestMock, next).subscribe({
      error: (error: HttpErrorResponse) => {
        receivedError = error;
      },
    });

    expect(receivedError).toBe(backendError);
  });

});
