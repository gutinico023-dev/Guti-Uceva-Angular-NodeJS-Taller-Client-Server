import { HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { catchError, of, throwError } from 'rxjs';
import { CATEGORIES_MOCK } from '../mocks/categories.mocks';
import { ORDERS_MOCK } from '../mocks/orders.mocks';
import { PRODUCTS_MOCK } from '../mocks/products.mocks';
import { REVIEWS_MOCK } from '../mocks/reviews.mocks';
import { USERS_MOCK } from '../mocks/users.mocks';

const fallbackResponses: Record<string, unknown[]> = {
  users: USERS_MOCK,
  products: PRODUCTS_MOCK,
  categories: CATEGORIES_MOCK,
  orders: ORDERS_MOCK,
  reviews: REVIEWS_MOCK,
};

function getFallbackResponse(url: string): unknown[] | undefined {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\/api\/(users|products|categories|orders|reviews)(?:\/\d+)?\/?$/);

  return match ? fallbackResponses[match[1]] : undefined;
}

function canUseFallback(requestMethod: string, error: HttpErrorResponse): boolean {
  return requestMethod === 'GET' && (error.status === 0 || error.status === 404 || error.status >= 500);
}

/**
 * Interceptor HTTP que concatena la URL base a todas las peticiones salientes.
 *
 * Este interceptor se encarga de anteponer el `baseUrl` definido en el
 * archivo de configuración de entornos (`environment`) a cada request HTTP.
 *
 * ⚠️ Nota:
 * - No debe usarse con URLs absolutas (`http://`, `https://`)
 * - Está pensado para trabajar con rutas relativas como `/users`, `/login`, etc.
 *
 * @example
 * Petición original:
 * ```ts
 * this.http.get('/users');
 * ```
 *
 * Petición final:
 * ```ts
 * https://api.midominio.com/users
 * ```
 */
export const clientAngularInterceptor: HttpInterceptorFn = (req, next) => {
  const request = req.clone({ url: `${environment.baseUrl}/${req.url}` });

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const fallbackBody = canUseFallback(request.method, error)
        ? getFallbackResponse(request.urlWithParams)
        : undefined;

      if (fallbackBody) {
        console.warn(`[API fallback] ${request.urlWithParams} respondió con datos locales.`);
        return of(new HttpResponse({
          body: fallbackBody,
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            'X-Data-Source': 'local-fallback',
          }),
          status: 200,
          statusText: 'OK (local fallback)',
          url: request.urlWithParams,
        }));
      }

      return throwError(() => error);
    }),
  );
};
