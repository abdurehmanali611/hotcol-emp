const TOKEN_KEY = "hotcol_emp_token";
const EMPLOYEE_KEY = "hotcol_emp_me";

export type EmployeePublic = {
  id: number;
  HotelName: string;
  fullName: string;
  phone: string;
  email: string;
  department: string;
  jobTitle: string;
  status: string;
  mustChangeOtp: boolean;
  profileImageUrl: string;
  portalFirstLoginAt: string | null;
};

export type EmployeeSession = {
  token: string;
  employee: EmployeePublic;
};

export function saveEmployeeSession(session: EmployeeSession) {
  try {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(session.employee));
  } catch {
    /* ignore */
  }
}

export function clearEmployeeSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMPLOYEE_KEY);
  } catch {
    /* ignore */
  }
}

export function readEmployeeToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function readEmployeeMe(): EmployeePublic | null {
  try {
    const raw = localStorage.getItem(EMPLOYEE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmployeePublic;
  } catch {
    return null;
  }
}

export function updateStoredEmployee(employee: EmployeePublic) {
  try {
    localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employee));
  } catch {
    /* ignore */
  }
}
