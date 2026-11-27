export { INDIAN_CITIES as CITIES } from '@/data/indianCities';

export interface ApiResponseError {
  error: string;
  code?: string;
}

export async function parseApiResponse<T>(
  response: Response
): Promise<{ ok: boolean; status: number; data: T & Partial<ApiResponseError> }> {
  let data = {} as T & Partial<ApiResponseError>;
  try {
    data = (await response.json()) as T & Partial<ApiResponseError>;
  } catch {
    // Non-JSON response fallback
  }
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
