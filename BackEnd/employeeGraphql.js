import {
  assertEmployee,
  consumeEmployeeLoginAttempt,
  signEmployeeToken,
} from "./lib/employeeAuth.js";
import {
  clearOtpPreviewFields,
  hashPortalOtp,
  isValidPortalOtpFormat,
  normalizePortalOtp,
  verifyPortalOtp,
} from "./hrPortalOtp.js";
import {
  decideLeaveOnEngine,
  effectiveSteps,
  prepareLeaveFlowAttachment,
  recordEscalations,
  resolveAssignees,
} from "./hrApprovalEngine.js";

function publicEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    HotelName: row.HotelName,
    fullName: row.fullName,
    phone: row.phone || "",
    email: row.email || "",
    department: row.department || "",
    jobTitle: row.jobTitle || "",
    orgPosition: row.orgPosition || "employee",
    teamId: row.teamId ?? null,
    status: row.status || "",
    mustChangeOtp: Boolean(row.mustChangeOtp),
    profileImageUrl: row.profileImageUrl || "",
    portalFirstLoginAt: row.portalFirstLoginAt ?? null,
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function assertYmd(value, label) {
  const s = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  return s;
}

async function resolveTenantHotelNames(prisma, tenantTin) {
  const tin = String(tenantTin || "").trim();
  if (!tin) return [];
  const keys = new Set([tin]);
  const users = await prisma.user.findMany({
    where: { tinNumber: tin },
    select: { HotelName: true, tinNumber: true },
    take: 40,
  });
  for (const u of users) {
    if (u.tinNumber) keys.add(String(u.tinNumber).trim());
    if (u.HotelName) keys.add(String(u.HotelName).trim());
  }
  const account = await prisma.tenant_account.findUnique({
    where: { tinNumber: tin },
    select: { hotelDisplayName: true },
  });
  if (account?.hotelDisplayName) {
    keys.add(String(account.hotelDisplayName).trim());
  }
  return [...keys].filter(Boolean);
}

async function loadMe(prisma, employeeId) {
  const row = await prisma.hr_employee.findUnique({ where: { id: employeeId } });
  if (!row) throw new Error("Employee not found");
  return row;
}

export const employeeTypeDefs = `
  type HrEmployeePublic {
    id: Int!
    HotelName: String!
    fullName: String!
    phone: String!
    email: String!
    department: String!
    jobTitle: String!
    orgPosition: String!
    teamId: Int
    status: String!
    mustChangeOtp: Boolean!
    profileImageUrl: String!
    portalFirstLoginAt: DateTime
  }

  type EmployeeSession {
    token: String!
    employee: HrEmployeePublic!
  }

  type HrNotificationEmp {
    id: Int!
    kind: String!
    title: String!
    body: String!
    href: String!
    actionStatus: String!
    readAt: DateTime
    createdAt: DateTime!
  }

  type EmpLeaveRequest {
    id: Int!
    leaveType: String!
    fromYmd: String!
    toYmd: String!
    days: Float!
    reason: String!
    status: String!
    currentStepIndex: Int!
    decidedBy: String!
    decidedAt: DateTime
    createdAt: DateTime!
    employeeName: String!
  }

  type EmpPayslip {
    id: Int!
    payslipNumber: String!
    employeeName: String!
    netPayETB: Float!
    grossSalaryETB: Float!
    paymentStatus: String!
    periodKey: String!
    monthName: String!
    fromYmd: String!
    toYmd: String!
    createdAt: DateTime!
  }

  type EmpLeaveType {
    code: String!
    label: String!
    paid: Boolean!
  }
`;

export const employeeQueryFields = `
  employeeMe: HrEmployeePublic!
  employeeNotifications(unreadOnly: Boolean): [HrNotificationEmp!]!
  myLeaveRequests: [EmpLeaveRequest!]!
  myLeaveTypes: [EmpLeaveType!]!
  pendingApprovalsForMe: [EmpLeaveRequest!]!
  myPayslips: [EmpPayslip!]!
`;

export const employeeMutationFields = `
  employeeLogin(tenantTin: String!, otp: String!): EmployeeSession!
  changeOwnOtp(currentOtp: String!, newOtp: String!): Boolean!
  markOwnNotificationRead(id: Int!): HrNotificationEmp!
  updateOwnProfile(profileImageUrl: String): HrEmployeePublic!
  createOwnLeaveRequest(
    leaveType: String!
    fromYmd: String!
    toYmd: String!
    days: Float
    reason: String
  ): EmpLeaveRequest!
  decideLeaveAsAssignee(id: Int!, approve: Boolean!, note: String): EmpLeaveRequest!
`;

function mapLeave(row) {
  return {
    id: row.id,
    leaveType: row.leaveType,
    fromYmd: row.fromYmd,
    toYmd: row.toYmd,
    days: row.days,
    reason: row.reason || "",
    status: row.status,
    currentStepIndex: row.currentStepIndex || 0,
    decidedBy: row.decidedBy || "",
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    employeeName: row.employee?.fullName || "",
  };
}

