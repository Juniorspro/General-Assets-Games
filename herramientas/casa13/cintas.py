#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Las cuatro grabaciones de CASA 13, en tres idiomas. Texto y voz salen de ACA.

LA MISMA TABLA ALIMENTA EL SUBTITULO Y EL AUDIO, y eso no es comodidad: con dos
listas, lo que se lee y lo que se escucha terminan diciendo cosas distintas el
dia que se corrija una linea. El juego guarda la CLAVE (c1..c4), igual que las
ocho hojas.

LA HISTORIA SALE DE LO QUE LAS HOJAS YA DECIAN. El diario habla de una segunda
noche sin luz y de un ruido en el sotano; la nota de mama dice «nos vamos el
jueves, no vuelvas por el resto»; el diario del fondo —firmado H.— dice «baje a
cerrar la llave de paso, el agua ya paso el segundo escalon». La cinta final es
la propia camara del jugador, con la MISMA fecha y la MISMA hora que el HUD
lleva quemada en la esquina desde el primer cuadro: 12 MAR 1994, 23:47.
"""

# clave, fecha en pantalla, hora, y las lineas
CINTAS = [
 dict(ck='c1', fecha='10·03·1994', hora='23:40', voz='madre', lineas=dict(
   es=['Diez de marzo. Segunda noche sin luz.',
       'Se oye abajo. No es el agua.',
       'Mañana llamo a la empresa. Hoy no bajo.'],
   en=['March tenth. Second night without power.',
       'You can hear it downstairs. It is not the water.',
       'I will call the company tomorrow. I am not going down today.'],
   pt=['Dez de março. Segunda noite sem luz.',
       'Ouve-se lá embaixo. Não é a água.',
       'Amanhã ligo para a empresa. Hoje não desço.'])),
 dict(ck='c2', fecha='11·03·1994', hora='04:12', voz='madre', lineas=dict(
   es=['Vino un hombre de la empresa del agua. Bajó al sótano.',
       'Eso fue a las nueve. No lo vi salir.',
       'La puerta del fondo quedó abierta. La dejo así.'],
   en=['A man from the water company came. He went down to the basement.',
       'That was at nine. I never saw him come out.',
       'The back door was left open. I am leaving it that way.'],
   pt=['Veio um homem da empresa de água. Desceu ao porão.',
       'Isso foi às nove. Não o vi sair.',
       'A porta dos fundos ficou aberta. Deixo assim.'])),
 dict(ck='c3', fecha='12·03·1994', hora='07:05', voz='madre', lineas=dict(
   es=['Nos vamos hoy. El bolso está en la puerta.',
       'Falta uno. No contesta, y la camioneta ya está cargada.',
       'Si estás en la casa: salí por el fondo. No bajes.'],
   en=['We are leaving today. The bag is by the door.',
       'One of us is missing. No answer, and the truck is already loaded.',
       'If you are in the house: go out the back. Do not go down.'],
   pt=['Vamos embora hoje. A bolsa está na porta.',
       'Falta um. Não atende, e a caminhonete já está carregada.',
       'Se você está na casa: saia pelos fundos. Não desça.'])),
 dict(ck='c4', fecha='12·03·1994', hora='23:47', voz='hijo', lineas=dict(
   es=['Veintitrés cuarenta y siete. Doce de marzo.',
       'Están llamándome desde afuera. Los oigo en la calle.',
       'Bajé a cerrar la llave de paso. El agua ya pasó el segundo escalón.',
       'No subí.'],
   en=['Eleven forty-seven at night. March twelfth.',
       'They are calling me from outside. I can hear them in the street.',
       'I went down to shut the stopcock. The water is past the second step.',
       'I never came back up.'],
   pt=['Vinte e três e quarenta e sete. Doze de março.',
       'Estão me chamando lá fora. Ouço eles na rua.',
       'Desci para fechar o registro. A água já passou o segundo degrau.',
       'Não subi.'])),
]
IDIOMAS = ['es', 'en', 'pt']


# ── pedido y horneado ────────────────────────────────────────────────────────
if __name__ == '__main__':
    import io, json, os, subprocess, sys
    AQUI = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(AQUI, '..', 'rezona'))
    import rz
    # EL PROYECTO NO SE ESCRIBE A MANO: se busca por nombre y se crea si no
    # esta. Con el id clavado, borrar el balde desde la app deja todas las
    # llamadas contestando PROJECT_NOT_FOUND — ya paso una vez.
    from balde import balde
    PROY = balde()
    TAR = os.path.join(AQUI, 'tareas_voz.json')

    def clave(c, i): return '%s_%s' % (c['ck'], i)

    if '--pedir' in sys.argv:
        ll = []
        for c in CINTAS:
            for i in IDIOMAS:
                ll.append(('submit_audio_generation', {
                    'project_id': PROY, 'kind': 'speech', 'output_format': 'mp3',
                    'prompt': ' '.join(c['lineas'][i]),
                    'output_path': 'assets/voz_%s.mp3' % clave(c, i)}))
        res = rz.sesion(ll, espera=900)
        t, k = {}, [clave(c, i) for c in CINTAS for i in IDIOMAS]
        for n, r in zip(k, res):
            s = rz.texto(r)
            try: tid = json.loads(s).get('task_id')
            except Exception: tid = None
            t[n] = tid
            print('%-8s %s' % (n, tid or s[:110]))
        io.open(TAR, 'w', encoding='utf8').write(json.dumps(t, indent=1))

    elif '--pegar' in sys.argv:
        # EL TEXTO Y LA VOZ SALEN DE LA MISMA TABLA. Con dos listas, lo que se lee
        # y lo que se escucha terminan diciendo cosas distintas el dia que se
        # corrija una linea — y nadie se entera hasta jugarlo en el otro idioma.
        JU = os.path.join(AQUI, '..', '..', 'juegos-pc', 'Casa_Abandonada.html')
        meta = ',\n'.join("{ck:'%s',fecha:'%s',hora:'%s'}" % (c['ck'], c['fecha'], c['hora'])
                          for c in CINTAS)
        tx = []
        for i in IDIOMAS:
            filas = ',\n  '.join("%s:[%s]" % (c['ck'], ','.join(
                json.dumps(l, ensure_ascii=False) for l in c['lineas'][i])) for c in CINTAS)
            tx.append('%s:{\n  %s}' % (i, filas))
        cuerpo = ('const CINTA_META=[\n%s];\nconst CINTA_TX={\n%s};\n'
                  % (meta, ',\n'.join(tx)))
        A, B = '/*<<UI_CINTAS>>*/', '/*<</UI_CINTAS>>*/'
        s = io.open(JU, encoding='utf8').read()
        if A not in s: raise SystemExit('faltan las marcas %s' % A)
        a, b = s.index(A), s.index(B) + len(B)
        io.open(JU, 'w', encoding='utf8').write(s[:a] + A + '\n' + cuerpo + B + s[b:])
        print('pegadas %d cintas x %d idiomas' % (len(CINTAS), len(IDIOMAS)))

    elif '--bajar' in sys.argv:
        t = json.load(io.open(TAR, encoding='utf8'))
        r = rz.sesion([('check_generation_tasks',
                        {'task_ids': [v for v in t.values() if v],
                         'project_id': PROY})], espera=240)
        d = {it['task_id']: it for it in json.loads(rz.texto(r[0]))['items']}
        os.makedirs('voz', exist_ok=True)
        for n, tid in t.items():
            it = d.get(tid, {})
            if it.get('status') != 'ready':
                print('%-8s %s' % (n, it.get('status', '?'))); continue
            dst = os.path.join('voz', n + '.mp3')
            subprocess.run(['curl', '-sSL', '-o', dst, it['public_url']], check=True)
            print('%-8s %7d bytes' % (n, os.path.getsize(dst)))

    elif '--rehacer' in sys.argv:
        # LOS CLIPS NO SALEN TODOS DEL MISMO MODELO. Medido: 5 de 12 volvieron a
        # 8-9 s (unos 14 caracteres por segundo, o sea habla normal) y 7 a 28-39 s
        # (4 car/s), y esos siete vienen ademas a otro muestreo. El servidor
        # reparte entre backends y no dice cual uso, asi que la unica palanca es
        # volver a pedir los largos.
        quienes = sys.argv[sys.argv.index('--rehacer') + 1].split(',')
        t = json.load(io.open(TAR, encoding='utf8'))
        idx = {clave(c, i): (c, i) for c in CINTAS for i in IDIOMAS}
        ll = []
        for n in quienes:
            c, i = idx[n]
            ll.append(('submit_audio_generation', {
                'project_id': PROY, 'kind': 'speech', 'output_format': 'mp3',
                'prompt': ' '.join(c['lineas'][i]),
                'output_path': 'assets/voz_%s.mp3' % n}))
        for n, r in zip(quienes, rz.sesion(ll, espera=900)):
            s = rz.texto(r)
            try: t[n] = json.loads(s).get('task_id')
            except Exception: pass
            print('%-8s %s' % (n, t.get(n) or s[:110]))
        io.open(TAR, 'w', encoding='utf8').write(json.dumps(t, indent=1))
