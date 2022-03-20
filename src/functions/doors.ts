import { game } from "../cachedClasses";
import { MAX_NUM_DOORS } from "../constants";
import { DOOR_SLOT_TO_DIRECTION } from "../objects/doorSlotToDirection";

export function closeAllDoors(): void {
  for (const door of getDoors()) {
    door.Close(true);
  }
}

/**
 * Use this instead of the `GridEntityDoor.Close` method if you want the door to immediately close
 * without an animation.
 */
export function closeDoorFast(door: GridEntityDoor): void {
  door.State = DoorState.STATE_CLOSED;

  const sprite = door.GetSprite();
  sprite.Play("Closed", true);
}

export function doorSlotToDirection(doorSlot: DoorSlot): Direction {
  return DOOR_SLOT_TO_DIRECTION[doorSlot];
}

export function getAngelRoomDoor(): GridEntityDoor | undefined {
  const angelRoomDoors = getDoors(RoomType.ROOM_ANGEL);
  return angelRoomDoors.length === 0 ? undefined : angelRoomDoors[0];
}

export function getDevilRoomDoor(): GridEntityDoor | undefined {
  const devilRoomDoors = getDoors(RoomType.ROOM_DEVIL);
  return devilRoomDoors.length === 0 ? undefined : devilRoomDoors[0];
}

/**
 * If there is both a Devil Room and an Angel Room door, this function will return door with the
 * lowest slot number.
 */
export function getDevilRoomOrAngelRoomDoor(): GridEntityDoor | undefined {
  const devilRoomOrAngelRoomDoors = getDoors(
    RoomType.ROOM_DEVIL,
    RoomType.ROOM_ANGEL,
  );
  return devilRoomOrAngelRoomDoors.length === 0
    ? undefined
    : devilRoomOrAngelRoomDoors[0];
}

/**
 * Helper function to get all of the doors in the room. By default, it will return every door. You
 * can optionally specify one or more room types to return only the doors that match the specified
 * room types.
 */
export function getDoors(...roomTypes: RoomType[]): GridEntityDoor[] {
  const room = game.GetRoom();
  const roomTypesSet = new Set(roomTypes);

  const doors: GridEntityDoor[] = [];
  for (let i = 0; i < MAX_NUM_DOORS; i++) {
    const door = room.GetDoor(i);
    if (door === undefined) {
      continue;
    }

    if (roomTypes.length === 0 || roomTypesSet.has(door.TargetRoomType)) {
      doors.push(door);
    }
  }

  return doors;
}

/**
 * Helper function to get all of the doors in the room that lead to the provided room index.
 *
 * This function is variadic, meaning that you can specify N arguments to return all of the doors
 * that match any of the N room grid indexes.
 */
export function getDoorsToRoomIndex(...roomGridIndex: int[]): GridEntityDoor[] {
  const roomGridIndexesSet = new Set(roomGridIndex);
  const doors = getDoors();
  return doors.filter((door) => roomGridIndexesSet.has(door.TargetRoomIndex));
}

export function getRepentanceDoor(): GridEntityDoor | undefined {
  const doors = getDoors();
  return doors.find((door) => isRepentanceDoor(door));
}

export function isAngelRoomDoor(door: GridEntityDoor): boolean {
  return door.TargetRoomType === RoomType.ROOM_ANGEL;
}

export function isDevilRoomDoor(door: GridEntityDoor): boolean {
  return door.TargetRoomType === RoomType.ROOM_DEVIL;
}

/**
 * This refers to the Repentance door that spawns in a boss room after defeating the boss.
 * You have to spend one key to open it.
 * It has a sprite filename of "gfx/grid/Door_Downpour.anm2".
 */
export function isDoorToDownpour(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Downpour.anm2";
}

/**
 * This refers to the Repentance door that spawns in a boss room after defeating the boss.
 * You have to spend two hearts to open it.
 * It has a sprite filename of "gfx/grid/Door_Mausoleum.anm2".
 */
