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
                this.setActorVisible(!1);
                A.fov = 68; A.updateProjectionMatrix();
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
        let hit = {
            id: "bat-hit",
            duration: 5.4,
            captions: [{ from: 3.1, to: 5.2, text: "No la oí entrar." }],
            enter: () => {
                this.hitDone = !1;
                this.look("night-exterior");
                i.intensity = 2.4;
                this.setActorVisible(!1);
                this.stepAt = -1;
                P.set({ fade: 1, dread: 0, cardTitle: "", cardSub: "" });
                A.fov = 54; A.updateProjectionMatrix();
                if (this.hitLight) { this.hitLight.position.set(doorX + .1, y0 + 2.25, doorZ + .9); this.hitLight.intensity = 0; this.hitLight.visible = !0 }
                // entra por detras, a la izquierda, fuera de cuadro
                placeLady(doorX + .3, doorZ + .15, .1, "preset:idle");
                this.oldLady && (this.oldLady.root.visible = !1);
            },
            update: (p, tt, dt) => {
                let st = this.shotTime, L = this.oldLady;
                if (st < 1.15) P.set({ fade: HA(1 - st / .8, 0, 1) });
                L && L.update(dt, st < 1.15 ? 1.35 : .9);
                if (st > .78) {
                    L && (L.root.visible = !0);
                    // el golpe cae detras de la camara; lo que se ve despues es
                    // como levanta el bate de nuevo, parada encima
                    let k = st < 1.33 ? (st - .78) / .55
                        : st < 2.4 ? HP(1, .36, aD(HA((st - 1.45) / .95, 0, 1)))
                            : .36;
                    this.ladySwing(k);
                }
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
                    placeLady(doorX + .3, doorZ + .15, .1, "preset:idle");
                }
                // el golpe: la camara cae al piso girando
                let f = HA((st - 1.15) / 1.5, 0, 1), e = aD(f),
                    turn = aD(HA((st - 1.2) / .6, 0, 1));   // la cabeza gira antes de terminar de caer
                let camY = HP(y0 + 1.62, y0 + .3, e),
                    camZ = HP(doorZ + 1.8, doorZ + 2.3, e);
                A.position.set(doorX + HP(0, -.15, e) + Math.sin(tt * 26) * .05 * (1 - f), camY, camZ);
                // mira hacia ella parada encima con el bate
                let lx = HP(doorX, doorX + .3, turn),
                    ly = HP(y0 + 1.48, y0 + 1.05, turn),
                    lz = HP(camZ + 3, doorZ + .15, turn);
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
                A.fov = 62; A.updateProjectionMatrix();
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
        return [hit, wake];
    }
    /* ====== SIGUE MANEJANDO, LLEGA A LA CASA Y SE BAJA DEL AUTO ====== */
    arriveShots(A, P, D, i, t) {
        let doorX = D.exitDoor.x, doorZ = D.bounds.z, y0 = $A(0);
        let carX = doorX - 1.7, stopZ = doorZ - 8.4;
        let drive = {
            id: "drive-arrive",
            duration: 8.5,
            captions: [{ from: .7, to: 4.4, text: "La última casa antes del cruce." }],
            enter: () => {
                this.look("forest-night");
                this.roadGroup.visible = !0;
                this.forest && (this.forest.visible = !0);
                this.setActorVisible(!1);
                this.driverRig && (this.driverRig.root.visible = !1);
                this.povRig && (this.povRig.root.visible = !0);
                this.seatPose(this.povRig, 0, 0);
                this.phoneHolder && (this.phoneHolder.visible = !1);
                this.car.group.visible = !0;
                this.car.group.rotation.y = 0;              // enfilado hacia la casa
                this.car.group.position.set(carX, 0, doorZ - 34);
                A.fov = 68; A.updateProjectionMatrix();
                P.set({ fade: 0, subtitle: "", cardTitle: "", cardSub: "" });
                this.engine || (this.engine = Ug());
                this.stopped = !1;
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                let k = Mi(HA(st / 6.8, 0, 1));             // va frenando al llegar
                this.car.group.position.z = HP(doorZ - 34, stopZ, k);
                let spd = 1 - Mi(HA(st / 6.8, 0, 1));
                for (let w of this.car.wheels) w.rotation.x += dt * 11 * spd;
                for (let l of this.car.lights) l.intensity = 34 + 34 * spd;
                this.povHead(A, .25 + spd * .75);
                this.driftFog(dt);
                if (!this.stopped && st > 7) { this.stopped = !0; this.engine && (this.engine.stop(), this.engine = null); HT(.4) }
            }
        };
        let out = {
            id: "get-out",
            duration: 3.4,
            captions: [{ from: 3.2, to: 7, text: "Tres semanas. Vaciarla, tapar los agujeros y dejarla presentable." }],
            enter: () => {
                // autosuficiente: tambien vale si se salta directo a esta escena
                this.look("night-exterior");
                this.roadGroup.visible = !0;
                this.forest && (this.forest.visible = !0);
                this.setActorVisible(!1);
                this.driverRig && (this.driverRig.root.visible = !1);
                this.car.group.visible = !0;
                this.car.group.rotation.y = 0;
                this.car.group.position.set(carX, 0, stopZ);
                this.povRig && (this.povRig.root.visible = !0);
                this.seatPose(this.povRig, 0, 0);
                this.engine && (this.engine.stop(), this.engine = null);
                for (let l of this.car.lights) l.intensity = 0;
                i.intensity = 2.6;                           // saca la linterna al bajar
                P.set({ fade: 0, cardTitle: "", cardSub: "" });
                A.fov = 62; A.updateProjectionMatrix();
                this.stepAt = -1;
                ki(.5, .15);                                 // la puerta del auto
            },
            update: (p, tt, dt) => {
                let st = this.shotTime;
                // del asiento a parado al lado del auto: primero sale, despues se endereza
                // en cuanto la camara sale del asiento, el cuerpo sentado sobra
                this.povRig && (this.povRig.root.visible = st < 1.1);
                let slide = aD(HA(st / 2.2, 0, 1)),
                    rise = aD(HA((st - 1.6) / 1.6, 0, 1));
                let cx = HP(carX + .45, carX - 1.5, slide),
                    cz = HP(stopZ + .02, stopZ - .35, slide);
                let cy = HP(HP(1.35, 1.02, slide), 1.62, rise);
                A.position.set(cx, y0 + cy + Math.sin(tt * 4.6) * .015, cz);
                // gira de mirar el volante a mirar la casa
                let turn = aD(HA((st - 1.2) / 2, 0, 1));
                A.lookAt(HP(carX + .45, doorX, turn), y0 + HP(1.1, 1.75, turn), HP(stopZ + 6, doorZ + .4, turn));
                A.rotateZ(HP(.06, 0, rise) + Math.sin(tt * 1.3) * .008);
                this.driftFog(dt);
            },
            exit: () => { this.povRig && (this.povRig.root.visible = !1) }
        };
        /* tercera persona: camina hasta la puerta, la abre y entra */
        let toDoor = {
            id: "walk-to-door",
            duration: 10.4,
            captions: [{ from: .8, to: 4.6, text: "Tres semanas. Vaciarla, tapar los agujeros y dejarla presentable." }],
            enter: () => {
                this.look("night-exterior");
                i.intensity = 2.2;
                this.povRig && (this.povRig.root.visible = !1);
                this.driverRig && (this.driverRig.root.visible = !1);
                this.car.group.visible = !0;
                this.car.group.rotation.y = 0;
                this.car.group.position.set(carX, 0, stopZ);
                this.setActorVisible(!0);
                this.man.group.position.set(carX - 1.5, y0, stopZ - .35);
                this.man.group.rotation.y = 0;
                this.rig && this.rig.play("preset:walk", { fade: .2 });
                this.actorRate = 1;
                this.findFrontDoor();
                this.swingDoor(0);
                this.stepAt = -1; this.knocked = !1; this.shut = !1; this.walkClip = !0;
                this.lastPX = carX - 1.5; this.lastPZ = stopZ - .35;
                this.faceY = Math.atan2(doorX - (carX - 1.5), (doorZ - 1.5) - (stopZ - .35));
                A.fov = 52; A.updateProjectionMatrix();
                P.set({ fade: 0, subtitle: "", cardTitle: "", cardSub: "" });
            },
            update: (p, tt, dt) => {
                let st = this.shotTime, g = this.man.group;
                // el recorrido rodea el auto: primero sale de al lado y avanza
                // hasta pasar el capot, recien despues cruza hacia la puerta
                let px, pz;
                if (st < 2) {
                    let k = Mi(HA(st / 2, 0, 1));
                    px = HP(carX - 1.55, carX - 1.45, k); pz = HP(stopZ - .35, stopZ + 3.7, k);
                } else if (st < 5) {
                    let k = Mi(HA((st - 2) / 3, 0, 1));
                    px = HP(carX - 1.45, doorX, k); pz = HP(stopZ + 3.7, doorZ - 1.5, k);
                } else if (st < 7) { px = doorX; pz = doorZ - 1.5 }
                else {                                            // y entra
                    let e2 = aD(HA((st - 7) / 2.2, 0, 1));
                    px = doorX; pz = HP(doorZ - 1.5, doorZ + 1.2, e2);
                }
                g.position.set(px, y0, pz);
                // orientar por la velocidad real: apuntar al objetivo se da vuelta
                // 180 grados en cuanto lo pasa de largo
                let vx = px - this.lastPX, vz = pz - this.lastPZ;
                if (Math.hypot(vx, vz) > 1e-4) this.faceY = Math.atan2(vx, vz);
                this.lastPX = px; this.lastPZ = pz;
                g.rotation.y = this.faceY;
                let moving = st < 5 || st > 7;
                if (this.rig && this.walkClip !== moving) {
                    this.walkClip = moving;
                    this.rig.play(moving ? "preset:walk" : "preset:idle", { fade: .22 });
                }
                if (moving && st - this.stepAt > .5) { this.stepAt = st; li("concrete", .4) }
                // estira el brazo, abre la puerta y la cierra al entrar
                let reach = Math.max(
                    HA(Math.min((st - 5.1) / .6, (7.4 - st) / .5), 0, 1),   // la abre
                    HA(Math.min((st - 8.5) / .5, (9.9 - st) / .4), 0, 1));  // y la cierra
                this.boyReach(reach);
                if (!this.knocked && st > 5.2) { this.knocked = !0; HT(.45, 0) }
                let open = HA((st - 5.6) / 1.3, 0, 1),
                    shut = HA((st - 8.7) / 1, 0, 1);
                this.swingDoor(open * (1 - shut));
                if (!this.shut && st > 9.5) { this.shut = !0; HT(.6, 0); li("wood", .6) }
                // camara en tercera persona, atras y a un costado
                let cam = Mi(HA(st / 6.5, 0, 1));
                let ang = HP(-1.05, -.3, cam), dist = HP(4.6, 2.7, cam);
                A.position.set(px + Math.sin(ang) * dist, y0 + HP(1.8, 1.55, cam), pz - Math.cos(ang) * dist);
                A.lookAt(px, y0 + HP(1.05, 1.35, HA((st - 4) / 3, 0, 1)), pz + .6);
                this.handheld(.005);
                this.driftFog(dt);
                if (st > 9.7) P.set({ fade: HA((st - 9.7) / .6, 0, 1) });
            },
            exit: () => {
                this.setActorVisible(!1);
                this.car.group.visible = !1;
                this.roadGroup.visible = !1;
                this.walkClip = void 0;
                P.set({ fade: 1 });
            }
        };
        return [drive, out, toDoor];
    }
