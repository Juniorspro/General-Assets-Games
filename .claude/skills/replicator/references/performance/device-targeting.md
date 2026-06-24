# Device Targeting

Use one explicit target device class.

## `desktop-high`

Use when:

- the work is a premium demo or controlled environment
- the effect depends on high density, deep post, or expensive simulation

Baseline expectation:

- `60 FPS` target with headroom for spikes
- roughly `16.7 ms` total frame budget
- discrete desktop GPU or similarly strong laptop GPU class

## `desktop-mid`

Use when:

- the work still targets desktops first
- some degradation is acceptable
- the goal is broad modern desktop coverage without chasing low-end laptops

Baseline expectation:

- `45-60 FPS` target
- roughly `16.7-22 ms` total frame budget
- common integrated or mid-tier laptop/desktop GPU class

## `laptop-balanced`

Use when:

- the user gives no strict requirement
- the work should feel reasonable on common laptops
- the effect can tolerate a controlled quality ladder

This is the default class for this repository.

Baseline expectation:

- `30-60 FPS` target depending on effect class
- roughly `16.7-33 ms` total frame budget
- everyday laptop hardware with limited thermal headroom

## `mobile-safe`

Use when:

- broad public compatibility matters
- the scene must survive narrow thermal and power budgets
- the quality ladder must be aggressive and predictable

Baseline expectation:

- `30 FPS` floor with stable interaction
- roughly `33 ms` total frame budget
- phone or tablet GPU classes where heat, bandwidth, and startup cost matter as much as peak throughput

## Rule

Do not describe support vaguely.

Pick one default device class, then describe any premium or degraded variants around it.
