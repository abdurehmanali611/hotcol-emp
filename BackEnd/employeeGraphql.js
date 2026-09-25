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
    status: row.status || "",
    mustChangeOtp: Boolean(row.mustChangeOtp),
    profileImageUrl: row.profileImageUrl || "",
    portalFirstLoginAt: row.portalFirstLoginAt ?? null,
  };
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

export const employeeTypeDefs = `
  type HrEmployeePublic {
    id: Int!
    HotelName: String!
    fullName: String!
    phone: String!
    email: String!
    department: String!
    jobTitle: String!
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
`;

export const employeeQueryFields = `
  employeeMe: HrEmployeePublic!
  employeeNotifications(unreadOnly: Boolean): [HrNotificationEmp!]!
`;

export const employeeMutationFields = `
  employeeLogin(tenantTin: String!, otp: String!): EmployeeSession!
  changeOwnOtp(currentOtp: String!, newOtp: String!): Boolean!
  markOwnNotificationRead(id: Int!): HrNotificationEmp!
`;

export const employeeResolvers = {
  Query: {
    employeeMe: async (_, __, context) => {
      const employeeId = assertEmployee(context);
      const row = await context.prisma.hr_employee.findUnique({
        where: { id: employeeId },
      });
      if (!row) throw new Error("Employee not found");
      return publicEmployee(row);
    },

    employeeNotifications: async (_, { unreadOnly }, context) => {
      const employeeId = assertEmployee(context);
      const where = {
        employeeId,
        ...(unreadOnly ? { readAt: null } : {}),
      };
      return context.prisma.hr_notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
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
          status: { not: "Terminated" },
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
      const row = await context.prisma.hr_employee.findUnique({
        where: { id: employeeId },
      });
      if (!row) throw new Error("Employee not found");
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
  },
};
