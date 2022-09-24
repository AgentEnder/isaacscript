import { IsaacScriptCommonFeature } from "../../enums/IsaacScriptCommonFeature";
import { ModCallbackCustom2 } from "../../enums/ModCallbackCustom2";
import { CustomCallback } from "../private/CustomCallback";

export class PostNewRoomReordered extends CustomCallback<ModCallbackCustom2.POST_NEW_ROOM_REORDERED> {
  constructor() {
    super();

    this.featuresUsed = [IsaacScriptCommonFeature.GAME_REORDERED_CALLBACKS];
  }
}