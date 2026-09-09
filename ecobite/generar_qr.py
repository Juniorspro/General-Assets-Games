#!/usr/bin/env python3
"""Dibuja el QR de trazabilidad que va impreso en el envase (maqueta)."""
import os
import segno

BASE = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(BASE, 'img', 'qr-trazabilidad.svg')
LOTE = 'https://ecobite.ar/lote/AR-2026-0417'

os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
segno.make(LOTE, error='h').save(DESTINO, scale=10, border=2,
                                 dark='#1C2118', light=None)
print(DESTINO, os.path.getsize(DESTINO), 'bytes ->', LOTE)
