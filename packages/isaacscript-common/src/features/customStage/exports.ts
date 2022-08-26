/**
 * These are helper functions relating to creating custom stages with the built-in standard library.
 * For more information about custom stages, see the [main
 * documentation page](https://isaacscript.github.io/main/custom-stages).
 *
 * @module
 */

import {
  DoorSlot,
  LevelStage,
  RoomShape,
  RoomType,
  StageType,
} from "isaac-typescript-definitions";
import { reorderedCallbacksSetStageInternal } from "../../callbacks/reorderedCallbacks";
import { game } from "../../core/cachedClasses";
import { doorSlotFlagsToDoorSlots } from "../../functions/doors";
import { logError } from "../../functions/log";
import { newRNG } from "../../functions/rng";
import {
  getRoomDataForTypeVariant,
  getRoomsInsideGrid,
} from "../../functions/rooms";
import { setStage } from "../../functions/stage";
import { asNumber } from "../../functions/types";
import { CustomStageRoomMetadata } from "../../interfaces/CustomStageTSConfig";
import { CustomStage } from "../../interfaces/private/CustomStage";
import {
  getRandomBossRoomFromPool,
  getRandomCustomStageRoom,
} from "./customStageUtils";
import v, { customStageCachedRoomData, customStagesMap } from "./v";

export const DEFAULT_BASE_STAGE = LevelStage.BASEMENT_2;
export const DEFAULT_BASE_STAGE_TYPE = StageType.ORIGINAL;

/**
 * Equal to -1. Setting the stage to an invalid stage value is useful in that it prevents backdrops
 * and shadows from loading.
 */
export const CUSTOM_FLOOR_STAGE = -1 as LevelStage;

/**
 * We must use `StageType.WRATH_OF_THE_LAMB` instead of `StageType.ORIGINAL` or else the walls will
 * not render properly. DeadInfinity suspects that this might be because it is trying to use the
 * Dark Room's backdrop (instead of The Chest).
 */
export const CUSTOM_FLOOR_STAGE_TYPE = StageType.WRATH_OF_THE_LAMB;

/**
 * Helper function to warp to a custom stage/level.
 *
 * Custom stages/levels must first be defined in the "tsconfig.json" file. See the documentation for
 * more details: https://isaacscript.github.io/main/custom-stages/
 *
 * @param name The name of the custom stage, corresponding to what is in the "tsconfig.json" file.
 * @param firstFloor Optional. Whether to go to the first floor or the second floor. For example, if
 *                   you have a custom stage emulating Caves, then the first floor would be Caves 1,
 *                   and the second floor would be Caves 2. Default is true.
 * @param verbose Optional. Whether to log additional information about the rooms that are chosen.
 *                Default is false.
 */
export function setCustomStage(
  name: string,
  firstFloor = true,
  verbose = false,
): void {
  const customStage = customStagesMap.get(name);
  if (customStage === undefined) {
    error(
      `Failed to set the custom stage of "${name}" because it was not found in the custom stages map. (Try restarting IsaacScript / recompiling the mod / restarting the game, and try again. If that does not work, you probably forgot to define it in your "tsconfig.json" file.) See the website for more details on how to set up custom stages.`,
    );
  }

  const level = game.GetLevel();
  const stage = level.GetStage();
  const seeds = game.GetSeeds();
  const startSeed = seeds.GetStartSeed();
  const rng = newRNG(startSeed);

  v.run.currentCustomStage = customStage;
  v.run.firstFloor = firstFloor;

  // Before changing the stage, we have to revert the bugged stage, if necessary. This prevents the
  // bug where the backdrop will not spawn.
  if (stage === CUSTOM_FLOOR_STAGE) {
    level.SetStage(LevelStage.BASEMENT_1, StageType.ORIGINAL);
  }

  let baseStage =
    customStage.baseStage === undefined
      ? DEFAULT_BASE_STAGE
      : customStage.baseStage;
  if (!firstFloor) {
    baseStage++;
  }

  const baseStageType =
    customStage.baseStageType === undefined
      ? DEFAULT_BASE_STAGE_TYPE
      : customStage.baseStageType;

  const reseed = asNumber(stage) >= baseStage;

  setStage(baseStage as LevelStage, baseStageType as StageType, reseed);

  setStageRoomsData(customStage, rng, verbose);

  // Set the stage to an invalid value, which will prevent the walls and floors from loading.
  const targetStage = CUSTOM_FLOOR_STAGE;
  const targetStageType = CUSTOM_FLOOR_STAGE_TYPE;
  level.SetStage(targetStage, targetStageType);
  reorderedCallbacksSetStageInternal(targetStage, targetStageType);

  // We must reload the current room in order for the `Level.SetStage` method to take effect.
  // Furthermore, we need to cancel the queued warp to the `GridRoom.DEBUG` room. We can accomplish
  // both of these things by initiating a room transition to an arbitrary room. However, we rely on
  // the parent function to do this, since for normal purposes, we need to initiate a room
  // transition for the pixelation effect.
}

