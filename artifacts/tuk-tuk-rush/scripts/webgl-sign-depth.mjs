/** Actual production meshes, current LOD, traffic and chase/inspection camera.
 * Read depth without changing the evidence frame or making signs see-through. */
export async function inspectSignDepth(page) {
  return page.evaluate(() => {
    const { three: T, scene, camera, gl } = window.__graphics,
      faces = [];
    scene.traverse((o) => {
      if (o.userData.signFaces) faces.push(...o.userData.signFaces);
    });
    const size = gl.getDrawingBufferSize(new T.Vector2());
    const cache = (window.__signDepthCache ??= {
      material: new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }),
      target: undefined,
    });
    const target = (cache.target ??= new T.WebGLRenderTarget(size.x, size.y, {
      type: T.UnsignedByteType,
      minFilter: T.NearestFilter,
      magFilter: T.NearestFilter,
    }));
    target.setSize(size.x, size.y);
    const depth = cache.material;
    const oldOverride = scene.overrideMaterial,
      oldTarget = gl.getRenderTarget(),
      oldBackground = scene.background;
    const pixels = new Uint8Array(size.x * size.y * 4),
      records = [];
    try {
      scene.overrideMaterial = depth;
      scene.background = new T.Color(1, 1, 1);
      gl.setRenderTarget(target);
      gl.clear();
      gl.render(scene, camera);
      gl.readRenderTargetPixels(target, 0, 0, size.x, size.y, pixels);
      const linear = (z) =>
        (2 * camera.near * camera.far) /
        (camera.far + camera.near - (z * 2 - 1) * (camera.far - camera.near));
      for (const f of faces) {
        const center = new T.Vector3(...f.position),
          normal = new T.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
        const view = camera.position.clone().sub(center),
          dist = view.length();
        if (dist > 65 || normal.dot(view.normalize()) < 0.28) continue;
        const top = center
            .clone()
            .add(new T.Vector3(0, f.height / 2, 0))
            .project(camera),
          bottom = center
            .clone()
            .add(new T.Vector3(0, -f.height / 2, 0))
            .project(camera),
          pxHeight = (Math.abs(top.y - bottom.y) * size.y) / 2;
        if (pxHeight < 8) continue;
        const tangent = new T.Vector3(Math.cos(f.yaw), 0, -Math.sin(f.yaw));
        let total = 0,
          blocked = 0;
        const errors = [];
        for (let ix = 0; ix < 9; ix++)
          for (let iy = 0; iy < 5; iy++) {
            const p = center
              .clone()
              .addScaledVector(tangent, (ix / 8 - 0.5) * f.width * 0.86);
            p.y += (iy / 4 - 0.5) * f.height * 0.82;
            p.project(camera);
            if (
              Math.abs(p.x) > 0.98 ||
              Math.abs(p.y) > 0.98 ||
              p.z < -1 ||
              p.z > 1
            )
              continue;
            const x = Math.floor((p.x * 0.5 + 0.5) * size.x),
              y = Math.floor((p.y * 0.5 + 0.5) * size.y),
              i = (y * size.x + x) * 4;
            // Three r186 packing.glsl UnpackFactors4: red is MOST significant.
            const actual =
              pixels[i] / 256 +
              pixels[i + 1] / 65536 +
              pixels[i + 2] / 16777216 +
              pixels[i + 3] / (255 * 16777216);
            const delta = linear(p.z * 0.5 + 0.5) - linear(actual);
            total++;
            if (delta > 0.08) blocked++;
            errors.push(Math.round(delta * 1000) / 1000);
          }
        if (total >= 25)
          records.push({
            ...f,
            distance: dist,
            pixelHeight: pxHeight,
            total,
            blocked,
            occludedFraction: blocked / total,
            depthDeltas: errors,
          });
      }
    } finally {
      gl.setRenderTarget(oldTarget);
      scene.overrideMaterial = oldOverride;
      scene.background = oldBackground;
      // Reuse audit-only resources between fixtures; caller disposes at teardown.
    }
    return {
      method:
        "Packed RGBA depth from actual production WebGL meshes, 45 lettering samples. Front-facing signs <=65m, >=8px tall and >=25 on-screen samples; 8cm depth tolerance. Poles, traffic and neighboring architecture remain present.",
      population: faces.length,
      faces: records.length,
      obscured: records.filter((r) => r.occludedFraction > 0.1).length,
      records,
    };
  });
}
