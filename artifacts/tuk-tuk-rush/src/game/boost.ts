export const BOOST_SECONDS=5;
export const RECHARGE_SECONDS=10;
export const BOOST_ACCELERATION=1.4;
export const BOOST_SPEED_CAP=37; // 19% above 31m/s: useful on arterials, controllable on 12m lanes.
/** Simulation time only. Focus/pause never advances this state. */
export class TurboBoost {
  active=0;recharge=0;
  get state(){return this.active>0?'active':this.recharge>0?'recharging':'ready';}
  trigger(){if(this.state!=='ready')return false;this.active=BOOST_SECONDS;return true;}
  advance(dt:number){
    const boosted=Math.min(dt,this.active);
    if(this.active>0){this.active=Math.max(0,this.active-dt);if(this.active<1e-8){this.active=0;this.recharge=RECHARGE_SECONDS;}}
    const rest=dt-boosted;this.recharge=Math.max(0,this.recharge-rest);if(this.recharge<1e-8)this.recharge=0;
    return boosted;
  }
  reset(){this.active=0;this.recharge=0;}
}