/** Pick a custom room for each vanilla room. */
function setStageRoomsData(
  customStage: CustomStage,
  rng: RNG,
  verbose: boolean,
) {
  const level = game.GetLevel();
  const startingRoomGridIndex = level.GetStartingRoomIndex();

  for (const room of getRoomsInsideGrid()) {
    // The starting floor of each room should stay empty.
    if (room.SafeGridIndex === startingRoomGridIndex) {
      continue;
    }

    if (room.Data === undefined) {
      continue;
    }

    const roomType = room.Data.Type;
    const roomShapeMap = customStage.roomTypeMap.get(roomType);
    if (roomShapeMap === undefined) {
      // Only show errors for non-default room types. (We do not require that end-users provide
      // custom rooms for shops and other special rooms inside of their XML file.)
      if (roomType === RoomType.DEFAULT) {
        logError(
          `Failed to find any custom rooms for RoomType.${RoomType[roomType]} (${roomType}) for custom stage: ${customStage.name}`,
        );
      }
      continue;
    }

    const roomShape = room.Data.Shape;
    const roomDoorSlotFlagMap = roomShapeMap.get(roomShape);
    if (roomDoorSlotFlagMap === undefined) {
      logError(
        `Failed to find any custom rooms for RoomType.${RoomType[roomType]} (${roomType}) + RoomShape.${RoomShape[roomShape]} (${roomShape}) for custom stage: ${customStage.name}`,
      );
      continue;
    }

    const doorSlotFlags = room.Data.Doors;
    const roomsMetadata = roomDoorSlotFlagMap.get(doorSlotFlags);
    if (roomsMetadata === undefined) {
      logError(
        `Failed to find any custom rooms for RoomType.${RoomType[roomType]} (${roomType}) + RoomShape.${RoomShape[roomShape]} (${roomShape}) + DoorSlotFlags ${doorSlotFlags} for custom stage: ${customStage.name}`,
      );

      const header = `For reference, a DoorSlotFlags of ${doorSlotFlags} is equal to the following doors being enabled:\n`;
      const doorSlots = doorSlotFlagsToDoorSlots(doorSlotFlags);
      const doorSlotLines = doorSlots.map(
        (doorSlot) => `- DoorSlot.${DoorSlot[doorSlot]} (${doorSlot})`,
      );
      const explanation = header + doorSlotLines.join("\n");
      logError(explanation);
      continue;
    }

    let randomRoom: CustomStageRoomMetadata;
    if (roomType === RoomType.BOSS) {
      if (customStage.bossPool === undefined) {
        continue;
      }

      randomRoom = getRandomBossRoomFromPool(
        roomsMetadata,
        customStage.bossPool,
        rng,
        verbose,
      );
    } else {
      randomRoom = getRandomCustomStageRoom(roomsMetadata, rng, verbose);
    }

    let newRoomData = customStageCachedRoomData.get(randomRoom.variant);
    if (newRoomData === undefined) {
      // We do not already have the room data for this room cached.
      newRoomData = getRoomDataForTypeVariant(
        roomType,
        randomRoom.variant,
        false,
      );
      if (newRoomData === undefined) {
        logError(
          `Failed to get the room data for room variant ${randomRoom.variant} for custom stage: ${customStage.name}`,
        );
        continue;
      }

      customStageCachedRoomData.set(randomRoom.variant, newRoomData);
    }

    room.Data = newRoomData;
  }
}

/**
 * Helper function to disable the custom stage. This is typically called before taking the player to
 * a vanilla floor.
 */
export function disableCustomStage(): void {
  v.run.currentCustomStage = null;
}
