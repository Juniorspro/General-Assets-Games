    /* ==================== BOSQUE / NEBLINA / POV ==================== */
    buildForest() {
        let { house: A, scene: P } = this.deps, D = this.rng, roadZ = A.bounds.z - 26;
        let root = new eP;
        this.forest = root;
        let trunkMat = new _A({ color: 0x3d3021, roughness: 1, emissive: new RA(0x0a0806), emissiveIntensity: 1 }),
            leafHi = new _A({ color: 0x2b4632, roughness: 1, emissive: new RA(0x0a140e), emissiveIntensity: 1 }),
            leafLo = new _A({ color: 0x1d3524, roughness: 1, emissive: new RA(0x07100b), emissiveIntensity: 1 });
        let trunkGeo = new P9(.17, .36, 7.4, 5); trunkGeo.translate(0, 3.7, 0);
        let topGeo = new P9(0, 2.25, 5.6, 7); topGeo.translate(0, 8.6, 0);
        let midGeo = new P9(0, 3.05, 4.8, 7); midGeo.translate(0, 5.7, 0);
        let N = 900,
            trunks = new f8(trunkGeo, trunkMat, N),
            tops = new f8(topGeo, leafHi, N),
            mids = new f8(midGeo, leafLo, N),
            dummy = new eP, placed = 0, guard = 0;
        while (placed < N && guard < N * 30) {
            guard++;
            let x = D.range(-190, 190), z = roadZ + D.range(-92, 116);
            if (Math.abs(z - roadZ) < 9.5) continue;
            if (x > A.bounds.x - 9 && x < A.bounds.x + A.bounds.w + 9 && z > A.bounds.z - 9 && z < A.bounds.z + A.bounds.d + 9) continue;
            let s = D.range(.72, 1.85);
            dummy.position.set(x, 0, z);
            dummy.rotation.set(D.range(-.05, .05), D.range(0, Math.PI * 2), D.range(-.05, .05));
            dummy.scale.set(s * D.range(.82, 1.2), s, s * D.range(.82, 1.2));
            dummy.updateMatrix();
            trunks.setMatrixAt(placed, dummy.matrix);
            tops.setMatrixAt(placed, dummy.matrix);
            mids.setMatrixAt(placed, dummy.matrix);
            placed++;
        }
        trunks.count = tops.count = mids.count = placed;
        for (let m of [trunks, tops, mids]) { m.instanceMatrix.needsUpdate = !0; m.frustumCulled = !1; root.add(m) }
        let fogMat = new f9({ color: 0xa9bccd, transparent: !0, opacity: .05, depthWrite: !1 });
        for (let k = 0; k < 14; k++) {
            let m = new fA(new k9(D.range(70, 130), D.range(9, 20)), fogMat);
            let far = (D.chance(.5) ? 1 : -1) * D.range(30, 86);
            m.position.set(D.range(-150, 150), D.range(1.2, 5.4), roadZ + far);
            m.rotation.y = D.range(-.35, .35);
            m.renderOrder = 3;
            root.add(m);
            this.fogSheets.push({ mesh: m, speed: D.range(.1, .45), phase: D.range(0, 6.283) });
        }
        P.add(root);
        this.disposers.push(() => {
            root.traverse(o => o.isMesh && o.geometry.dispose());
            [trunkMat, leafHi, leafLo, fogMat].forEach(m => m.dispose());
        });
    }
    driftFog(dt) {
        try {
            let sh = this.shots[this.index];
            window.__CDLV_DBG = {
                idx: this.index, id: sh && sh.id, t: +this.shotTime.toFixed(2), dur: sh && sh.duration,
                carX: +this.car.group.position.x.toFixed(1), fov: +this.deps.camera.fov.toFixed(1),
                amb: this.deps.ambient.intensity, moon: this.deps.moon.intensity,
                body: !!this.car.body, wheels: this.car.wheels.length,
                pov: !!(this.pov && this.pov.group.visible), phone: !!(this.pov && this.pov.phoneHolder && this.pov.phoneHolder.visible),
                grass: !!(this.grass && this.grass.visible), split: !!(this.split && this.split.on)
            };
        } catch (e) { window.__CDLV_DBG = { err: String(e) } }
        for (let f of this.fogSheets) {
            f.mesh.position.x += f.speed * dt;
            f.mesh.position.y += Math.sin(this.elapsed * .25 + f.phase) * dt * .12;
            if (f.mesh.position.x > 175) f.mesh.position.x = -175;
        }
    }
    buildGrass() {
        let D = this.rng, roadZ = this.deps.house.bounds.z - 26;
        let blade = new P9(0, .022, .26, 3); blade.translate(0, .13, 0);
        let mat = new _A({ color: 0x46512f, roughness: 1, emissive: new RA(0x090d06), emissiveIntensity: 1 });
        let N = 320, mesh = new f8(blade, mat, N), dummy = new eP;
        this.grassBlades = [];
        for (let i = 0; i < N; i++) {
            let a = D.range(0, Math.PI * 2), r = Math.sqrt(D.range(0, 1)) * 2.0;
            let b = {
                x: 2.1 + Math.cos(a) * r, z: roadZ + 4.35 + Math.sin(a) * r * .8,
                y: 0, rot: D.range(0, Math.PI), s: D.range(.5, 1.15), ph: D.range(0, 6.283)
            };
            this.grassBlades.push(b);
            dummy.position.set(b.x, 0, b.z); dummy.rotation.set(0, b.rot, 0);
            dummy.scale.set(1, b.s, 1); dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = !0; mesh.frustumCulled = !1; mesh.visible = !1;
        this.grass = mesh; this.grassDummy = dummy;
        this.deps.scene.add(mesh);
        this.disposers.push(() => { blade.dispose(); mat.dispose(); this.deps.scene.remove(mesh) });
    }
    swayGrass(t, gust) {
        if (!this.grass || !this.grass.visible) return;
        let d = this.grassDummy;
        for (let i = 0; i < this.grassBlades.length; i++) {
            let b = this.grassBlades[i];
            let s = Math.sin(t * 1.9 + b.ph + b.x * .35) * .16 + Math.sin(t * 4.3 + b.ph) * .05 + gust * .22;
            d.position.set(b.x, 0, b.z);
            d.rotation.set(s, b.rot, s * .55);
            d.scale.set(1, b.s, 1);
            d.updateMatrix();
            this.grass.setMatrixAt(i, d.matrix);
        }
        this.grass.instanceMatrix.needsUpdate = !0;
    }
    buildDust() {
        let N = 260, geo = new R9(.5, 6, 4);
        let mat = new f9({ color: 0x7f7360, transparent: !0, opacity: .32, depthWrite: !1 });
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
    /* ---- coche: carrocería y ruedas por separado (GLB de Tripo) ---- */
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
        let s = targetLen / Math.max(dims[0].v, 1e-4);
        wrap.scale.setScalar(s);
        wrap.userData.size = size; wrap.userData.scaleApplied = s;
        return wrap;
    }
    loadCarModel() {
        if (typeof CDLV_CAR_BODY !== "string" || !CDLV_CAR_BODY) return;
        let loader = new w8;
        loader.load(CDLV_CAR_BODY, gltf => {
            let body = this.fitModel(gltf.scene, 5.35, "length-z", Math.PI);
            body.traverse(o => { if (o.isMesh) { o.castShadow = !0; o.receiveShadow = !0; if (o.material) o.material.envMapIntensity = .6 } });
            let box = new fP().setFromObject(body), size = box.getSize(new Y);
            body.position.y = .34 - box.min.y;
            this.car.group.add(body);
            this.car.body = body;
            this.car.proc.visible = !1;
            this.car.halfWidth = size.x / 2;
            this.car.len = size.z;
            this.loadWheels();
        }, void 0, () => { });
    }
    loadWheels() {
        if (typeof CDLV_CAR_WHEEL !== "string" || !CDLV_CAR_WHEEL) return;
        let loader = new w8;
        loader.load(CDLV_CAR_WHEEL, gltf => {
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
    /* ---- cuerpo del conductor visto en tercera persona (escena 1) ---- */
    buildDriver() {
        let g = new eP,
            skin = new _A({ color: 0xa9825f, roughness: .8 }),
            cloth = new _A({ color: 0x2a2f38, roughness: .95 }),
            hair = new _A({ color: 0x171310, roughness: 1 });
        let torso = new fA(new qe(.16, .34, 4, 9), cloth);
        torso.position.y = .30; torso.rotation.x = -.12; g.add(torso);
        let head = new fA(new R9(.115, 12, 10), skin);
        head.position.set(0, .60, .01); head.scale.set(.92, 1.1, 1); g.add(head);
        let cap = new fA(new R9(.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * .6), hair);
        cap.position.copy(head.position); g.add(cap);
        let arm = (side) => {
            let a = new eP, up = new P9(.05, .045, .30, 6);
            up.translate(0, -.15, 0);
            let m = new fA(up, cloth); a.add(m);
            let fo = new eP; fo.position.y = -.30;
            let fm = new fA(new P9(.042, .038, .28, 6), skin);
            fm.geometry.translate(0, -.14, 0); fo.add(fm); a.add(fo);
            a.position.set(side * .17, .46, .04);
            a.rotation.set(-1.15, 0, side * -.22); fo.rotation.x = -.55;
            return a;
        };
        g.add(arm(-1), arm(1));
        for (let s of [-1, 1]) {
            let th = new fA(new P9(.065, .06, .34, 6), cloth);
            th.geometry.translate(0, -.17, 0);
            th.position.set(s * .09, .16, .06); th.rotation.x = -1.35; g.add(th);
        }
        g.traverse(o => o.isMesh && (o.castShadow = !0));
        this.disposers.push(() => { g.traverse(o => o.isMesh && o.geometry.dispose()); [skin, cloth, hair].forEach(m => m.dispose()) });
        return g;
    }
    /* ---- POV: cuerpo, brazos, volante, salpicadero, celular ---- */
    buildPov() {
        let cloth = new _A({ color: 0x232830, roughness: .95 }),
            skin = new _A({ color: 0xa9825f, roughness: .8 });
        let g = new eP;
        g.position.set(.45, .60, -.15);
        let chest = new fA(new qe(.19, .30, 4, 10), cloth);
        chest.position.set(0, .32, .02); chest.rotation.x = -.2;
        chest.scale.set(1.12, 1, .78); g.add(chest);
        for (let s of [-1, 1]) {
            let th = new fA(new P9(.08, .072, .5, 7), cloth);
            th.geometry.translate(0, -.25, 0);
            th.position.set(s * .13, .14, .12); th.rotation.x = -1.46; g.add(th);
            let sh = new fA(new P9(.062, .056, .34, 6), cloth);
            sh.geometry.translate(0, -.17, 0);
            sh.position.set(s * .14, .02, .58); sh.rotation.x = -.22; g.add(sh);
        }
        let mkArm = side => {
            let a = new eP;
            let up = new fA(new P9(.056, .048, .30, 7), cloth);
            up.geometry.translate(0, -.15, 0); a.add(up);
            let elbow = new eP; elbow.position.y = -.30;
            let fore = new fA(new P9(.046, .039, .27, 7), skin);
            fore.geometry.translate(0, -.135, 0); elbow.add(fore);
            let hand = new eP; hand.position.y = -.27;
            let palm = new fA(new s9(.085, .10, .055), skin);
            palm.rotation.x = .4; hand.add(palm); elbow.add(hand); a.add(elbow);
            a.position.set(side * -.21, .52, .01);
            a.userData = { elbow, hand, side };
            return a;
        };
        let armL = mkArm(-1), armR = mkArm(1);
        g.add(armL, armR);
        g.traverse(o => { if (o.isMesh) { o.castShadow = !1; o.receiveShadow = !1 } });
        g.visible = !1;
        this.car.group.add(g);
        this.pov = { group: g, armL, armR, phone: null, phoneHolder: null };
        this.disposers.push(() => { g.traverse(o => o.isMesh && o.geometry.dispose()); [cloth, skin].forEach(m => m.dispose()) });
        this.loadPhone();
    }
    loadPhone() {
        if (typeof CDLV_PHONE !== "string" || !CDLV_PHONE) return;
        let loader = new w8;
        loader.load(CDLV_PHONE, gltf => {
            let ph = this.fitModel(gltf.scene, .152, "length-z");
            let holder = new eP;
            holder.add(ph);
            holder.position.set(0, -.055, .015);
            holder.rotation.set(-1.05, 0, .12);
            holder.visible = !1;
            let glowMat = new f9({ color: 0xcfe9ff, transparent: !0, opacity: .5 });
            let glows = [];
            for (let s of [1, -1]) {
                let g = new fA(new k9(.066, .134), glowMat);
                g.position.set(0, s * .0065, 0);
                g.rotation.x = -s * Math.PI / 2;
                holder.add(g); glows.push(g);
            }
            let light = new GD(0x9fd4ff, 1.1, 1.6, 2);
            light.position.set(0, .1, 0); holder.add(light);
            this.pov.armR.userData.hand.add(holder);
            this.pov.phone = ph; this.pov.phoneHolder = holder; this.pov.phoneGlow = glows[0];
        }, void 0, () => { });
    }
    /* pose de brazos: k=0 manos al volante, k=1 mano derecha con el celular arriba */
    poseArms(k, reach) {
        let p = this.pov; if (!p) return;
        let L = p.armL, R = p.armR;
        L.rotation.set(-1.46, .10, -.26); L.userData.elbow.rotation.set(-.26, 0, .16);
        let ax = HP(-1.46, HP(-.55, -1.24, k), reach),
            ay = HP(-.10, HP(-.5, -.12, k), reach),
            az = HP(.26, HP(.5, .2, k), reach),
            ex = HP(-.26, HP(-1.05, -1.52, k), reach);
        R.rotation.set(ax, ay, az);
        R.userData.elbow.rotation.set(ex, 0, HP(-.16, -.3, k));
    }
    /* ---- pantalla partida con la oficina ---- */
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
        let s = this.split; if (!s || !s.on) return;
        s.on = !1; s.wrap.style.display = "none";
        s.off.style.transform = "translateX(100%)";
        s.line.style.height = "0";
        if (s.view) s.view.style.transform = "";
        if (s.sub) { s.sub.style.right = ""; s.sub.style.padding = "" }
    }
    /* ---- timbre del celular ---- */
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
            a.volume = .95; a.play().catch(() => { });
            this.vo = a;
        } catch (e) { }
    }
    stopVo() {
        if (this.vo) { try { this.vo.pause() } catch (e) { } this.vo = null }
    }
    povHead(camera, sway) {
        let car = this.car.group;
        car.updateMatrixWorld(!0);
        this._v1.set(.45, 1.30, -.2); car.localToWorld(this._v1);
        this._v2.set(.45, 1.12, 14); car.localToWorld(this._v2);
        camera.position.copy(this._v1);
        camera.position.y += Math.sin(this.elapsed * 8.3) * .006 * sway;
        camera.position.x += Math.sin(this.elapsed * 5.1) * .008 * sway;
        camera.lookAt(this._v2);
        camera.rotateZ(Math.sin(this.elapsed * 1.4) * .012 * sway);
    }
