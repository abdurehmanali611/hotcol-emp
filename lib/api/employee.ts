import {
  readEmployeeToken,
  type EmployeePublic,
  type EmployeeSession,
} from "@/lib/employeeSession";

const API_URL =
  process.env.NEXT_PUBLIC_EMP_API_URL || "http://localhost:4005/graphql";

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  opts?: { auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts?.auth !== false) {
    const token = readEmployeeToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Request failed");
  }
  return json.data as T;
}

export async function employeeLogin(
  tenantTin: string,
  otp: string,
): Promise<EmployeeSession> {
  const data = await gql<{ employeeLogin: EmployeeSession }>(
    `mutation ($tenantTin: String!, $otp: String!) {
      employeeLogin(tenantTin: $tenantTin, otp: $otp) {
        token
        employee {
          id HotelName fullName phone email department jobTitle status
          mustChangeOtp profileImageUrl portalFirstLoginAt
        }
      }
    }`,
    { tenantTin, otp },
    { auth: false },
  );
  return data.employeeLogin;
}

export async function fetchEmployeeMe(): Promise<EmployeePublic> {
  const data = await gql<{ employeeMe: EmployeePublic }>(
    `query {
      employeeMe {
        id HotelName fullName phone email department jobTitle status
        mustChangeOtp profileImageUrl portalFirstLoginAt
      }
    }`,
  );
  return data.employeeMe;
}

export async function changeOwnOtp(
  currentOtp: string,
  newOtp: string,
): Promise<boolean> {
  const data = await gql<{ changeOwnOtp: boolean }>(
    `mutation ($currentOtp: String!, $newOtp: String!) {
      changeOwnOtp(currentOtp: $currentOtp, newOtp: $newOtp)
    }`,
    { currentOtp, newOtp },
  );
  return data.changeOwnOtp;
}

export type EmpNotification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  actionStatus: string;
  readAt: string | null;
  createdAt: string;
};

export async function fetchEmployeeNotifications(unreadOnly?: boolean) {
  const data = await gql<{ employeeNotifications: EmpNotification[] }>(
    `query ($unreadOnly: Boolean) {
      employeeNotifications(unreadOnly: $unreadOnly) {
        id kind title body href actionStatus readAt createdAt
      }
    }`,
    { unreadOnly: unreadOnly ?? null },
  );
  return data.employeeNotifications || [];
}

export async function markOwnNotificationRead(id: number) {
  const data = await gql<{ markOwnNotificationRead: EmpNotification }>(
    `mutation ($id: Int!) {
      markOwnNotificationRead(id: $id) {
        id readAt kind title
      }
    }`,
    { id },
  );
  return data.markOwnNotificationRead;
}
