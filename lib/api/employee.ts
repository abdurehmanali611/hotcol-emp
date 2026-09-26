import {
  readEmployeeToken,
  type EmployeePublic,
  type EmployeeSession,
} from "@/lib/employeeSession";

const API_URL =
  process.env.NEXT_PUBLIC_EMP_API_URL || "http://localhost:4005/graphql";

const ME_FIELDS = `
  id HotelName fullName phone email department jobTitle orgPosition teamId status
  mustChangeOtp profileImageUrl portalFirstLoginAt
`;

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
        employee { ${ME_FIELDS} }
      }
    }`,
    { tenantTin, otp },
    { auth: false },
  );
  return data.employeeLogin;
}

export async function fetchEmployeeMe(): Promise<EmployeePublic> {
  const data = await gql<{ employeeMe: EmployeePublic }>(
    `query { employeeMe { ${ME_FIELDS} } }`,
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
      markOwnNotificationRead(id: $id) { id readAt kind title }
    }`,
    { id },
  );
  return data.markOwnNotificationRead;
}

export type EmpLeaveRequest = {
  id: number;
  leaveType: string;
  fromYmd: string;
  toYmd: string;
  days: number;
  reason: string;
  status: string;
  currentStepIndex: number;
  decidedBy: string;
  decidedAt: string | null;
  createdAt: string;
  employeeName: string;
};

export async function fetchMyLeaveRequests() {
  const data = await gql<{ myLeaveRequests: EmpLeaveRequest[] }>(
    `query {
      myLeaveRequests {
        id leaveType fromYmd toYmd days reason status currentStepIndex
        decidedBy decidedAt createdAt employeeName
      }
    }`,
  );
  return data.myLeaveRequests || [];
}

export async function fetchMyLeaveTypes() {
  const data = await gql<{ myLeaveTypes: { code: string; label: string; paid: boolean }[] }>(
    `query { myLeaveTypes { code label paid } }`,
  );
  return data.myLeaveTypes || [];
}

export async function createOwnLeaveRequest(input: {
  leaveType: string;
  fromYmd: string;
  toYmd: string;
  days?: number;
  reason?: string;
}) {
  const data = await gql<{ createOwnLeaveRequest: EmpLeaveRequest }>(
    `mutation ($leaveType: String!, $fromYmd: String!, $toYmd: String!, $days: Float, $reason: String) {
      createOwnLeaveRequest(
        leaveType: $leaveType fromYmd: $fromYmd toYmd: $toYmd days: $days reason: $reason
      ) {
        id leaveType fromYmd toYmd days status currentStepIndex createdAt employeeName
      }
    }`,
    input,
  );
  return data.createOwnLeaveRequest;
}

export async function fetchPendingApprovalsForMe() {
  const data = await gql<{ pendingApprovalsForMe: EmpLeaveRequest[] }>(
    `query {
      pendingApprovalsForMe {
        id leaveType fromYmd toYmd days reason status currentStepIndex
        createdAt employeeName
      }
    }`,
  );
  return data.pendingApprovalsForMe || [];
}

export async function decideLeaveAsAssignee(
  id: number,
  approve: boolean,
  note?: string,
) {
  const data = await gql<{ decideLeaveAsAssignee: EmpLeaveRequest }>(
    `mutation ($id: Int!, $approve: Boolean!, $note: String) {
      decideLeaveAsAssignee(id: $id, approve: $approve, note: $note) {
        id status currentStepIndex decidedBy
      }
    }`,
    { id, approve, note: note || null },
  );
  return data.decideLeaveAsAssignee;
}

export type EmpPayslip = {
  id: number;
  payslipNumber: string;
  employeeName: string;
  netPayETB: number;
  grossSalaryETB: number;
  paymentStatus: string;
  periodKey: string;
  monthName: string;
  fromYmd: string;
  toYmd: string;
  createdAt: string;
};

export async function fetchMyPayslips() {
  const data = await gql<{ myPayslips: EmpPayslip[] }>(
    `query {
      myPayslips {
        id payslipNumber employeeName netPayETB grossSalaryETB paymentStatus
        periodKey monthName fromYmd toYmd createdAt
      }
    }`,
  );
  return data.myPayslips || [];
}
