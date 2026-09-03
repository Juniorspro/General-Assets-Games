#!/usr/bin/env python3
"""Devuelve el proyecto descartable donde se genera TODO, creandolo si no esta.

    python3 herramientas/rezona/balde.py        # imprime el public_id

POR QUE EXISTE: el servidor de Rezona pide un `project_id` en cada generacion,
asi que no se puede generar «sin proyecto». Lo que si se puede es que NINGUN
proyecto sea parte de la cadena: este modulo busca el balde por NOMBRE y lo crea
si no aparece, asi que borrarlo desde la app no rompe nada — la proxima corrida
lo vuelve a crear. Ya paso: el proyecto de la vuelta anterior desaparecio y
todas las llamadas contestaron PROJECT_NOT_FOUND con el id escrito a mano.

Y NADA QUEDA A LA VISTA CON EL NOMBRE DE UN JUEGO. Todo cae en un unico balde
que se llama como lo que es. Lo que vale es la copia horneada del repo; el balde
se vacia a mano desde la app, porque no se puede borrar por codigo: el MCP no
tiene `delete_project`, el CLI tampoco, y `DELETE /api/projects/{id}` existe
pero contesta 403 con la credencial de API.
"""
import json, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import rz

NOMBRE = 'tmp — descartable, borrar'


def balde(espera=240):
    r = rz.sesion([('list_projects', {})], espera=espera)
    t = rz.texto(r[0])
    for m in re.finditer(r'"public_id":\s*"([^"]+)"[^}]*?"name":\s*"([^"]*)"', t, re.S):
        if m.group(2).strip() == NOMBRE:
            return m.group(1)
    r = rz.sesion([('create_project', {'name': NOMBRE})], espera=espera)
    s = rz.texto(r[0])
    m = re.search(r'"public_id":\s*"([^"]+)"', s)
    if not m: raise SystemExit('no se pudo crear el balde: %s' % s[:200])
    return m.group(1)


if __name__ == '__main__':
    print(balde())