export function isDoorToMausoleum(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Mausoleum.anm2";
}

/**
 * This refers to the "strange door" located on the first room of Depths 2.
 * You open it with either a Polaroid or a Negative.
 * It has a sprite filename of "gfx/grid/Door_Mausoleum_Alt.anm2".
 */
export function isDoorToMausoleumAscent(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Mausoleum_Alt.anm2";
}

/**
 * This refers to the Repentance door that spawns in a boss room after defeating the boss.
 * You have to spend two bombs to open it.
 * It has a sprite filename of "gfx/grid/Door_Mines.anm2".
 */
export function isDoorToMines(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_Mines.anm2";
}

/**
 * This refers to the Repentance door that spawns after defeating Mom.
 * You open it with the completed knife.
 * It has a sprite filename of "gfx/grid/Door_MomsHeart.anm2".
 */
export function isDoorToMomsHeart(door: GridEntityDoor): boolean {
  if (!isRepentanceDoor(door)) {
    return false;
  }

  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_MomsHeart.anm2";
}

export function isHiddenSecretRoomDoor(door: GridEntityDoor): boolean {
  const sprite = door.GetSprite();
  const animation = sprite.GetAnimation();

  return isSecretRoomDoor(door) && animation === "Hidden";
}

export function isRepentanceDoor(door: GridEntityDoor): boolean {
  return door.TargetRoomIndex === GridRooms.ROOM_SECRET_EXIT_IDX;
}

export function isSecretRoomDoor(door: GridEntityDoor): boolean {
  const sprite = door.GetSprite();
  const filename = sprite.GetFilename();

  return filename === "gfx/grid/Door_08_HoleInWall.anm2";
}

/**
 * Helper function to reset an unlocked door back to a locked state. Doing this is non-trivial
 * because in addition to calling the `GridEntityDoor.SetLocked` method, you must also:
 *
 * - Set the `VisitedCount` of the room's `RoomDescription` to 0.
 * - Set the variant to `DoorVariant.DOOR_LOCKED`.
 * - Close the door.
 */
export function lockDoor(door: GridEntityDoor): void {
  const level = game.GetLevel();

  const roomDescriptor = level.GetRoomByIdx(door.TargetRoomIndex);
  // (we can't use the "getRoomDescriptor" function since it will cause a dependency cycle)
  roomDescriptor.VisitedCount = 0;

  door.SetVariant(DoorVariant.DOOR_LOCKED);
  door.SetLocked(true);
  door.Close(true);
}

/**
 * For the purposes of this function, doors to Secret Rooms or Super Secret Rooms that have not been
 * discovered yet will not be opened.
 */
export function openAllDoors(): void {
  for (const door of getDoors()) {
    // If we try to open a hidden Secret Room door (or Super Secret Room door),
    // then nothing will happen
    door.Open();
  }
}

/**
 * Use this instead of the `GridEntityDoor.Open` method if you want the door to immediately open
 * without an animation.
 */
export function openDoorFast(door: GridEntityDoor): void {
  door.State = DoorState.STATE_OPEN;

  const sprite = door.GetSprite();
  sprite.Play("Opened", true);
}

/**
 * Helper function to remove all of the doors in the room. By default, it will remove every door.
 * You can optionally specify one or more room types to remove only the doors that match the
 * specified room types.
 *
 * @returns The number of doors removed.
 */
export function removeAllDoors(...roomTypes: RoomType[]): int {
  const doors = getDoors(...roomTypes);
  removeDoors(...doors);

  return doors.length;
}

/** Helper function to remove a single door. */
export function removeDoor(door: GridEntityDoor): void {
  const room = game.GetRoom();
  room.RemoveDoor(door.Slot);
}

/**
 * Helper function to remove the doors provided.
 *
 * This function is variadic, meaning that you can specify as many doors as you want to remove.
 */
export function removeDoors(...doors: GridEntityDoor[]): void {
  for (const door of doors) {
    removeDoor(door);
  }
}
