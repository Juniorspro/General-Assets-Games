    /* ============ TEXTURAS, VIENTO Y VEGETACION ============ */
    ctor(name) {
        // los nombres de las clases estan minificados: se sacan de instancias conocidas
        if (!this._ctors) {
            this._ctors = {
                Object3D: Object.getPrototypeOf(eP.prototype).constructor,
                BufferGeometry: Object.getPrototypeOf(k9.prototype).constructor,
                Texture: Object.getPrototypeOf(Ze.prototype).constructor
            };
        }
        return this._ctors[name];
    }
    makeTex(url, opt) {
        if (typeof url !== "string" || !url) return null;
        try {
            let TEX = this.ctor("Texture"), img = new Image();
            let t = new TEX(img);
            img.onload = () => { t.needsUpdate = !0 };
            img.src = url;
            t.wrapS = t.wrapT = 1000;
            if (opt && opt.repeat) t.repeat.set(opt.repeat[0], opt.repeat[1]);
            if (!opt || opt.srgb !== !1) t.colorSpace = "srgb";
            t.anisotropy = 4;
            this.disposers.push(() => t.dispose());
            return t;
        } catch (e) { return null }
    }
    startWind() {
        this.windU = { value: 0 };
        let t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        let step = () => {
            let now = (typeof performance !== "undefined" ? performance.now() : Date.now());
            this.windU.value = (now - t0) / 1000;
            this._windRaf = requestAnimationFrame(step);
        };
        step();
        this.disposers.push(() => { this._windRaf && cancelAnimationFrame(this._windRaf) });
    }
    /* mete el viento en el vertex shader: mode 0 usa la altura del propio vertice
       (pasto, ramas), mode 1 usa la altura de la instancia (hojas colgando alto) */
    windPatch(mat, strength, mode) {
        let self = this;
        mat.onBeforeCompile = sh => {
            sh.uniforms.uWindT = self.windU;
            sh.uniforms.uWindS = { value: strength };
            sh.uniforms.uWindM = { value: mode || 0 };
            sh.vertexShader = "uniform float uWindT;\nuniform float uWindS;\nuniform float uWindM;\n" + sh.vertexShader;
            sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", [
                "#include <begin_vertex>",
                "vec3 cdlvOrg = vec3(0.0);",
                "#ifdef USE_INSTANCING",
                "  cdlvOrg = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);",
                "#endif",
                "float cdlvH = mix(max(transformed.y, 0.0), clamp(cdlvOrg.y / 9.0, 0.0, 1.3), uWindM);",
                "float cdlvPh = cdlvOrg.x * 0.31 + cdlvOrg.z * 0.23;",
                "float cdlvG = sin(uWindT * 0.37 + cdlvPh * 0.5) * 0.5 + 0.5;",
                "float cdlvS = sin(uWindT * 1.7 + cdlvPh) * 0.55 + sin(uWindT * 3.3 + cdlvPh * 1.9) * 0.27 + sin(uWindT * 6.1 + cdlvPh * 2.7) * 0.13;",
                "float cdlvA = uWindS * cdlvH * (0.3 + 0.95 * cdlvG) * cdlvS;",
                "transformed.x += cdlvA;",
                "transformed.z += cdlvA * 0.42;",
                "transformed.y -= abs(cdlvA) * 0.14;"
            ].join("\n"));
        };
        mat.customProgramCacheKey = () => "cdlvwind" + strength + "_" + (mode || 0);
        return mat;
    }
    crossCard(w, h) {
        // dos quads cruzados: se ve bien desde cualquier angulo, sin billboarding
        let BGEO = this.ctor("BufferGeometry"), g = new BGEO;
        let hw = w / 2, pos = [], uv = [], idx = [], nrm = [];
        let quad = (dx, dz) => {
            let b = pos.length / 3;
            pos.push(-hw * dx, 0, -hw * dz, hw * dx, 0, hw * dz, hw * dx, h, hw * dz, -hw * dx, h, -hw * dz);
            uv.push(0, 0, 1, 0, 1, 1, 0, 1);
            for (let i = 0; i < 4; i++) nrm.push(-dz, .35, dx);
            idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        };
        quad(1, 0); quad(0, 1);
        g.setAttribute("position", new YP(new Float32Array(pos), 3));
        g.setAttribute("normal", new YP(new Float32Array(nrm), 3));
        g.setAttribute("uv", new YP(new Float32Array(uv), 2));
        g.setIndex(idx);
        return g;
    }
    buildForest() {
        let { house: A, scene: P } = this.deps, D = this.rng, roadZ = A.bounds.z - 26;
        let root = new eP;
        this.forest = root;
        let barkTex = this.makeTex(typeof CDLV_BARK === "string" ? CDLV_BARK : "", { repeat: [1.6, 3] });
        let leafTex = this.makeTex(typeof CDLV_LEAF === "string" ? CDLV_LEAF : "");
        let trunkMat = new _A({ color: 0x6d5f4c, roughness: 1, map: barkTex });
        let branchMat = new _A({ color: 0x5e5241, roughness: 1, map: barkTex });
        let leafMat = new _A({
            color: 0x8fa77e, roughness: 1, map: leafTex, alphaTest: .42, side: 2,
            emissive: new RA(0x0c150e), emissiveIntensity: 1
        });
        this.windPatch(branchMat, .055, 0);
        this.windPatch(leafMat, .30, 1);
        let trunkGeo = new P9(.16, .44, 1, 6, 1, !1); trunkGeo.translate(0, .5, 0);
        let branchGeo = new P9(.035, .11, 1, 5, 1, !1); branchGeo.translate(0, .5, 0);
        let leafGeo = new k9(1, 1);
        let N = 360, B = 6, L = 16;
        let trunks = new f8(trunkGeo, trunkMat, N),
            branches = new f8(branchGeo, branchMat, N * B),
            leaves = new f8(leafGeo, leafMat, N * L);
        let d = new eP, placed = 0, bi = 0, li = 0, guard = 0;
        while (placed < N && guard < N * 30) {
            guard++;
            let x = D.range(-190, 190), z = roadZ + D.range(-92, 116);
            if (Math.abs(z - roadZ) < 9.5) continue;
            if (x > A.bounds.x - 9 && x < A.bounds.x + A.bounds.w + 9 && z > A.bounds.z - 9 && z < A.bounds.z + A.bounds.d + 9) continue;
            let hgt = D.range(7.5, 15.5), rad = hgt * D.range(.055, .085), yaw = D.range(0, Math.PI * 2);
            d.position.set(x, 0, z); d.rotation.set(0, yaw, 0); d.scale.set(rad, hgt, rad);
            d.updateMatrix(); trunks.setMatrixAt(placed, d.matrix);
            // ramas: salen del tronco hacia afuera y arriba
            for (let k = 0; k < B; k++) {
                let a = yaw + k / B * Math.PI * 2 + D.range(-.4, .4),
                    up = hgt * D.range(.45, .93),
                    len = hgt * D.range(.16, .30),
                    tilt = D.range(.55, 1.15);
                d.position.set(x + Math.cos(a) * rad * .5, up, z + Math.sin(a) * rad * .5);
                d.rotation.set(Math.cos(a) * tilt, -a, -Math.sin(a) * tilt);
                d.scale.set(len * .32, len, len * .32);
                d.updateMatrix(); branches.setMatrixAt(bi++, d.matrix);
            }
            // hojas: cartas alrededor de la copa
            for (let k = 0; k < L; k++) {
                let a = D.range(0, Math.PI * 2),
                    r = hgt * D.range(.08, .34),
                    up = hgt * D.range(.55, 1.02),
                    s = hgt * D.range(.22, .42);
                d.position.set(x + Math.cos(a) * r, up, z + Math.sin(a) * r);
                d.rotation.set(D.range(-.5, .5), a + Math.PI / 2, D.range(-.5, .5));
                d.scale.set(s, s, s);
                d.updateMatrix(); leaves.setMatrixAt(li++, d.matrix);
            }
            placed++;
        }
        trunks.count = placed; branches.count = bi; leaves.count = li;
        for (let m of [trunks, branches, leaves]) { m.instanceMatrix.needsUpdate = !0; m.frustumCulled = !1; root.add(m) }
        // neblina: planos anchos y lejos del corredor de la carretera
        let fogMat = new f9({ color: 0xa9bccd, transparent: !0, opacity: .05, depthWrite: !1 });
        for (let k = 0; k < 14; k++) {
            let m = new fA(new k9(D.range(70, 130), D.range(9, 20)), fogMat);
            m.position.set(D.range(-150, 150), D.range(1.2, 5.4), roadZ + (D.chance(.5) ? 1 : -1) * D.range(30, 86));
            m.rotation.y = D.range(-.35, .35);
            m.renderOrder = 3;
            root.add(m);
            this.fogSheets.push({ mesh: m, speed: D.range(.1, .45), phase: D.range(0, 6.283) });
        }
        P.add(root);
        this.disposers.push(() => {
            [trunkGeo, branchGeo, leafGeo].forEach(g => g.dispose());
            [trunkMat, branchMat, leafMat, fogMat].forEach(m => m.dispose());
            P.remove(root);
        });
    }
    buildSky() {
        let tex = this.makeTex(typeof CDLV_SKY === "string" ? CDLV_SKY : "");
        if (!tex) return;
        let mat = new f9({ map: tex, side: 1, fog: !1, depthWrite: !1 });
        let dome = new fA(new R9(300, 40, 24), mat);
        dome.renderOrder = -1; dome.frustumCulled = !1; dome.visible = !1;
        this.sky = dome;
        this.deps.scene.add(dome);
        this.disposers.push(() => { dome.geometry.dispose(); mat.dispose(); this.deps.scene.remove(dome) });
    }
    driftFog(dt) {
        for (let f of this.fogSheets) {
            f.mesh.position.x += f.speed * dt;
            f.mesh.position.y += Math.sin(this.elapsed * .25 + f.phase) * dt * .12;
            if (f.mesh.position.x > 175) f.mesh.position.x = -175;
        }
        if (this.sky && this.sky.visible) {
            this.sky.position.copy(this.deps.camera.position);
            this.sky.rotation.y += dt * .004;
        }
    }
    /* debug: window.__CDLV_DBG dice en que escena va, y window.__CDLV_JUMP = n
       salta a la escena n (0 auto pasando, 4 carretera, 8 entra a la casa,
       9 el batazo, 10 despierta encerrado) */
    dbg() {
        try {
            if (typeof window === "undefined") return;
            if (window.__CDLV_JUMP != null) {
                let j = Math.max(0, Math.min(this.shots.length - 1, window.__CDLV_JUMP | 0));
                window.__CDLV_JUMP = null;
                this.shots[this.index] && this.shots[this.index].exit && this.shots[this.index].exit();
                this.index = j; this.shotTime = 0;
                this.shots[j] && this.shots[j].enter && this.shots[j].enter();
            }
            let sh = this.shots[this.index];
            window.__CDLV_DBG = {
                idx: this.index, id: sh && sh.id, t: +this.shotTime.toFixed(2), dur: sh && sh.duration,
                fov: +this.deps.camera.fov.toFixed(1),
                body: !!this.car.body, glass: !!this.car.glass,
                pov: !!(this.povRig && this.povRig.root.visible),
                phone: !!(this.phoneHolder && this.phoneHolder.visible),
                lady: !!(this.oldLady && this.oldLady.root.visible),
                grass: !!(this.grass && this.grass.visible), sky: !!(this.sky && this.sky.visible),
                split: !!(this.split && this.split.on), wind: this.windU ? +this.windU.value.toFixed(1) : null
            };
        } catch (e) { }
    }
    buildGrass() {
        let D = this.rng, roadZ = this.deps.house.bounds.z - 26;
        let tex = this.makeTex(typeof CDLV_GRASS === "string" ? CDLV_GRASS : "");
        let geo = this.crossCard(1, 1);
        let mat = new _A({
            color: 0x8a9a6a, roughness: 1, map: tex, alphaTest: .36, side: 2,
            emissive: new RA(0x0d1208), emissiveIntensity: 1
        });
        this.windPatch(mat, .16, 0);
        let N = 340, mesh = new f8(geo, mat, N), d = new eP;
        for (let i = 0; i < N; i++) {
            let a = D.range(0, Math.PI * 2), r = Math.sqrt(D.range(0, 1)) * 3.8;
            let s = D.range(.16, .34);
            d.position.set(2.1 + Math.cos(a) * r, -.02, roadZ + 3.4 + Math.sin(a) * r * .8);
            d.rotation.set(0, D.range(0, Math.PI), 0);
            d.scale.set(s * D.range(.85, 1.25), s, s);
            d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
        }
        mesh.instanceMatrix.needsUpdate = !0; mesh.frustumCulled = !1; mesh.visible = !1;
        this.grass = mesh;
        this.deps.scene.add(mesh);
        this.disposers.push(() => { geo.dispose(); mat.dispose(); this.deps.scene.remove(mesh) });
    }
    swayGrass() { /* ahora lo hace el shader de viento */ }
    buildDust() {
        let N = 260, geo = new R9(.5, 6, 4);
        let mat = new f9({ color: 0x7f7360, transparent: !0, opacity: .3, depthWrite: !1 });
        let mesh = new f8(geo, mat, N), dummy = new eP;
        mesh.frustumCulled = !1; mesh.visible = !1;
        let parts = [];
        for (let i = 0; i < N; i++) {
            parts.push({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, r: 1 });
            dummy.position.set(0, -999, 0); dummy.scale.setScalar(.0001); dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = !0;
        this.dust = { mesh, geo, mat, n: N, parts, head: 0, dummy };
        this.deps.scene.add(mesh);
        this.disposers.push(() => { geo.dispose(); mat.dispose(); this.deps.scene.remove(mesh) });
    }
    emitDust(x, y, z, n, spread) {
        if (!this.dust) return;
        let d = this.dust, R = this.rng;
        for (let k = 0; k < n; k++) {
            let p = d.parts[d.head]; d.head = (d.head + 1) % d.n;
            p.x = x + R.range(-spread, spread); p.y = y + R.range(0, .3); p.z = z + R.range(-spread, spread);
            p.vx = R.range(-4.5, -.6); p.vy = R.range(.4, 1.7); p.vz = R.range(-1.3, 1.3);
            p.max = R.range(.9, 2.2); p.life = p.max; p.r = R.range(.35, .95);
        }
    }
    updateDust(dt) {
        let d = this.dust; if (!d || !d.mesh.visible) return;
        let dummy = d.dummy, any = !1;
        for (let i = 0; i < d.n; i++) {
            let p = d.parts[i];
            if (p.life <= 0) continue;
            p.life -= dt; any = !0;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.vx *= 1 - dt * 1.15; p.vy = p.vy * (1 - dt * .9) + dt * .1; p.vz *= 1 - dt * 1.15;
            let k = HA(p.life / p.max, 0, 1);
            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.setScalar(p.life > 0 ? p.r * (1.6 - k * .9) : .0001);
            dummy.updateMatrix();
            d.mesh.setMatrixAt(i, dummy.matrix);
            if (p.life <= 0) { dummy.scale.setScalar(.0001); dummy.updateMatrix(); d.mesh.setMatrixAt(i, dummy.matrix) }
        }
        if (any) d.mesh.instanceMatrix.needsUpdate = !0;
    }
    /* ============ COCHE: CARROCERIA, CRISTAL Y RUEDAS ============ */
    fitModel(root, targetLen, axisOrder, yaw) {
        let box = new fP().setFromObject(root), size = box.getSize(new Y), ctr = box.getCenter(new Y);
        let dims = [{ a: "x", v: size.x }, { a: "y", v: size.y }, { a: "z", v: size.z }].sort((p, q) => q.v - p.v);
        let wrap = new eP, inner = new eP;
        inner.add(root); wrap.add(inner);
        root.position.set(-ctr.x, -ctr.y, -ctr.z);
        if (axisOrder === "length-z" && dims[0].a !== "z") inner.rotation.y = dims[0].a === "x" ? Math.PI / 2 : 0, dims[0].a === "y" && (inner.rotation.z = Math.PI / 2);
        if (axisOrder === "axle-x") {
            if (dims[2].a === "z") inner.rotation.y = Math.PI / 2;
            else if (dims[2].a === "y") inner.rotation.z = Math.PI / 2;
        }
        if (yaw) inner.rotation.y += yaw;
        wrap.scale.setScalar(targetLen / Math.max(dims[0].v, 1e-4));
        return wrap;
    }
    /* el parabrisas viene pegado a la carroceria en una sola malla: se separan sus
       triangulos por posicion y normal (medidas con raycast dentro de la cabina) */
    splitGlass(mesh) {
        let car = this.car.group, geo = mesh.geometry;
        if (!geo || !geo.index || !geo.attributes.position) return null;
        car.updateMatrixWorld(!0); mesh.updateWorldMatrix(!0, !1);
        let m = car.matrixWorld.clone().invert().multiply(mesh.matrixWorld);
        let pos = geo.attributes.position, arr = geo.index.array;
        let a = new Y, b = new Y, c = new Y, ab = new Y, cb = new Y, n = new Y;
        let body = [], glass = [];
        for (let t = 0; t < arr.length; t += 3) {
            let i0 = arr[t], i1 = arr[t + 1], i2 = arr[t + 2];
            a.fromBufferAttribute(pos, i0).applyMatrix4(m);
            b.fromBufferAttribute(pos, i1).applyMatrix4(m);
            c.fromBufferAttribute(pos, i2).applyMatrix4(m);
            let cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
            let ok = cy > 1.3 && cz > .16 && cz < 1.06;
            if (ok) {
                ab.subVectors(a, b); cb.subVectors(c, b); n.crossVectors(cb, ab).normalize();
                ok = Math.abs(n.y) > .66;
            }
            if (ok) glass.push(i0, i1, i2); else body.push(i0, i1, i2);
        }
        if (!glass.length) return null;
        let glassGeo = geo.clone();
        glassGeo.setIndex(glass);
        geo.setIndex(body);
        let glassMat = new _A({
            color: 0x9db4c6, roughness: .05, metalness: .1, transparent: !0, opacity: .16,
            side: 2, depthWrite: !1
        });
        let gm = new fA(glassGeo, glassMat);
        gm.renderOrder = 2;
        mesh.parent.add(gm);
        this.disposers.push(() => { glassGeo.dispose(); glassMat.dispose() });
        return gm;
    }
    loadCarModel() {
        if (typeof CDLV_CAR_BODY !== "string" || !CDLV_CAR_BODY) return;
        new w8().load(CDLV_CAR_BODY, gltf => {
            let body = this.fitModel(gltf.scene, 5.35, "length-z", Math.PI), mesh = null;
            body.traverse(o => { if (o.isMesh) { o.castShadow = !0; o.receiveShadow = !0; mesh = o } });
            let box = new fP().setFromObject(body), size = box.getSize(new Y);
            body.position.y = .34 - box.min.y;
            this.car.group.add(body);
            this.car.body = body;
            this.car.proc.visible = !1;
            this.car.halfWidth = size.x / 2;
            this.car.len = size.z;
            if (mesh) this.car.glass = this.splitGlass(mesh);
            this.loadWheels();
        }, void 0, () => { });
    }
    loadWheels() {
        if (typeof CDLV_CAR_WHEEL !== "string" || !CDLV_CAR_WHEEL) return;
        new w8().load(CDLV_CAR_WHEEL, gltf => {
            let proto = this.fitModel(gltf.scene, .78, "axle-x");
            proto.traverse(o => { if (o.isMesh) o.castShadow = !0 });
            let hw = (this.car.halfWidth ?? .95) - .04, len = this.car.len ?? 5.35, out = [];
            let spots = [[-hw, len * .295], [hw, len * .295], [-hw, -len * .295], [hw, -len * .295]];
            for (let i = 0; i < 4; i++) {
                let hub = new eP, m = i === 0 ? proto : proto.clone(!0);
                if (spots[i][0] > 0) m.rotation.y += Math.PI;
                hub.add(m);
                hub.position.set(spots[i][0], .39, spots[i][1]);
                this.car.group.add(hub);
                out.push(hub);
            }
            for (let w of this.car.wheels) w.visible = !1;
            this.car.wheels = out;
        }, void 0, () => { });
    }
    /* ============ PERSONAJE SENTADO (el mismo GLB del juego) ============ */
    buildRigs() {
        if (typeof Ho !== "string" || !Ho) return;
        let load = isPov => new w8().load(Ho, gltf => {
            let root = gltf.scene;
            let box = new fP().setFromObject(root), size = box.getSize(new Y);
            root.scale.setScalar(1.75 / Math.max(size.y, .001));
            let holder = new eP;
            holder.add(root);
            holder.position.set(.45, -.13, -.11);
            holder.rotation.y = -Math.PI / 2;
            holder.visible = !1;
            let bones = {};
            root.traverse(o => {
                if (o.isBone) bones[o.name] = o;
                if (o.isMesh) { o.castShadow = !isPov; o.receiveShadow = !1; o.frustumCulled = !1 }
            });
            this.car.group.add(holder);
            let rig = { root: holder, bones, isPov };
            if (isPov) {
                bones.Head && bones.Head.scale.setScalar(.001);
                this.povRig = rig;
                this.loadPhone();
            } else this.driverRig = rig;
            this.seatPose(rig, 0, 0);
            this.disposers.push(() => this.car.group.remove(holder));
        }, void 0, () => { });
        load(!0); load(!1);
    }
    /* k = 0 manos al volante, 1 celular arriba; reach = mano yendo al bolsillo */
    seatPose(rig, k, reach) {
        if (!rig) return;
        let b = rig.bones, set = (n, x, y, z) => { b[n] && b[n].rotation.set(x, y, z) };
        set("R_Thigh", -1.45, 0, -.12); set("L_Thigh", -1.45, 0, .12);
        set("R_Calf", -1.25, 0, 0); set("L_Calf", -1.25, 0, 0);
        set("Spine01", -.12, 0, 0);
        set("L_Upperarm", 0, 1.6, 1.6); set("L_Forearm", 0, 0, 0);
        // brazo derecho: volante -> bolsillo -> celular a la altura de los ojos
        let uy = HP(-1.6, HP(-2.2, -1.1, k), reach),
            uz = HP(-1.6, -1.8, reach),
            fx = HP(0, HP(.8, .2, k), reach);
        set("R_Upperarm", 0, uy, uz);
        set("R_Forearm", fx, 0, 0);
    }
    loadPhone() {
        if (typeof CDLV_PHONE !== "string" || !CDLV_PHONE || !this.povRig) return;
        let hand = this.povRig.bones.R_Hand;
        if (!hand) return;
        new w8().load(CDLV_PHONE, gltf => {
            let ph = this.fitModel(gltf.scene, .152, "length-z");
            let holder = new eP;
            holder.add(ph);
            holder.position.set(.03, .025, .05);   // dentro del puño, no apoyado en la palma
            holder.rotation.set(Math.PI, 0, 0);   // la cara con la pantalla mira a los ojos
            holder.visible = !1;
            let light = new GD(0x9fd4ff, .45, 1.4, 2);
            light.position.set(0, .05, 0); holder.add(light);
            hand.add(holder);
            // el hueso viene escalado: se mide despues de colgarlo para que el celular mida lo suyo
            hand.updateWorldMatrix(!0, !1);
            let ws = holder.getWorldScale(new Y);
            holder.scale.setScalar(1 / Math.max(ws.x, 1e-4));
            this.phoneHolder = holder; this.phoneLight = light;
            this.disposers.push(() => hand.remove(holder));
        }, void 0, () => { });
    }
    /* zoom = 0 primera persona pura; 1 se corre un poco al costado del hombro
       para que el brazo levantado no tape el celular */
    /* la puerta de entrada es un grupo con pivote en la bisagra y la hoja como
       hijo: se lo busca por posicion, midiendo que el hijo tenga tamaño de puerta */
    findFrontDoor() {
        let H = this.deps.house, tx = H.exitDoor.x, tz = H.bounds.z;
        let best = null, bd = 1e9, wp = new Y, box = new fP, size = new Y;
        this.deps.scene.traverse(o => {
            if (!o.children || !o.children.length || o.isMesh) return;
            let leaf = o.children.find(c => c.isMesh && c.geometry);
            if (!leaf) return;
            o.getWorldPosition(wp);
            if (Math.abs(wp.y) > 1.4) return;
            let d = Math.hypot(wp.x - tx, wp.z - tz);
            if (d > 1.7 || d >= bd) return;
            leaf.geometry.computeBoundingBox();
            leaf.geometry.boundingBox.getSize(size);
            if (size.y < 1.8 || size.y > 2.8) return;      // alto de puerta
            bd = d; best = o;
        });
        if (best) this.frontDoor = { pivot: best, rest: best.rotation.y, dist: bd };
        return this.frontDoor;
    }
    swingDoor(k) {
        let d = this.frontDoor; if (!d) return;
        d.pivot.rotation.y = d.rest + aD(HA(k, 0, 1)) * -1.45;
    }
    loadOldLady() {
        if (typeof CDLV_OLD_LADY !== "string" || !CDLV_OLD_LADY) return;
        new w8().load(CDLV_OLD_LADY, gltf => {
            let rig = _T(gltf, { height: 1.62 });
            rig.bones = {};
            rig.model.traverse(o => { if (o.isBone) rig.bones[o.name] = o });
            rig.root.visible = !1;
            this.deps.scene.add(rig.root);
            this.oldLady = rig;
            // luz propia del golpe: la linterna apunta a donde mira la camara y en
            // el momento del batazo la camara ya no la esta mirando
            let hl = new GD(0xc3d4ea, 0, 5.5, 2);
            hl.visible = !1;
            this.deps.scene.add(hl);
            this.hitLight = hl;
            this.disposers.push(() => { rig.dispose(); this.deps.scene.remove(rig.root); this.deps.scene.remove(hl) });
        }, void 0, () => { });
    }
    /* el rig vino con walk/idle/jump nomas, asi que el batazo va a mano sobre los
       huesos, despues del mixer: t=0 bate abajo, .38 arriba del todo, .7 impacto */
    ladySwing(t) {
        let L = this.oldLady; if (!L || !L.bones) return;
        let b = L.bones, k = HA(t, 0, 1);
        let up = k < .38 ? HP(-1, -.15, aD(k / .38)) : HP(-.15, -2.45, aD(HA((k - .38) / .32, 0, 1)));
        let tw = k < .38 ? HP(.08, .4, k / .38) : HP(.4, -.34, aD(HA((k - .38) / .32, 0, 1)));
        b.R_Upperarm && b.R_Upperarm.rotation.set(0, 0, up);
        b.R_Forearm && b.R_Forearm.rotation.set(0, 0, HP(-.62, -.05, HA(k / .7, 0, 1)));
        b.L_Upperarm && b.L_Upperarm.rotation.set(0, 0, -up * .5);
        b.Spine01 && b.Spine01.rotation.set(0, tw, 0);
        b.Spine02 && b.Spine02.rotation.set(HP(-.05, .18, HA(k, 0, 1)), tw * .5, 0);
    }
    povHead(camera, sway, zoom) {
        let car = this.car.group, z = HA(zoom || 0, 0, 1);
        car.updateMatrixWorld(!0);
        this._v1.set(HP(.45, .60, z), HP(1.35, 1.42, z), HP(.02, -.06, z));
        car.localToWorld(this._v1);
        this._v2.set(.45, 1.10, 14); car.localToWorld(this._v2);
        camera.position.copy(this._v1);
        camera.position.y += Math.sin(this.elapsed * 8.3) * .006 * sway;
        camera.position.x += Math.sin(this.elapsed * 5.1) * .008 * sway;
        camera.lookAt(this._v2);
        camera.rotateZ(Math.sin(this.elapsed * 1.4) * .012 * sway);
    }
    /* ============ PANTALLA PARTIDA CON LA OFICINA ============ */
    buildSplit() {
        let host = document.getElementById("app") || document.body;
        let wrap = document.createElement("div");
        wrap.id = "cdlv-split";
        wrap.style.cssText = "position:absolute;inset:0;z-index:26;pointer-events:none;display:none;overflow:hidden";
        let off = document.createElement("div");
        off.style.cssText = "position:absolute;top:0;right:0;width:50.4%;height:100%;background-color:#04060a;background-position:center;background-size:cover;background-repeat:no-repeat;transform:translateX(100%);filter:contrast(1.06) brightness(.92)";
        if (typeof CDLV_OFFICE === "string" && CDLV_OFFICE) off.style.backgroundImage = "url(" + CDLV_OFFICE + ")";
        let line = document.createElement("div");
        line.style.cssText = "position:absolute;left:50%;top:50%;width:3px;height:0;background:#fff;box-shadow:0 0 26px 7px rgba(255,255,255,.6);transform:translate(-50%,-50%)";
        wrap.appendChild(off); wrap.appendChild(line);
        host.appendChild(wrap);
        this.split = { wrap, off, line, view: document.getElementById("view"), sub: document.getElementById("subtitle"), on: !1 };
    }
    splitShow(lineP, panelP) {
        let s = this.split; if (!s) return;
        if (!s.on) { s.wrap.style.display = "block"; s.on = !0 }
        s.line.style.height = (HA(lineP, 0, 1) * 100) + "%";
        s.line.style.opacity = String(HA(lineP * 2, 0, 1));
        s.off.style.transform = "translateX(" + ((1 - HA(panelP, 0, 1)) * 100).toFixed(2) + "%)";
        if (s.view) s.view.style.transform = "translateX(" + (-HA(panelP, 0, 1) * 24).toFixed(2) + "%)";
        if (s.sub) { s.sub.style.right = (HA(panelP, 0, 1) * 50).toFixed(1) + "%"; s.sub.style.padding = "0 3vw" }
    }
    splitHide() {
        let s = this.split; if (!s) return;
        s.on = !1; s.wrap.style.display = "none";
        s.off.style.transform = "translateX(100%)";
        s.line.style.height = "0";
        if (s.view) s.view.style.transform = "";
        if (s.sub) { s.sub.style.right = ""; s.sub.style.padding = "" }
    }
    ringPhone() {
        if (typeof jA === "undefined" || !jA) return;
        let t = j9(), out = jA.createGain();
        out.gain.value = 0; out.connect(NP);
        for (let burst = 0; burst < 2; burst++) {
            let b = t + burst * .9;
            out.gain.setValueAtTime(0, b);
            out.gain.linearRampToValueAtTime(.16, b + .02);
            out.gain.setValueAtTime(.16, b + .38);
            out.gain.linearRampToValueAtTime(0, b + .44);
        }
        for (let f of [1180, 1480]) {
            let o = jA.createOscillator();
            o.type = "square"; o.frequency.value = f;
            let g = jA.createGain(); g.gain.value = .5;
            o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5);
        }
        let trem = jA.createOscillator(), tg = jA.createGain();
        trem.type = "square"; trem.frequency.value = 22; tg.gain.value = .35;
        trem.connect(tg); tg.connect(out.gain); trem.start(t); trem.stop(t + 1.5);
    }
    playVo(which) {
        try {
            let src = (CDLV_VO[CDLV_LANG] || CDLV_VO.es)[which];
            if (!src) return;
            this.stopVo();
            let a = new Audio(src);
            a.volume = .96;
            a.play().catch(() => { });
            this.vo = a;
        } catch (e) { }
    }
    stopVo() {
        if (this.vo) { try { this.vo.pause() } catch (e) { } this.vo = null }
    }
