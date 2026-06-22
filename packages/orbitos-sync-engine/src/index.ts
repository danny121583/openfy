import type { OrbitStorageProvider, OrbitSyncEvent, OrbitBaseObject, OrbitActivityNode } from '@orbitos/core-types';

export class SyncSequenceEngine {
  constructor(
    public readonly deviceId: string,
    public readonly provider: OrbitStorageProvider
  ) {}

  async getLocalSequence(): Promise<number> {
    const seqStr = await this.provider.getMetadata('sys_local_sequence') || '0';
    return parseInt(seqStr, 10);
  }

  async getPeerSequence(peerDeviceId: string): Promise<number> {
    const seqStr = await this.provider.getMetadata(`peer_seq_${peerDeviceId}`) || '0';
    return parseInt(seqStr, 10);
  }

  async setPeerSequence(peerDeviceId: string, seq: number): Promise<void> {
    await this.provider.setMetadata(`peer_seq_${peerDeviceId}`, seq.toString());
  }

  async prepareSyncRequest(peerDeviceId: string) {
    const lastSeen = await this.getPeerSequence(peerDeviceId);
    return {
      senderDeviceId: this.deviceId,
      lastSequenceSeenBySender: lastSeen
    };
  }

  async handleSyncRequest(request: { senderDeviceId: string; lastSequenceSeenBySender: number }) {
    const events = await this.provider.getPendingSyncEvents();
    const filteredEvents: OrbitSyncEvent[] = [];

    for (const event of events) {
      const obj = JSON.parse(event.payloadJson);
      // If the object's sync sequence is greater than what the peer has seen, include it
      if (obj.syncSequence > request.lastSequenceSeenBySender) {
        filteredEvents.push(event);
      }
    }

    const currentLocalSeq = await this.getLocalSequence();
    return {
      senderDeviceId: this.deviceId,
      events: filteredEvents,
      currentLocalSequence: currentLocalSeq
    };
  }

  async handleSyncResponse(response: { senderDeviceId: string; events: OrbitSyncEvent[]; currentLocalSequence: number }): Promise<void> {
    await this.provider.transaction(async () => {
      // Fetch all local objects (including deleted ones) to correctly evaluate conflict timestamps
      const localList = await this.provider.listObjects({ includeDeleted: true });

      for (const event of response.events) {
        const remoteObj = JSON.parse(event.payloadJson) as OrbitBaseObject;
        const localObj = localList.find(o => o.id === remoteObj.id);

        let shouldApply = false;
        if (!localObj) {
          shouldApply = true;
        } else {
          // Last-Write-Wins conflict resolution based on updatedAt and sequence tiebreakers
          if (remoteObj.updatedAt > localObj.updatedAt) {
            shouldApply = true;
          } else if (remoteObj.updatedAt === localObj.updatedAt) {
            if (remoteObj.syncSequence > localObj.syncSequence) {
              shouldApply = true;
            }
          }
        }

        if (shouldApply) {
          // Write to local object store (bypass runtime hooks to avoid feedback loop)
          await this.provider.putObject(remoteObj);

          // Append to local activity log to record that we received a sync update
          const activityId = `act_sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const activity: OrbitActivityNode = {
            activityId,
            sessionId: '',
            deviceId: this.deviceId,
            actor: { type: 'device', id: response.senderDeviceId },
            actionType: 'SYNC_RECEIVED',
            targetObjectId: remoteObj.id,
            changesPayloadJson: JSON.stringify(remoteObj),
            idempotencyKey: `idem_${activityId}`,
            signature: '',
            timestamp: Date.now()
          };
          await this.provider.appendActivity(activity);
        }
      }

      // Update the sequence watermark for this peer
      await this.setPeerSequence(response.senderDeviceId, response.currentLocalSequence);
    });
  }
}

export class MockNetwork {
  private engines: Map<string, SyncSequenceEngine> = new Map();
  public latencyMs = 0;
  public onlineDevices: Set<string> = new Set();

  register(engine: SyncSequenceEngine) {
    this.engines.set(engine.deviceId, engine);
    this.onlineDevices.add(engine.deviceId);
  }

  setOnline(deviceId: string, online: boolean) {
    if (online) {
      this.onlineDevices.add(deviceId);
    } else {
      this.onlineDevices.delete(deviceId);
    }
  }

  async sync(fromDeviceId: string, toDeviceId: string): Promise<boolean> {
    if (!this.onlineDevices.has(fromDeviceId) || !this.onlineDevices.has(toDeviceId)) {
      return false; // Offline
    }

    const fromEngine = this.engines.get(fromDeviceId);
    const toEngine = this.engines.get(toDeviceId);
    if (!fromEngine || !toEngine) return false;

    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }

    // 1. To sends sync request to From (asking for missing events)
    const request = await toEngine.prepareSyncRequest(fromDeviceId);
    
    // 2. From processes request and creates response packet
    const response = await fromEngine.handleSyncRequest(request);

    // 3. To ingests the response packet
    await toEngine.handleSyncResponse(response);

    return true;
  }
}
