    /* ============ ESCENAS NUEVAS: bosque + POV + contrato ============ */
    introShots(A, P, D, i, t) {
        let TXT = CDLV_TXT[CDLV_LANG] || CDLV_TXT.es, VOT = CDLV_VOT[CDLV_LANG] || CDLV_VOT.es;
        let showRig = (rig, on) => { rig && (rig.root.visible = on) };
        let pass = {
            id: "forest-pass",
            duration: 7.2,
            enter: () => {
                this.look("forest-night");
                this.roadGroup.visible = !0;
                this.forest && (this.forest.visible = !0);
                this.grass && (this.grass.visible = !0);
                this.dust && (this.dust.mesh.visible = !0);
                this.setActorVisible(!1);
                showRig(this.povRig, !1);
                showRig(this.driverRig, !0);
                this.phoneHolder && (this.phoneHolder.visible = !1);
                this.car.group.visible = !0;
                this.car.group.position.set(-80, 0, t - 1.9);
                this.car.group.rotation.y = Math.PI / 2;
                A.fov = 46; A.updateProjectionMatrix();
                P.set({ fade: 1, skip: !0, subtitle: "", cardTitle: "", cardSub: "" });
                this.engine = Ug();
                this.dustAt = -1; this.whooshed = !1;
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                P.set({ fade: HA(1 - st / 1.6, 0, 1) });
                let car = this.car.group, spd = 33;
                car.position.x += spd * dt;
                for (let w of this.car.wheels) w.rotation.x += dt * 26;
                let dx = car.position.x;
                if (Math.abs(dx) < 55 && tt - this.dustAt > .03) {
                    this.dustAt = tt;
                    this.emitDust(dx - 2.4, .06, car.position.z + .9, 3, .5);
                    this.emitDust(dx - 2.4, .06, car.position.z - .9, 3, .5);
                }
                if (!this.whooshed && dx > -6) { this.whooshed = !0; Mg() }
                this.updateDust(dt);
                this.driftFog(dt);
                let lift = Mi(HA((st - 1) / 6, 0, 1));
                A.position.set(2.1, .22 + lift * .05, t + 4.6);
                A.lookAt(HP(-2.4, 7.5, HA((st - 2.2) / 3.2, 0, 1)), .58, t - 1.6);
                this.handheld(.004);
                let near = HA(1 - Math.abs(dx - 2) / 22, 0, 1);
                for (let l of this.car.lights) l.intensity = 26 + near * 90;
            },
            exit: () => { this.grass && (this.grass.visible = !1) }
        };
        let drive = {
            id: "pov-drive",
            duration: 6,
            enter: () => {
                this.look("forest-night");
                showRig(this.driverRig, !1);
                showRig(this.povRig, !0);
                this.seatPose(this.povRig, 0, 0);
                this.car.group.position.set(-115, 0, t - 1.9);
                this.car.group.rotation.y = Math.PI / 2;
                A.fov = 68; A.updateProjectionMatrix();
                P.set({ fade: 0, subtitle: "" });
                this.engine || (this.engine = Ug());
            },
            update: (p, tt, dt) => {
                this.car.group.position.x += 17 * dt;
                for (let w of this.car.wheels) w.rotation.x += dt * 14;
                this.povHead(A, 1);
                this.driftFog(dt);
                this.updateDust(dt);
            }
        };
        let call = {
            id: "pov-phone",
            duration: 9.8,
            enter: () => {
                this.rangAt = [.5, 1.55, 2.6]; this.rangIdx = 0;
                this.phoneHolder && (this.phoneHolder.visible = !1);
                A.fov = 68; A.updateProjectionMatrix();
                call.tHello = 4.15;
                call.tCaller = call.tHello + VOT.hello + .55;
                call.captions = [
                    { from: call.tHello, to: call.tHello + VOT.hello + .7, text: TXT.hello },
                    { from: call.tCaller, to: call.tCaller + VOT.caller + .8, text: TXT.caller }
                ];
                call.saidHello = !1; call.saidCaller = !1;
                P.set({ subtitle: "" });
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                this.car.group.position.x += HP(17, 8.5, HA((st - 3) / 4, 0, 1)) * dt;
                for (let w of this.car.wheels) w.rotation.x += dt * HP(14, 7, HA((st - 3) / 4, 0, 1));
                while (this.rangIdx < this.rangAt.length && st >= this.rangAt[this.rangIdx]) { this.ringPhone(); this.rangIdx++ }
                let reach = HA((st - 1.7) / 1.1, 0, 1), k = HA((st - 2.9) / 1.1, 0, 1);
                this.seatPose(this.povRig, aD(k), aD(reach));
                this.phoneHolder && (this.phoneHolder.visible = st > 2.75);
                if (!call.saidHello && st >= call.tHello) { call.saidHello = !0; this.playVo("hello") }
                if (!call.saidCaller && st >= call.tCaller) { call.saidCaller = !0; this.playVo("caller") }
                let zoom = aD(HA((st - 5) / 2.6, 0, 1));
                A.fov = HP(68, 52, zoom); A.updateProjectionMatrix();
                this.povHead(A, 1 - zoom * .7, zoom);
                if (this.phoneHolder && zoom > 0) {
                    this.phoneHolder.getWorldPosition(this._v3);
                    this._v2.set(.45, 1.10, 14); this.car.group.localToWorld(this._v2);
                    this._v2.lerp(this._v3, zoom);
                    A.lookAt(this._v2);
                }
                this.driftFog(dt);
            }
        };
        let split = {
            id: "office-split",
            duration: 21,
            enter: () => {
                let od = VOT.office, ad = VOT.accept;
                split.tOffice = 1.25;
                split.tAccept = split.tOffice + od + 1.25;
                split.tClose = split.tAccept + ad + 1.15;
                split.duration = split.tClose + 1.9;
                split.captions = [
                    { from: split.tOffice + .1, to: split.tOffice + od * .52, text: TXT.office1 },
                    { from: split.tOffice + od * .52, to: split.tOffice + od + .35, text: TXT.office2 },
                    { from: split.tAccept, to: split.tAccept + ad + .9, text: TXT.accept }
                ];
                split.playedOffice = !1; split.playedAccept = !1;
                this.car.group.position.x = -40;
                A.fov = 52; A.updateProjectionMatrix();
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                this.car.group.position.x += 4.5 * dt;
                for (let w of this.car.wheels) w.rotation.x += dt * 3.6;
                this.povHead(A, .3, 1);
                if (this.phoneHolder) {
                    this.phoneHolder.getWorldPosition(this._v3);
                    A.lookAt(this._v3);
                    this.phoneLight && (this.phoneLight.intensity = .45 + Math.sin(tt * 3) * .08);
                }
                let lineP = Mi(HA(st / .34, 0, 1)),
                    panelP = Mi(HA((st - .34) / .72, 0, 1));
                if (st >= split.tClose) {
                    let c = Mi(HA((st - split.tClose) / .95, 0, 1));
                    panelP = 1 - c;
                    lineP = 1 - Mi(HA((st - split.tClose - .8) / .4, 0, 1));
                }
                if (lineP <= .001 && st > split.tClose) this.splitHide();
                else this.splitShow(lineP, panelP);
                if (!split.playedOffice && st >= split.tOffice) { split.playedOffice = !0; this.playVo("office") }
                if (!split.playedAccept && st >= split.tAccept) { split.playedAccept = !0; this.playVo("accept"); ki(.35, .1) }
                this.driftFog(dt);
            },
            exit: () => {
                this.splitHide(); this.stopVo();
                showRig(this.povRig, !1);
                showRig(this.driverRig, !1);
                this.phoneHolder && (this.phoneHolder.visible = !1);
                this.dust && (this.dust.mesh.visible = !1);
                this.setActorVisible(!0);
                A.fov = 44; A.updateProjectionMatrix();
                P.set({ subtitle: "" });
            }
        };
        return [pass, drive, call, split];
    }
    /* ====== ENTRA A LA CASA, LA VIEJA LO NOQUEA, DESPIERTA ENCERRADO ====== */
    houseShots(A, P, D, i) {
        let doorX = D.exitDoor.x, doorZ = D.bounds.z, y0 = $A(0);
        let placeLady = (x, z, yaw, clip) => {
            let L = this.oldLady; if (!L) return;
            L.root.visible = !0;
            L.root.position.set(x, y0, z);
            L.root.rotation.y = yaw;
            clip && L.play(clip, { fade: .18 });
        };
        let walkIn = {
            id: "enter-house",
            duration: 6,
            captions: [{ from: .8, to: 4.6, text: "La puerta estaba abierta. Nadie contestó." }],
            enter: () => {
                this.look("night-exterior");
                this.setActorVisible(!1);
                this.roadGroup.visible = !1;
                this.car.group.visible = !1;
                i.intensity = 2.4;
                P.set({ fade: 1, subtitle: "", cardTitle: "", cardSub: "", dread: 0 });
                this.stepAt = -1;
                this.oldLady && (this.oldLady.root.visible = !1);
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                P.set({ fade: HA(1 - st / 1.3, 0, 1) });
                let k = Mi(HA(st / 5, 0, 1)),
                    z = HP(doorZ - 2.2, doorZ + 1.3, k);
                A.position.set(doorX + Math.sin(tt * 1.9) * .05, y0 + 1.62 + Math.sin(tt * 5.2) * .025, z);
                A.lookAt(doorX + Math.sin(tt * .7) * .3, y0 + 1.48, z + 3);
                A.rotateZ(Math.sin(tt * 2.6) * .009);
                if (st - this.stepAt > .62) { this.stepAt = st; li(z < doorZ ? "concrete" : "wood", .5) }
                this.oldLady && this.oldLady.update(dt, 1);
            }
        };
        let hit = {
            id: "bat-hit",
            duration: 5.4,
            captions: [{ from: 3.1, to: 5.2, text: "No la oí entrar." }],
            enter: () => {
                this.hitDone = !1;
                if (this.hitLight) { this.hitLight.position.set(doorX + .1, y0 + 2.25, doorZ + 1.5); this.hitLight.intensity = 0; this.hitLight.visible = !0 }
                // entra por detras, a la izquierda, fuera de cuadro
                placeLady(doorX + .35, doorZ + .78, .12, "preset:idle");
                this.oldLady && (this.oldLady.root.visible = !1);
            },
            update: (p, tt, dt) => {
                let st = this.shotTime, L = this.oldLady;
                L && L.update(dt, st < 1.15 ? 1.35 : .9);
                if (st > .78) { L && (L.root.visible = !0); this.ladySwing((st - .78) / .55) }
                if (st < 1.15) {
                    // ultimo paso adentro, todavia de espaldas a ella
                    let z = HP(doorZ + 1.3, doorZ + 1.8, Mi(HA(st / 1.15, 0, 1)));
                    A.position.set(doorX, y0 + 1.62 + Math.sin(tt * 5.2) * .025, z);
                    A.lookAt(doorX, y0 + 1.48, z + 3);
                    if (st - this.stepAt > .62) { this.stepAt = st; li("wood", .5) }
                    return;
                }
                if (!this.hitDone) {
                    this.hitDone = !0;
                    HT(1); ZT(1); ki(1, -.35);
                    P.set({ dread: .7 });
                    placeLady(doorX + .35, doorZ + .78, .12, "preset:idle");
                }
                // el golpe: la camara cae al piso girando
                let f = HA((st - 1.15) / 1.5, 0, 1), e = aD(f),
                    turn = aD(HA((st - 1.2) / .6, 0, 1));   // la cabeza gira antes de terminar de caer
                let camY = HP(y0 + 1.62, y0 + .3, e),
                    camZ = HP(doorZ + 1.8, doorZ + 2.3, e);
                A.position.set(doorX + HP(0, -.15, e) + Math.sin(tt * 26) * .05 * (1 - f), camY, camZ);
                // mira hacia ella parada encima con el bate
                let lx = HP(doorX, doorX + .35, turn),
                    ly = HP(y0 + 1.48, y0 + 1.05, turn),
                    lz = HP(camZ + 3, doorZ + .78, turn);
                A.lookAt(lx, ly, lz);
                A.rotateZ(HP(0, .7, e) + Math.sin(tt * 18) * .06 * (1 - f));
                if (this.hitLight) this.hitLight.intensity = HP(0, 18, HA((st - 1.1) / .35, 0, 1)) * HA(1 - (st - 3) / 1.4, 0, 1);
                if (st > 2.9) P.set({ fade: HA((st - 2.9) / 1.5, 0, 1) });
                if (st > 4.4 && L) L.root.visible = !1;
            },
            exit: () => {
                P.set({ dread: .35 });
                this.oldLady && (this.oldLady.root.visible = !1);
                this.hitLight && (this.hitLight.visible = !1, this.hitLight.intensity = 0);
            }
        };
        let wake = {
            id: "wake-locked",
            duration: 9,
            captions: [
                { from: 2.4, to: 5.4, text: "Cuando abrí los ojos ya era otro día." },
                { from: 5.8, to: 8.6, text: "La puerta estaba cerrada por fuera." }
            ],
            enter: () => {
                this.look("night-interior");
                i.intensity = 1.1;
                P.set({ fade: 1, dread: .5 });
                ZT(1);
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                // parpadeos al volver en si
                let f = st < .9 ? 1 : st < 1.2 ? .35 : st < 1.5 ? .85 : st < 1.9 ? .25 : HA(1 - (st - 1.9) * 1.5, 0, 1);
                P.set({ fade: f, dread: HA(.5 - st * .06, .12, .5) });
                let rise = Mi(HA((st - 1.6) / 3.4, 0, 1));
                let b = this.bedroom;
                A.position.set(b.x, HP(b.y - 1.32, b.y - .42, rise), b.z);
                let turn = HA((st - 4.6) / 3, 0, 1);
                A.lookAt(HP(b.x, b.x + 1.6, aD(turn)), HP(b.y - 1.1, b.y - .35, aD(turn)), b.z - 2.6);
                A.rotateZ(HP(.28, .03, rise) + Math.sin(tt * 1.7) * .012);
                if (st > 5.6 && st < 5.7) HT(.55);
                if (st > 6.4 && st < 6.5) HT(.5);
                this.handheld(.008);
            },
            exit: () => { P.set({ fade: 0, dread: .3 }); i.intensity = 3.2 }
        };
        return [walkIn, hit, wake];
    }
