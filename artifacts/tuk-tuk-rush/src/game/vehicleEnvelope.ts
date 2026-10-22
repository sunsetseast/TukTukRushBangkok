/** Existing controller dimensions/rates, shared with offline placement checks.
 * These values describe the current handling; they do not retune the tuk-tuk. */
export const VEHICLE_COLLISION_RADIUS = 1.5;
export const STEERING_RESPONSE = 11;
export const steeringYawRate = (speed: number) =>
  1.7 - Math.min(Math.abs(speed) / 45, 0.55);
export const MANEUVER_SPEED = 5;
export const LOW_SPEED_TURN_RADIUS =
  MANEUVER_SPEED / steeringYawRate(MANEUVER_SPEED);
// A reversing heading transition sweeps two turning radii sideways. Include
// the collider and one unit for steering response/lateral momentum, not a
// citywide road widening or a reduction in the physical vehicle footprint.
export const ARRIVAL_MANEUVER_RADIUS =
  2 * LOW_SPEED_TURN_RADIUS + VEHICLE_COLLISION_RADIUS + 1;
