#!/usr/bin/env python3
"""MAS GENTE en DUNAS, JUNGLA, VOLCAN y PANTANO. Estos cuatro se hicieron a mano
y tenian tres o cuatro personajes, todos apilados en el campamento: el resto del
mapa estaba desierto. Aca cada uno suma tres, repartidos por los lugares del
guion que no tenian a nadie, con sus lineas en los tres idiomas y su retrato.
DUNAS ademas recibe tres LUGARES NUEVOS para colgarlos.
Uso: python3 parche_npc.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# lugares nuevos que le faltaban a DUNAS (los otros tres ya tenian de sobra)
EXTRA_POI = {
 'dunas': [('esqueleto', 250, 300, 18, 'el esqueleto del camello'),
           ('roquedal', -280, 60, 20, 'el roquedal de sombra'),
           ('salina', 130, -300, 24, 'la salina')],
}

# slug -> [(clave, nombre, lugar, dx, dz, giro, glb, retrato, tipo, [es], [en], [pt])]
GENTE = {
 'dunas': [
  ('yuma', 'YUMA', 'esqueleto', 4.5, 5.0, 2.3, 'npc/viajera.glb', 'joven', 'h',
   ['Este camello se llamaba TORMENTA y era de mi\npadre. Se echó acá hace dos años y no se\nlevantó más.',
    'Le dejo agua igual. Sé que es al reves.\nPero le dejo agua igual.'],
   ['This camel was called STORM and it was my\nfather’s. It lay down here two years ago and\nnever got up.',
    'I still leave water for him. I know it makes\nno sense. But I leave it anyway.'],
   ['Este camelo se chamava TORMENTA e era do meu\npai. Deitou-se aqui há dois anos e não se\nlevantou mais.',
    'Deixo água para ele mesmo assim. Sei que é ao\ncontrário. Mas deixo água mesmo assim.']),
  ('hassan', 'HASSAN', 'roquedal', -4.0, 4.5, 0.6, 'npc/muro.glb', 'viejo', 'h',
   ['A esta hora no se camina. Se espera.\nSentate a la sombra y andá cuando la piedra\nse pueda tocar.',
    'Cuarenta años cruzando y sigo vivo por una\nsola cosa: nunca discutí con el mediodía.'],
   ['You do not walk at this hour. You wait.\nSit in the shade and go when you can touch\nthe stone.',
    'Forty years crossing and I am alive for one\nreason only: I never argued with noon.'],
   ['A esta hora não se caminha. Espera-se.\nSente-se na sombra e vá quando a pedra puder\nser tocada.',
    'Quarenta anos atravessando e sigo vivo por uma\nsó coisa: nunca discuti com o meio-dia.']),
  ('mira', 'MIRA', 'salina', 3.5, -4.5, 3.2, 'npc/viajera.glb', None, 'h',
   ['Junto sal. Cuatro días de raspar para llenar\nun saco, y el saco vale un mes de comida\nen el pueblo.',
    'Acá abajo hubo un lago. Toda esta sal es lo\nque quedó cuando se fue.\n\nPensá el tamaño del lago.'],
   ['I gather salt. Four days of scraping to fill\none sack, and one sack is worth a month of\nfood in the village.',
    'There was a lake down here. All this salt is\nwhat was left when it went.\n\nThink about the size of the lake.'],
   ['Junto sal. Quatro dias raspando para encher\num saco, e o saco vale um mês de comida\nna aldeia.',
    'Aqui embaixo houve um lago. Todo este sal é o\nque sobrou quando ele foi.\n\nPense no tamanho do lago.']),
 ],
 'jungla': [
  ('yara', 'YARA', 'cascada', 5.0, 4.5, 2.5, 'npc/viajera.glb', 'joven', 'h',
   ['Vengo a la cascada a llenar los bidones y a\nescuchar. Con ese ruido no se oye nada más,\ny a veces eso es lo que uno quiere.',
    'Si ves una rana chiquita azul, no la toques.\nEs la más linda y la peor.'],
   ['I come to the falls to fill the cans and to\nlisten. With that noise you cannot hear\nanything else, and sometimes that is the point.',
    'If you see a tiny blue frog, do not touch it.\nIt is the prettiest and the worst.'],
   ['Venho à cachoeira encher os galões e escutar.\nCom esse barulho não se ouve mais nada, e às\nvezes é isso que a gente quer.',
    'Se vir uma rã pequenininha azul, não toque.\nÉ a mais linda e a pior.']),
  ('ubi', 'UBIRAJARA', 'llave4', -4.5, 5.0, 0.5, 'npc/muro.glb', 'viejo', 'h',
   ['Este higuerón tiene más años que el pueblo.\nEmpezó arriba de otro árbol y se lo comió\ndespacio, en doscientos años.',
    'No hay apuro en la selva. Hay paciencia, que\nes otra manera de ganar.'],
   ['This fig is older than the village. It started\non top of another tree and ate it slowly, over\ntwo hundred years.',
    'There is no hurry in the jungle. There is\npatience, which is another way of winning.'],
   ['Esta figueira é mais velha que o povoado.\nComeçou em cima de outra árvore e a comeu\ndevagar, em duzentos anos.',
    'Não há pressa na selva. Há paciência, que é\noutra maneira de ganhar.']),
  ('nauê', 'NAUÊ', 'llave2', 3.5, -4.0, 3.1, 'npc/viajera.glb', None, 'h',
   ['Estoy contando orquídeas. Van ciento nueve\nespecies en esta ladera y sigo encontrando.',
    'Cada una abre una noche sola y para un solo\nbicho. Si el bicho no viene, se cierra y\nchau.\n\nY vienen. Casi siempre vienen.'],
   ['I am counting orchids. One hundred and nine\nspecies on this slope and I keep finding more.',
    'Each opens for one night and for one single\ninsect. If the insect does not come, it closes\nand that is that.\n\nAnd they come. Almost always they come.'],
   ['Estou contando orquídeas. São cento e nove\nespécies nesta encosta e sigo achando.',
    'Cada uma abre uma noite só e para um só\nbicho. Se o bicho não vem, ela fecha e\nadeus.\n\nE vêm. Quase sempre vêm.']),
 ],
 'volcan': [
  ('koa', 'KOA', 'geiseres', 5.5, 4.0, 2.4, 'npc/viajera.glb', 'joven', 'h',
   ['Mido las fumarolas. Cuando el azufre sube y\nel agua baja, en tres días hay colada.',
    'Es el único aviso que da. Tres días.\nSuena poco. Es un montón.'],
   ['I measure the fumaroles. When the sulphur goes\nup and the water goes down, there is lava in\nthree days.',
    'It is the only warning it gives. Three days.\nSounds short. It is a lot.'],
   ['Meço as fumarolas. Quando o enxofre sobe e a\nágua baixa, em três dias há lava.',
    'É o único aviso que dá. Três dias.\nParece pouco. É muito.']),
  ('teva', 'TEVA', 'mirador', -4.5, 5.0, 0.6, 'npc/muro.glb', 'viejo', 'h',
   ['Nací en el pueblo que está debajo de esa\ncolada. Literalmente debajo.',
    'La gente pregunta por qué volvimos a construir\nen el mismo lugar.\n\nPorque la tierra de acá da tres cosechas al\naño y en otro lado ninguna.'],
   ['I was born in the village under that lava\nflow. Literally under it.',
    'People ask why we rebuilt in the same place.\n\nBecause the soil here gives three harvests a\nyear and anywhere else it gives none.'],
   ['Nasci no povoado que está embaixo daquela\nlava. Literalmente embaixo.',
    'As pessoas perguntam por que reconstruímos no\nmesmo lugar.\n\nPorque a terra daqui dá três colheitas ao ano\ne em outro lugar nenhuma.']),
  ('lehua', 'LEHUA', 'vado', 3.5, -4.5, 3.0, 'npc/viajera.glb', None, 'h',
   ['Junto lágrimas de obsidiana: las gotas que\nquedan cuando la lava salta al agua fría.',
    'Se rompen en filos que cortan mejor que el\nacero y peor que nada duran.\n\nAsí es todo lo que hace este cerro.'],
   ['I collect obsidian tears: the drops left when\nlava jumps into cold water.',
    'They break into edges that cut better than\nsteel and last worse than anything.\n\nThat is everything this mountain makes.'],
   ['Junto lágrimas de obsidiana: as gotas que\nsobram quando a lava salta na água fria.',
    'Rompem-se em fios que cortam melhor que o aço\ne duram pior que qualquer coisa.\n\nÉ assim tudo o que este morro faz.']),
 ],
 'pantano': [
  ('taru', 'TARU', 'cruce', 5.0, 4.5, 2.4, 'npc/viajera.glb', 'joven', 'h',
   ['El cruce se pasa por las tablas, no por el\nbarro. El barro de acá agarra el pie y no\nlo suelta.',
    'Perdí una bota el año pasado. Todavía debe\nestar parada ahí abajo, esperándome.'],
   ['You cross on the boards, not through the mud.\nThe mud here grabs a foot and does not let go.',
    'I lost a boot last year. It is probably still\nstanding down there, waiting for me.'],
   ['A passagem se faz pelas tábuas, não pelo lodo.\nO lodo daqui agarra o pé e não solta.',
    'Perdi uma bota no ano passado. Deve estar\nainda de pé lá embaixo, me esperando.']),
  ('oquén', 'OQUÉN', 'cipres', -4.5, 4.5, 0.7, 'npc/muro.glb', 'viejo', 'h',
   ['Este ciprés tiene las raíces afuera del agua\ny el tronco dentro. Al revés de todo.',
    'Lleva cuatrocientos años haciéndolo mal y\nsigue vivo.\n\nHay algo ahí.'],
   ['This cypress has its roots out of the water\nand its trunk in it. Backwards from everything.',
    'It has been doing it wrong for four hundred\nyears and it is still alive.\n\nThere is something in that.'],
   ['Este cipreste tem as raízes fora da água e o\ntronco dentro. Ao contrário de tudo.',
    'Faz quatrocentos anos que faz errado e segue\nvivo.\n\nHá algo aí.']),
  ('imá', 'IMÁ', 'casilla', 5.5, -4.5, 3.2, 'npc/viajera.glb', None, 'h',
   ['Cazo luces. Las de verdad, las que flotan\nsobre el agua a la madrugada.',
    'Se meten al frasco solas si lo dejás abierto\ny quieto. Después las suelto.\n\nNo es para tenerlas. Es para verlas de cerca\nuna vez.'],
   ['I catch lights. The real ones, the ones that\nfloat over the water before dawn.',
    'They go into the jar by themselves if you leave\nit open and still. Then I let them out.\n\nIt is not to keep them. It is to see one up\nclose, once.'],
   ['Caço luzes. As de verdade, as que flutuam\nsobre a água ao amanhecer.',
    'Entram no frasco sozinhas se você o deixa\naberto e quieto. Depois eu as solto.\n\nNão é para tê-las. É para ver de perto\numa vez.']),
 ],
}


def parche(t, slug):
    if slug not in GENTE:
        return t, 'npc(no toca)'
    if '/* MAS GENTE' in t:
        return t, 'npc(ya)'
    msgs = []
    # 1) lugares nuevos donde colgarlos (solo dunas los necesita)
    if slug in EXTRA_POI:
        m = re.search(r"(const POI = \{.*?)\n\};", t, re.S)
        if not m:
            return t, 'npc(POI NO)'
        cuerpo = m.group(1).rstrip()
        if not cuerpo.endswith(','):
            cuerpo += ','
        lin = [cuerpo,
               '  /* LUGARES NUEVOS: el mapa tenia seis paradas y entre una y otra no',
               '     habia nada ni nadie. Estos tres son para desviarse. */']
        for i, (k, x, z, pr, nom) in enumerate(EXTRA_POI[slug]):
            coma = ',' if i < len(EXTRA_POI[slug]) - 1 else ''
            lin.append('  %-11s { x: %5d, z: %5d, pr: %2d }%s   /* %s */'
                       % (k + ':', x, z, pr, coma, nom))
        t = t[:m.start()] + '\n'.join(lin) + '\n};' + t[m.end():]
        msgs.append('poi%d' % len(EXTRA_POI[slug]))

    # 2) las lineas en las tres tablas de idioma
    trozos = re.split(r"\n(es|en|pt): \{ npc: \{", '\n' + t)
    if len(trozos) != 7:
        return t, 'npc(tablas %d)' % (len(trozos) // 2)
    def js(s):
        return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
    nuevo = trozos[0]
    for i in range(3):
        lang, cuerpo = trozos[1 + i * 2], trozos[2 + i * 2]
        extra = []
        for g in GENTE[slug]:
            clave, lineas = g[0], g[9 + i]
            extra.append("  %s: [%s]," % (clave, ',\n    '.join("'%s'" % js(x) for x in lineas)))
        nuevo += '\n%s: { npc: {\n' % lang + '\n'.join(extra) + cuerpo
    t = nuevo.lstrip('\n')
    msgs.append('lineas')

    # 3) los personajes en el mundo, colgados del bloque que ya existe
    lin = ['',
           '/* MAS GENTE: los tres de arriba estaban todos en el campamento y el resto',
           '   del mapa quedaba desierto. Estos van a lugares que no tenian a nadie. */',
           '{']
    for clave, nombre, lugar, dx, dz, giro, glb, retr, tipo, *_ in GENTE[slug]:
        lin.append('  nuevoNPC({ fig: figHumano(0x7a5a3a, 0xd2c09a),')
        lin.append("    x: POI.%s.x + %s, z: POI.%s.z + %s, nombre: '%s', clave: '%s',"
                   % (lugar, dx, lugar, dz, nombre, clave))
        lin.append("    cara: caraNaira,%s"
                   % ((" retrato: AX('retrato/%s.jpg')," % retr) if retr else ''))
        lin.append("    giro: %s, glb: '%s', glbEsc: 1, glbGiro: Math.PI });" % (giro, glb))
    lin.append('}')
    a = 'window.__RECOL = RECOL;'
    if a not in t:
        return t, 'npc[%s] (sin ancla)' % '+'.join(msgs)
    t = t.replace(a, '\n'.join(lin) + '\n' + a, 1)
    msgs.append('gente%d' % len(GENTE[slug]))
    return t, 'npc[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(GENTE))
