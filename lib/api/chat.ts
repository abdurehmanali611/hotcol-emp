import { readEmployeeToken } from "@/lib/employeeSession";

const API_URL =
  process.env.NEXT_PUBLIC_EMP_API_URL || "https://hotcol-emp-backend.vercel.app/graphql";

const THREAD_FIELDS = `
  id HotelName kind title createdByEmployeeId createdByManagerUserId
  createdAt updatedAt messageCount
  lastMessage { id body imageUrl createdAt senderIsManager senderName senderEmployeeId }
  members {
    id threadId employeeId isManager memberKey joinedAt lastReadAt employeeName
  }
`;

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = readEmployeeToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || "Chat request failed");
  }
  return json.data as T;
}

export type EmpChatMember = {
  id: number;
  threadId: number;
  employeeId: number | null;
  isManager: boolean;
  memberKey: string;
  joinedAt: string;
  lastReadAt: string | null;
  employeeName: string | null;
};

export type EmpChatMessage = {
  id: number;
  threadId: number;
  senderEmployeeId: number | null;
  senderIsManager: boolean;
  body: string;
  imageUrl?: string;
  createdAt: string;
  senderName: string;
};

export type EmpChatThread = {
  id: number;
  HotelName: string;
  kind: string;
  title: string;
  createdByEmployeeId: number | null;
  createdByManagerUserId: number | null;
  createdAt: string;
  updatedAt: string;
  members: EmpChatMember[];
  lastMessage: EmpChatMessage | null;
  messageCount: number | null;
};

export type EmpChatPeer = {
  id: number;
  fullName: string;
  department: string;
  jobTitle: string;
};

export async function fetchMyChatThreads(): Promise<EmpChatThread[]> {
  const data = await gql<{ myChatThreads: EmpChatThread[] }>(
    `query { myChatThreads { ${THREAD_FIELDS} } }`,
  );
  return data.myChatThreads || [];
}

export async function fetchMyChatMessages(
  threadId: number,
  limit = 200,
): Promise<EmpChatMessage[]> {
  const data = await gql<{ myChatMessages: EmpChatMessage[] }>(
    `query ($threadId: Int!, $limit: Int) {
      myChatMessages(threadId: $threadId, limit: $limit) {
        id threadId senderEmployeeId senderIsManager body imageUrl createdAt senderName
      }
    }`,
    { threadId, limit },
  );
  return data.myChatMessages || [];
}

export async function fetchMyChatUnreadCount(): Promise<number> {
  const data = await gql<{ myChatUnreadCount: number }>(
    `query { myChatUnreadCount }`,
  );
  return data.myChatUnreadCount || 0;
}

export async function fetchMyChatPeers(): Promise<EmpChatPeer[]> {
  const data = await gql<{ myChatPeers: EmpChatPeer[] }>(
    `query {
      myChatPeers { id fullName department jobTitle }
    }`,
  );
  return data.myChatPeers || [];
}

export async function createMyChatWithManagerApi(): Promise<EmpChatThread> {
  const data = await gql<{ createMyChatWithManager: EmpChatThread }>(
    `mutation {
      createMyChatWithManager { ${THREAD_FIELDS} }
    }`,
  );
  return data.createMyChatWithManager;
}

export async function createMyChatDirectApi(input: {
  peerEmployeeId: number;
  withManager?: boolean;
}): Promise<EmpChatThread> {
  const data = await gql<{ createMyChatDirect: EmpChatThread }>(
    `mutation ($peerEmployeeId: Int!, $withManager: Boolean) {
      createMyChatDirect(peerEmployeeId: $peerEmployeeId, withManager: $withManager) {
        ${THREAD_FIELDS}
      }
    }`,
    {
      peerEmployeeId: input.peerEmployeeId,
      withManager: input.withManager ?? false,
    },
  );
  return data.createMyChatDirect;
}

export async function createMyChatGroupApi(input: {
  title?: string;
  peerEmployeeIds: number[];
  withManager?: boolean;
}): Promise<EmpChatThread> {
  const data = await gql<{ createMyChatGroup: EmpChatThread }>(
    `mutation ($title: String, $peerEmployeeIds: [Int!]!, $withManager: Boolean) {
      createMyChatGroup(
        title: $title
        peerEmployeeIds: $peerEmployeeIds
        withManager: $withManager
      ) { ${THREAD_FIELDS} }
    }`,
    {
      title: input.title || null,
      peerEmployeeIds: input.peerEmployeeIds,
      withManager: input.withManager ?? false,
    },
  );
  return data.createMyChatGroup;
}

export async function sendMyChatMessageApi(
  threadId: number,
  body: string,
  imageUrl?: string | null,
): Promise<EmpChatMessage> {
  const data = await gql<{ sendMyChatMessage: EmpChatMessage }>(
    `mutation ($threadId: Int!, $body: String, $imageUrl: String) {
      sendMyChatMessage(threadId: $threadId, body: $body, imageUrl: $imageUrl) {
        id threadId senderEmployeeId senderIsManager body imageUrl createdAt senderName
      }
    }`,
    {
      threadId,
      body: body?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
    },
  );
  return data.sendMyChatMessage;
}

export async function markMyChatThreadReadApi(
  threadId: number,
): Promise<EmpChatThread> {
  const data = await gql<{ markMyChatThreadRead: EmpChatThread }>(
    `mutation ($threadId: Int!) {
      markMyChatThreadRead(threadId: $threadId) { ${THREAD_FIELDS} }
    }`,
    { threadId },
  );
  return data.markMyChatThreadRead;
}
