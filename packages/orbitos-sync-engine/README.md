# @orbitos/sync-engine

Synchronization Sequence Engine and Event Sourcing logic for OrbitOS.

## Synchronization Sequence Protocol

The engine synchronizes local database state across multiple devices in the ring by tracking local sequence watermarks (`sys_local_sequence`) and peer watermarks (`peer_seq_<deviceId>`). It compares vectors and retrieves missing events from the local `sync_queue`.

## Conflict Resolution Strategy

### LWW (Last-Write-Wins) — Temporary MVP Policy
Currently, conflicts are resolved using a **Last-Write-Wins** strategy:
- The node compares the incoming `updatedAt` timestamp with the local copy.
- If the remote timestamp is strictly newer, the remote object is written to the database.
- If the timestamps are equal, the `syncSequence` number is used as a tiebreaker.

> [!WARNING]
> **Temporary Conflict Strategy**: LWW is a temporary MVP strategy. For complex collaborative workspaces (such as documents, concurrent notes, or shared agent planning spaces), LWW will be replaced with Automerge, Yjs, or custom state-based Conflict-Free Replicated Data Types (CRDTs).

## Network Simulation

A `MockNetwork` class is included to test offline transitions, drop events, and mock roundtrip latencies during test execution.
