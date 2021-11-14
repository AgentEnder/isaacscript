export type PostNPCInitLateCallbackType = (npc: EntityNPC) => void;

const subscriptions: Array<[PostNPCInitLateCallbackType, int | undefined]> = [];

export function hasSubscriptions(): boolean {
  return subscriptions.length > 0;
}

export function register(
  callback: PostNPCInitLateCallbackType,
  entityType?: EntityType,
): void {
  subscriptions.push([callback, entityType]);
}

export function fire(npc: EntityNPC): void {
  for (const [callback, entityType] of subscriptions) {
    // Handle the optional 2nd callback argument
    if (entityType !== undefined && entityType !== npc.Type) {
      continue;
    }

    callback(npc);
  }
}
