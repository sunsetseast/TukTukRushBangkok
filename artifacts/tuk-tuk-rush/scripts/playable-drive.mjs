/** Browser controller inputs only after a documented setup pose. */
export async function playableDrive(page, spec, videoEpoch) {
  const setup = await page.evaluate(([name, x, z, gx, gz, time, duration]) => {
    const e = window.__graphics.engine,
      d = e.model.district;
    e.restart();
    e.setQuality("low");
    e.frameTime = -100000;
    delete window.__artCamera;
    const nearest = (x, z) =>
        d.nodes.reduce((a, n) =>
          Math.hypot(n.x - x, n.z - z) < Math.hypot(a.x - x, a.z - z) ? n : a,
        ),
      a =
        name === "first-player" ? nearest(d.spawn.x, d.spawn.z) : nearest(x, z),
      b = nearest(gx, gz),
      queue = [a.id],
      prev = new Map([[a.id, null]]);
    for (const id of queue) {
      if (id === b.id) break;
      for (const r of d.roads) {
        const next = r.a === id ? r.b : !r.oneWay && r.b === id ? r.a : null;
        if (next && !prev.has(next)) {
          prev.set(next, id);
          queue.push(next);
        }
      }
    }
    if (!prev.has(b.id)) throw Error("Disconnected driving route");
    const ids = [];
    let id = b.id;
    while (id) {
      ids.unshift(id);
      id = prev.get(id);
    }
    const route = ids.map((id) => d.nodes.find((n) => n.id === id));
    const first = route[0],
      next = route[1];
    Object.assign(e.model.player, {
      x: name === "first-player" ? d.spawn.x : first.x,
      z: name === "first-player" ? d.spawn.z : first.z,
      heading:
        name === "first-player"
          ? d.spawn.heading
          : Math.atan2(next.x - first.x, next.z - first.z),
      speed: 0,
      steer: 0,
    });
    e.model.snapshot.elapsed = time;
    window.__qaDrive = {
      name,
      route,
      ids,
      index: 1,
      epoch: time,
      duration,
      metres: 0,
      collisionFrames: 0,
      inputEvents: 0,
      samples: [],
      lastSample: 0,
      last: { ...e.model.player },
      done: false,
    };
    return { start: { ...e.model.player }, ids, time, duration };
  }, spec);
  const box = await page.getByTestId("control-steer").boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  const wallStart = Date.now();
  await page.evaluate(
    ({ x, y }) => {
      const drive = window.__qaDrive,
        keys = new Map(),
        stick = document.querySelector('[data-testid="control-steer"]');
      const key = (code, on) => {
        if (keys.get(code) === on) return;
        keys.set(code, on);
        window.dispatchEvent(
          new KeyboardEvent(on ? "keydown" : "keyup", {
            code,
            key: code,
            bubbles: true,
          }),
        );
        drive.inputEvents++;
      };
      const tick = () => {
        const e = window.__graphics.engine,
          p = e.model.player,
          s = e.model.snapshot,
          elapsed = s.elapsed - drive.epoch;
        drive.metres += Math.hypot(p.x - drive.last.x, p.z - drive.last.z);
        drive.last = { ...p };
        if (p.collision > 0.05) drive.collisionFrames++;
        if (elapsed >= drive.duration || s.phase !== "playing") {
          key("ArrowUp", false);
          key("Space", false);
          drive.done = true;
          drive.elapsed = elapsed;
          drive.end = { ...p };
          return;
        }
        const route = drive.route;
        while (drive.index < route.length - 1) {
          const a = route[drive.index - 1],
            b = route[drive.index],
            dx = b.x - a.x,
            dz = b.z - a.z,
            len = Math.hypot(dx, dz),
            progress = ((p.x - a.x) * dx + (p.z - a.z) * dz) / len;
          if (Math.hypot(p.x - b.x, p.z - b.z) < 5 || progress > len)
            drive.index++;
          else break;
        }
        const a = route[drive.index - 1],
          b = route[drive.index],
          dx = b.x - a.x,
          dz = b.z - a.z,
          len = Math.hypot(dx, dz),
          ux = dx / len,
          uz = dz / len,
          edge = e.model.district.roads.find(
            (r) =>
              (r.a === a.id && r.b === b.id) ||
              (!r.oneWay && r.b === a.id && r.a === b.id),
          ),
          progress = Math.max(
            0,
            Math.min(len, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len),
          ),
          t = Math.min(len, progress + 10),
          lane = edge.roundabout ? 0 : Math.min(3, edge.width / 4),
          join = Math.max(0, Math.min(1, t / 5, (len - t) / 5));
        let tx = a.x + ux * t - uz * lane * join,
          tz = a.z + uz * t + ux * lane * join;
        if (len - progress < 8 && drive.index < route.length - 1) {
          const c = route[drive.index + 1],
            n = Math.hypot(c.x - b.x, c.z - b.z);
          tx = b.x + ((c.x - b.x) / n) * 7;
          tz = b.z + ((c.z - b.z) / n) * 7;
        }
        const desired = Math.atan2(tx - p.x, tz - p.z),
          error = Math.atan2(
            Math.sin(desired - p.heading),
            Math.cos(desired - p.heading),
          ),
          steer = Math.max(-0.95, Math.min(0.95, -error * 1.4)),
          v = Math.sign(steer) * (0.08 + Math.abs(steer) * 0.92);
        stick.dispatchEvent(
          new PointerEvent("pointermove", {
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            buttons: 1,
            clientX: x + v * 56,
            clientY: y,
            bubbles: true,
          }),
        );
        drive.inputEvents++;
        const blocked = e.model.traffic.some((c) => {
          const x = c.x - p.x,
            z = c.z - p.z,
            ahead = x * Math.sin(p.heading) + z * Math.cos(p.heading),
            side = x * Math.cos(p.heading) - z * Math.sin(p.heading);
          return ahead > 0 && ahead < 9 && Math.abs(side) < 3.1;
        });
        const speed =
          Math.abs(error) > 0.5 ? 7.5 : Math.abs(error) > 0.25 ? 10 : 13.5;
        key("ArrowUp", !blocked && p.speed < speed);
        key("Space", p.speed > speed + 1 || (blocked && p.speed > 2));
        if (elapsed - drive.lastSample >= 0.5) {
          drive.lastSample = elapsed;
          drive.samples.push({
            elapsed,
            x: p.x,
            z: p.z,
            heading: p.heading,
            speed: p.speed,
            steer,
            inputEvents: drive.inputEvents,
            stats: { ...window.__graphics.stats },
          });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 },
  );
  await page.waitForFunction(() => window.__qaDrive.done, null, {
    timeout: 900000,
  });
  await page.mouse.up();
  const result = await page.evaluate(() => {
    const d = window.__qaDrive;
    return {
      name: d.name,
      start: d.route[0],
      end: d.end,
      metres: d.metres,
      elapsed: d.elapsed,
      collisionFrames: d.collisionFrames,
      inputEvents: d.inputEvents,
      samples: d.samples,
    };
  });
  return {
    ...result,
    setup,
    wallVideoStart: (wallStart - videoEpoch) / 1000,
    wallVideoDuration: (Date.now() - wallStart) / 1000,
    inputs:
      "Browser keyboard throttle/brake + pointer events through steering widget; normal chase camera; no pose edits after setup",
  };
}