export const employeeResolvers = {
  Query: {
    employeeMe: async (_, __, context) => {
      const employeeId = assertEmployee(context);
      return publicEmployee(await loadMe(context.prisma, employeeId));
    },

    employeeNotifications: async (_, { unreadOnly }, context) => {
      const employeeId = assertEmployee(context);
      return context.prisma.hr_notification.findMany({
        where: {
          employeeId,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    },

    myLeaveTypes: async (_, __, context) => {
      const me = await loadMe(context.prisma, assertEmployee(context));
      return context.prisma.hr_leave_type.findMany({
        where: { HotelName: me.HotelName, active: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      });
    },

    myLeaveRequests: async (_, __, context) => {
      const employeeId = assertEmployee(context);
      const rows = await context.prisma.hr_leave_request.findMany({
        where: { employeeId },
        include: { employee: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return rows.map(mapLeave);
    },

    pendingApprovalsForMe: async (_, __, context) => {
      const me = await loadMe(context.prisma, assertEmployee(context));
      if (me.orgPosition !== "leader") return [];
      const pending = await context.prisma.hr_leave_request.findMany({
        where: { HotelName: me.HotelName, status: "pending" },
        include: { employee: true, flow: true },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      const out = [];
      for (const leave of pending) {
        const flow = leave.flow || {
          requireTeamLeaderFirst: true,
          stepsJson: [{ kind: "department_leader" }, { kind: "manager" }],
        };
        const steps = effectiveSteps(flow, {
          hasTeam: Boolean(leave.employee?.teamId),
        });
        const idx = Number(leave.currentStepIndex) || 0;
        const kind = steps[idx]?.kind || "department_leader";
        const assignees = await resolveAssignees(context.prisma, {
          HotelName: leave.HotelName,
          kind,
          employee: leave.employee,
        });
        if (assignees.employeeIds.includes(me.id)) out.push(mapLeave(leave));
      }
      return out;
    },

    myPayslips: async (_, __, context) => {
      const employeeId = assertEmployee(context);
      const rows = await context.prisma.hr_payslip.findMany({
        where: { employeeId },
        include: { period: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return rows.map((r) => ({
        id: r.id,
        payslipNumber: r.payslipNumber || "",
        employeeName: r.employeeName || "",
        netPayETB: r.netPayETB || 0,
        grossSalaryETB: r.grossSalaryETB || 0,
        paymentStatus: r.paymentStatus || "",
        periodKey: r.period?.periodKey || "",
        monthName: r.period?.monthName || "",
        fromYmd: r.period?.fromYmd || "",
        toYmd: r.period?.toYmd || "",
        createdAt: r.createdAt,
      }));
    },
  },

  Mutation: {
    employeeLogin: async (_, { tenantTin, otp }, context) => {
      const attempt = consumeEmployeeLoginAttempt(
        `${context.clientIp || "ip"}:${String(tenantTin || "").trim()}`,
      );
      if (!attempt.ok) {
        throw new Error(
          `Too many login attempts — try again in ${attempt.retryAfterSec}s`,
        );
      }
      const tin = String(tenantTin || "").trim();
      const normalized = normalizePortalOtp(otp);
      if (!tin) throw new Error("Property TIN is required");
      if (!isValidPortalOtpFormat(normalized)) {
        throw new Error("Enter your 6-character portal code (letters and digits)");
      }

      const hotelNames = await resolveTenantHotelNames(context.prisma, tin);
      if (!hotelNames.length) throw new Error("Unknown property TIN");

      const candidates = await context.prisma.hr_employee.findMany({
        where: {
          HotelName: { in: hotelNames },
          status: { not: "terminated" },
          portalOtpHash: { not: "" },
        },
        take: 200,
      });

      let matched = null;
      for (const row of candidates) {
        if (await verifyPortalOtp(normalized, row.portalOtpHash)) {
          matched = row;
          break;
        }
      }
      if (!matched) throw new Error("Invalid portal code for this property");

      const isFirstLogin = !matched.portalFirstLoginAt;
      const data = {
        ...(isFirstLogin
          ? {
              portalFirstLoginAt: new Date(),
              ...clearOtpPreviewFields(),
            }
          : {}),
      };
      const updated =
        Object.keys(data).length > 0
          ? await context.prisma.hr_employee.update({
              where: { id: matched.id },
              data,
            })
          : matched;

      const token = signEmployeeToken({
        employeeId: updated.id,
        HotelName: updated.HotelName,
        tinNumber: tin,
        fullName: updated.fullName,
      });
      return { token, employee: publicEmployee(updated) };
    },

    changeOwnOtp: async (_, { currentOtp, newOtp }, context) => {
      const employeeId = assertEmployee(context);
      const row = await loadMe(context.prisma, employeeId);
      const cur = normalizePortalOtp(currentOtp);
      const next = normalizePortalOtp(newOtp);
      if (!isValidPortalOtpFormat(next)) {
        throw new Error("New code must be 6 alphanumeric characters");
      }
      if (!(await verifyPortalOtp(cur, row.portalOtpHash))) {
        throw new Error("Current portal code is incorrect");
      }
      if (cur === next) {
        throw new Error("Choose a different portal code");
      }
      const portalOtpHash = await hashPortalOtp(next);
      await context.prisma.hr_employee.update({
        where: { id: employeeId },
        data: {
          portalOtpHash,
          mustChangeOtp: false,
          ...clearOtpPreviewFields(),
        },
      });
      return true;
    },

    markOwnNotificationRead: async (_, { id }, context) => {
      const employeeId = assertEmployee(context);
      const note = await context.prisma.hr_notification.findFirst({
        where: { id: Number(id), employeeId },
      });
      if (!note) throw new Error("Notification not found");
      if (note.readAt) return note;
      return context.prisma.hr_notification.update({
        where: { id: note.id },
        data: { readAt: new Date() },
      });
    },

    updateOwnProfile: async (_, { profileImageUrl }, context) => {
      const employeeId = assertEmployee(context);
      const data = {};
      if (profileImageUrl != null) {
        data.profileImageUrl = String(profileImageUrl).trim().slice(0, 500);
      }
      const updated = await context.prisma.hr_employee.update({
        where: { id: employeeId },
        data,
      });
      return publicEmployee(updated);
    },

    createOwnLeaveRequest: async (
      _,
      { leaveType, fromYmd, toYmd, days, reason },
      context,
    ) => {
      const me = await loadMe(context.prisma, assertEmployee(context));
      const lt = String(leaveType ?? "").trim();
      if (!lt) throw new Error("Leave type is required");
      const typeRow = await context.prisma.hr_leave_type.findFirst({
        where: { HotelName: me.HotelName, code: lt, active: true },
      });
      if (!typeRow) throw new Error("Invalid leave type");
      const from = assertYmd(fromYmd, "fromYmd");
      const to = assertYmd(toYmd, "toYmd");
      if (to < from) throw new Error("toYmd must not be before fromYmd");
      const d = days != null ? Number(days) : 1;
      if (!(d > 0)) throw new Error("days must be positive");

      const account = await context.prisma.tenant_account.findFirst({
        where: {
          OR: [{ hotelDisplayName: me.HotelName }, { tinNumber: me.HotelName }],
        },
        select: { hrSoloManagerEnabled: true },
      });
      const prep = await prepareLeaveFlowAttachment(context.prisma, {
        employee: me,
        businessType: "",
        hrSoloManagerEnabled: Boolean(account?.hrSoloManagerEnabled),
      });

      const created = await context.prisma.hr_leave_request.create({
        data: {
          HotelName: me.HotelName,
          employeeId: me.id,
          leaveType: lt,
          fromYmd: from,
          toYmd: to,
          days: round2(d),
          reason: String(reason ?? "").trim(),
          status: "pending",
          flowId: prep.flowId,
          currentStepIndex: prep.currentStepIndex,
        },
        include: { employee: true },
      });
      await recordEscalations(context.prisma, {
        HotelName: me.HotelName,
        requestId: created.id,
        steps: prep.steps,
        escalatedKinds: prep.escalatedKinds,
      });
      return mapLeave(created);
    },

    decideLeaveAsAssignee: async (_, { id, approve, note }, context) => {
      const me = await loadMe(context.prisma, assertEmployee(context));
      const leave = await context.prisma.hr_leave_request.findUnique({
        where: { id: Number(id) },
        include: { employee: true },
      });
      if (!leave || leave.HotelName !== me.HotelName) {
        throw new Error("Leave request not found");
      }
      const updated = await decideLeaveOnEngine(context.prisma, {
        leave,
        approve: Boolean(approve),
        actor: { employeeId: me.id, name: me.fullName },
        note,
        onFinalApprove: async (row) => {
          const typeRow = await context.prisma.hr_leave_type.findFirst({
            where: { HotelName: row.HotelName, code: row.leaveType },
          });
          if (typeRow?.paid) {
            const balance = await context.prisma.hr_leave_balance.findUnique({
              where: {
                employeeId_leaveType: {
                  employeeId: row.employeeId,
                  leaveType: row.leaveType,
                },
              },
            });
            const nextBalance = round2(
              (balance ? Number(balance.balanceDays) : 0) - Number(row.days),
            );
            await context.prisma.hr_leave_balance.upsert({
              where: {
                employeeId_leaveType: {
                  employeeId: row.employeeId,
                  leaveType: row.leaveType,
                },
              },
              create: {
                HotelName: row.HotelName,
                employeeId: row.employeeId,
                leaveType: row.leaveType,
                balanceDays: nextBalance,
              },
              update: { balanceDays: nextBalance },
            });
          }
        },
      });
      return mapLeave(updated);
    },
  },
};
