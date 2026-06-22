/* OrbitOS Core Types Specification */

export type OrbitObjectType =
  | 'file'
  | 'folder'
  | 'document'
  | 'app'
  | 'agent'
  | 'workflow'
  | 'session'
  | 'device'
  | 'user'
  | 'conversation'
  | 'order'
  | 'customer'
  | 'payment'
  | 'memory';

export type OrbitDeviceType =
  | 'desktop'
  | 'phone'
  | 'tablet'
  | 'kiosk'
  | 'embedded';

export type ApprovalLevel =
  | 'silent'
  | 'notify'
  | 'ask_once'
  | 'ask_every_time'
  | 'admin_only'
  | 'blocked';

export type CapabilityScope =
  | 'files.read'
  | 'files.write'
  | 'files.delete'
  | 'objects.create'
  | 'objects.update'
  | 'agents.invoke'
  | 'agents.install'
  | 'session.handoff'
  | 'devices.discover'
  | 'devices.control'
  | 'notifications.send'
  | 'network.request'
  | 'hardware.print'
  | 'payments.request'
  | 'camera.read'
  | 'microphone.read'
  | 'location.read'
  | 'secrets.use';

export interface OrbitRelationship {
  targetId: string;
  relationType: string;
}

export interface OrbitKnowledgeLayer {
  summary: string;
  tags: string[];
  embeddingsId: string | null;
  notes: string;
  relationships: OrbitRelationship[];
  versionHistory: Array<{
    version: number;
    updatedAt: number;
    updatedBy: string;
    changeDeltaUrl?: string;
  }>;
  auditTrail: Array<{
    activityId: string;
    timestamp: number;
    actionType: string;
    actorId: string;
  }>;
}

export interface OrbitBaseObject {
  id: string;
  schemaType: OrbitObjectType;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  syncSequence: number;
  isDeleted: boolean;
  metadata: Record<string, any>;
  knowledge: OrbitKnowledgeLayer;
}

export interface OFSFileObject extends OrbitBaseObject {
  schemaType: 'file';
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageUrl: string;
}

export interface OFSFolderObject extends OrbitBaseObject {
  schemaType: 'folder';
  name: string;
  parentFolderId: string | null;
  childObjectIds: string[];
}

export interface OFSDocumentObject extends OrbitBaseObject {
  schemaType: 'document';
  title: string;
  crdtStateUrl: string;
  plainTextPreview: string;
}

export interface OrbitAppObject extends OrbitBaseObject {
  schemaType: 'app';
  appId: string;
  name: string;
  version: string;
  supportedDevices: OrbitDeviceType[];
  entryPointsJson: string;
  declaredPermissions: string[];
}

export interface OrbitAgentObject extends OrbitBaseObject {
  schemaType: 'agent';
  agentId: string;
  name: string;
  type: 'system' | 'app' | 'object' | 'workflow' | 'device' | 'security' | 'sync';
  requiredScopes: string[];
  mcpServerConfigJson: string;
}

export interface OrbitWorkflowObject extends OrbitBaseObject {
  schemaType: 'workflow';
  workflowId: string;
  name: string;
  stepsJson: string;
  triggerCondition: string;
  lastRunStatus: 'idle' | 'running' | 'success' | 'failed';
}

export interface OrbitSessionObject extends OrbitBaseObject {
  schemaType: 'session';
  sessionId: string;
  activeDeviceId: string;
  activeAppId: string;
  currentRoute: string;
  activeObjectId: string | null;
  serializedStateJson: string;
  agentContextId: string | null;
}

export interface OrbitDeviceObject extends OrbitBaseObject {
  schemaType: 'device';
  deviceId: string;
  name: string;
  type: OrbitDeviceType;
  ipAddress: string;
  publicKey: string;
  status: 'online' | 'warning' | 'offline';
  lastSeen: number;
}

export interface OrbitUserObject extends OrbitBaseObject {
  schemaType: 'user';
  username: string;
  email: string;
  biometricKeyHash: string;
  trustedDeviceRingIds: string[];
}

export interface OrbitConversationObject extends OrbitBaseObject {
  schemaType: 'conversation';
  participants: Array<{ role: 'user' | 'agent'; id: string }>;
  messagesJson: string;
  lastMessageTimestamp: number;
}

export interface OrbitOrderObject extends OrbitBaseObject {
  schemaType: 'order';
  orderId: string;
  itemsListJson: string;
  totalAmount: number;
  paymentStatus: 'unpaid' | 'authorized' | 'paid';
  kdsStatus: 'pending' | 'cooking' | 'ready' | 'bumped';
}

export interface OrbitCustomerObject extends OrbitBaseObject {
  schemaType: 'customer';
  name: string;
  company: string;
  email: string;
  phone: string;
  leadScore: number;
}

export interface OrbitPaymentObject extends OrbitBaseObject {
  schemaType: 'payment';
  paymentId: string;
  orderId: string;
  amount: number;
  method: 'cash' | 'card' | 'nfc' | 'external';
  transactionReference: string;
}

export interface OrbitMemoryObject extends OrbitBaseObject {
  schemaType: 'memory';
  targetObjectId: string;
  vectorDataJson: string;
  chunkIndex: number;
  textChunk: string;
}

export interface OrbitActivityNode {
  activityId: string;
  sessionId: string;
  deviceId: string;
  actor: {
    type: 'user' | 'agent' | 'system' | 'device';
    id: string;
  };
  actionType:
    | 'OBJECT_CREATE'
    | 'OBJECT_UPDATE'
    | 'OBJECT_DELETE'
    | 'AGENT_PLAN'
    | 'AGENT_TOOL_CALL'
    | 'DEVICE_CONNECTED'
    | 'USER_APPROVAL'
    | 'SYNC_RECEIVED';
  targetObjectId: string;
  changesPayloadJson: string;
  idempotencyKey: string;
  signature: string;
  timestamp: number;
}

export interface CapabilityRule {
  ruleId: string;
  accessor: {
    type: 'app' | 'agent' | 'user_role';
    id: string;
  };
  permittedScope: string;
  targetObjectType: OrbitObjectType | 'all';
  targetObjectIdConstraint?: string;
  permittedActions: Array<'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE'>;
  approvalLevel: ApprovalLevel;
  expiresAt?: number;
}

export interface OrbitStorageProvider {
  initialize(): Promise<void> | void;
  transaction<T>(fn: () => T | Promise<T>): Promise<T> | T;
  getObject(id: string): Promise<OrbitBaseObject | null> | OrbitBaseObject | null;
  putObject(object: OrbitBaseObject): Promise<void> | void;
  deleteObject(id: string): Promise<void> | void;
  listObjects(options?: { includeDeleted?: boolean }): Promise<OrbitBaseObject[]> | OrbitBaseObject[];
  appendActivity(activity: OrbitActivityNode): Promise<void> | void;
  listActivities(): Promise<OrbitActivityNode[]> | OrbitActivityNode[];
  saveCapability(rule: CapabilityRule): Promise<void> | void;
  deleteCapability(ruleId: string): Promise<void> | void;
  listCapabilities(): Promise<CapabilityRule[]> | CapabilityRule[];
  getMetadata(key: string): Promise<string | null> | string | null;
  setMetadata(key: string, value: string): Promise<void> | void;
  close(): Promise<void> | void;
}

