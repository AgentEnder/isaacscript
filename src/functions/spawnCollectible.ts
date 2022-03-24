import { game } from "../cachedClasses";
import { preventCollectibleRotate } from "../features/preventCollectibleRotate";
import { areFeaturesInitialized } from "../featuresInitialized";
import { isQuestCollectible, setCollectibleEmpty } from "./collectibles";
import { anyPlayerIs } from "./player";
import { newRNG } from "./rng";

/**
 * Helper function to spawn a collectible. Use this instead of the `Game.Spawn` method because it
 * handles the cases of Tainted Keeper collectibles costing coins and preventing quest items from
 * being rotated by Tainted Isaac's rotation mechanic. (Rotation prevention will only occur in
 * upgraded mods.)
 *
 * @param collectibleType The collectible type to spawn.
 * @param position The position to spawn the collectible at.
 * @param rng Optional. Default is `newRNG()`.
 * @param options Optional. Set to true to make the collectible a "There's Options" style
 * collectible. Default is false.
 * @param forceFreeItem Optional. Set to true to disable the logic that gives the item a price for
 * Tainted Keeper. Default is false.
 */
export function spawnCollectible(
  collectibleType: CollectibleType | int,
  position: Vector,
  rng = newRNG(),
  options = false,
  forceFreeItem = false,
): EntityPickup {
  rng.Next();
  const seed = rng.GetSeed();
  const collectible = game
    .Spawn(
      EntityType.ENTITY_PICKUP,
      PickupVariant.PICKUP_COLLECTIBLE,
      position,
      Vector.Zero,
      undefined,
      collectibleType,
      seed,
    )
    .ToPickup();
  if (collectible === undefined) {
    error("Failed to spawn a collectible.");
  }

  if (options) {
    collectible.OptionsPickupIndex = 1;
  }

  if (
    anyPlayerIs(PlayerType.PLAYER_KEEPER_B) &&
    !isQuestCollectible(collectibleType) &&
    !forceFreeItem
  ) {
    // When playing Tainted Keeper, collectibles are supposed to have a price,
    // and manually spawned items will not have a price, so we have to set it manually

    // Setting the shop item ID in this way prevents the bug where the item will sometimes change to
    // 99 cents
    collectible.ShopItemId = -1;

    // We can set the price to any arbitrary value;
    // it will auto-update to the true price on the next frame
    collectible.Price = 15;
  }

  if (isQuestCollectible(collectibleType) && areFeaturesInitialized()) {
    preventCollectibleRotate(collectible, collectibleType);
  }

  return collectible;
}

/**
 * Helper function to spawn an empty collectible. Doing this is tricky since spawning a collectible
 * with `CollectibleType.COLLECTIBLE_NULL` will result in spawning a collectible with a random type
 * from the current room's item pool.
 *
 * Instead, this function arbitrarily spawns a collectible with
 * `CollectibleType.COLLECTIBLE_SAD_ONION`, and then converts it to an empty pedestal afterward.
 */
export function spawnEmptyCollectible(
  position: Vector,
  rng = newRNG(),
): EntityPickup {
  const collectible = spawnCollectible(
    CollectibleType.COLLECTIBLE_SAD_ONION,
    position,
    rng,
    false,
    true,
  );
  setCollectibleEmpty(collectible);

  return collectible;
}
