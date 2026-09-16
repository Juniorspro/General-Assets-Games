# -*- coding: utf-8 -*-
"""Eco cambia de juego: ya no hay enigmas, hay LLAVES y algo que te persigue.

Las cuatro reglas nuevas, que son las que pidio el usuario:
  1. NADA se ve si no usas la voz. Los pasos, el salto y la caida siguen SONANDO
     (y la cosa los oye) pero ya no mandan onda: no dibujan el laberinto.
  2. Hay dos voces. HABLAR (Q) ve poco y se oye poco, y se puede usar casi seguido.
     GRITAR (E) ve lejisimos y se oye lejisimos, y cuesta cuatro segundos.
  3. Hay que andar callado: lo que la cosa oye es EXACTAMENTE lo que vos ves.
     Ese es el trato del juego y ahora es una sola cuenta, no dos tablas distintas.
  4. Se sale juntando las cuatro llaves, una en cada sala. Una llave CONTESTA:
     cuando tu onda la toca, suena — y recien ahi la flecha sabe donde esta.

EL GUARDA DEL PARCHE es `if b in s: saltar` y NADA MAS. La version
`if b in s and a not in s` se vuelve a aplicar cuando el texto nuevo contiene al
viejo, que es el caso normal, y deja el archivo con todo duplicado.
"""
import io, re, sys

RUTA = 'juegos-pc/Eco.html'
s = io.open(RUTA, encoding='utf-8').read()
ORIG = len(s)
hechos, saltados = [], []

def cam(a, b, marca):
    """cambia a->b una sola vez. `marca` es lo que se busca para saber si ya esta."""
    global s
    if marca in s:
        saltados.append(marca[:48]); return
    if a not in s:
        print('NO ESTA:', repr(a[:90])); sys.exit(1)
    if s.count(a) != 1:
        print('APARECE %d VECES:' % s.count(a), repr(a[:90])); sys.exit(1)
    s = s.replace(a, b, 1)
    hechos.append(marca[:48])

def corte(desde, hasta, nuevo, marca):
    """reemplaza todo el tramo entre dos anclas (la de arriba entra, la de abajo no)."""
    global s
    if marca in s:
        saltados.append(marca[:48]); return
    i = s.find(desde); j = s.find(hasta)
    if i < 0 or j < 0 or j <= i:
        print('TRAMO NO ESTA:', repr(desde[:70]), repr(hasta[:70])); sys.exit(1)
    s = s[:i] + nuevo + s[j:]
    hechos.append(marca[:48])

# ============================================================ 1. LOS TEXTOS
cam(
""" f1t:{en:'The noise', es:'El ruido', pt:'O ruído'},""",
""" f1t:{en:'The voice', es:'La voz', pt:'A voz'},""",
"f1t:{en:'The voice'")

cam(
""" f1b:{en:'Nothing is visible unless you make noise. Every step sends a wave, and the <b>stripes</b> draw the stone for an instant. <b>Shout</b> and everything lights up for two seconds.',
      es:'Nada se ve si no hacés ruido. Cada paso manda una onda y las <b>rayas</b> te dibujan la piedra por un instante. <b>Gritá</b> y se enciende todo dos segundos.',
      pt:'Nada se vê se você não fizer barulho. Cada passo manda uma onda e as <b>listras</b> desenham a pedra por um instante. <b>Grite</b> e tudo acende por dois segundos.'},""",
""" f1b:{en:'Your feet do not light anything. <b>Only your voice does.</b> <b>Talk</b> and you see one room for a moment; <b>shout</b> and the whole maze lights up for two seconds.',
      es:'Los pies no encienden nada. <b>Solo la voz.</b> <b>Hablá</b> y ves una sala por un momento; <b>gritá</b> y se te enciende el laberinto entero dos segundos.',
      pt:'Os pés não acendem nada. <b>Só a voz.</b> <b>Fale</b> e vê uma sala por um instante; <b>grite</b> e o labirinto inteiro acende por dois segundos.'},""",
"f1b:{en:'Your feet do not light")

cam(
""" f2t:{en:'The silence', es:'El silencio', pt:'O silêncio'},""",
""" f2t:{en:'Something hears you', es:'Algo te oye', pt:'Algo te ouve'},""",
"f2t:{en:'Something hears you'")

cam(
""" f2b:{en:'<b>Crouched you make no noise</b>: you move blind, but nothing hears you. And something does hear: there is <b>a thing</b> down here that hunts by sound. Running saves you; shouting brings it.',
      es:'<b>Agachado no hacés ruido</b>: te movés a ciegas, pero nada te oye. Y algo te oye: hay <b>una cosa</b> ahí abajo que caza por el ruido. Correr te salva; gritar la trae.',
      pt:'<b>Agachado você não faz barulho</b>: anda às cegas, mas nada te ouve. E algo ouve: há <b>uma coisa</b> aí embaixo que caça pelo som. Correr te salva; gritar a traz.'},""",
""" f2b:{en:'There is <b>a thing</b> down here and it hunts by sound. It hears exactly as far as you see: a shout shows you the maze and hands it your address. <b>Crouched you are almost silent</b> — blind, but almost silent.',
      es:'Hay <b>una cosa</b> acá abajo y caza por el ruido. Oye exactamente lo mismo que vos ves: un grito te muestra el laberinto y le da tu dirección. <b>Agachado casi no hacés ruido</b> — a ciegas, pero casi mudo.',
      pt:'Há <b>uma coisa</b> aqui embaixo e ela caça pelo som. Ouve exatamente o quanto você vê: um grito te mostra o labirinto e dá o seu endereço a ela. <b>Agachado você é quase mudo</b> — às cegas, mas quase mudo.'},""",
"f2b:{en:'There is <b>a thing</b> down here and it hunts")

cam(
""" f3t:{en:'The pages', es:'Las hojas', pt:'As folhas'},""",
""" f3t:{en:'The four keys', es:'Las cuatro llaves', pt:'As quatro chaves'},""",
"f3t:{en:'The four keys'")

cam(
""" f3b:{en:'Follow the <b>red marks</b> on the floor. They lead to written pages, and the pages explain the <b>four riddles</b>. The exit will not open without the four seals.',
      es:'Seguí las <b>marcas rojas</b> del suelo. Llevan a hojas escritas, y las hojas explican los <b>cuatro enigmas</b>. La salida no abre sin los cuatro sellos.',
      pt:'Siga as <b>marcas vermelhas</b> do chão. Levam a folhas escritas, e as folhas explicam os <b>quatro enigmas</b>. A saída não abre sem os quatro selos.'},""",
""" f3b:{en:'There are <b>four keys</b>, one in each of the four big rooms. A key <b>answers</b> when your voice reaches it: shout, wait, and if something rings you know where to go. Four keys open the door.',
      es:'Hay <b>cuatro llaves</b>, una en cada una de las cuatro salas grandes. La llave <b>contesta</b> cuando tu voz llega hasta ella: gritá, esperá, y si algo suena ya sabés para dónde ir. Cuatro llaves abren la puerta.',
      pt:'Há <b>quatro chaves</b>, uma em cada uma das quatro salas grandes. A chave <b>responde</b> quando sua voz chega até ela: grite, espere, e se algo soar você já sabe para onde ir. Quatro chaves abrem a porta.'},""",
"f3b:{en:'There are <b>four keys</b>")

cam(
""" cine2:{en:'Here you do not see. You hear. Every noise you make draws the walls for one second, and then the black comes back.',
        es:'Acá no se ve. Se oye. Cada ruido que hacés dibuja las paredes por un segundo, y después vuelve el negro.',
        pt:'Aqui não se vê. Se ouve. Cada barulho que você faz desenha as paredes por um segundo, e depois volta o preto.'},""",
""" cine2:{en:'Here you do not see. You hear. Your voice draws the walls for a second, and then the black comes back. Your feet draw nothing.',
        es:'Acá no se ve. Se oye. Tu voz dibuja las paredes por un segundo, y después vuelve el negro. Tus pies no dibujan nada.',
        pt:'Aqui não se vê. Se ouve. Sua voz desenha as paredes por um segundo, e depois volta o preto. Seus pés não desenham nada.'},""",
"cine2:{en:'Here you do not see. You hear. Your voice")

cam(
""" cine3:{en:'But you are not the only one listening. Something walks toward every noise you make.',
        es:'Pero no sos el único que escucha. Algo camina hacia cada ruido que hacés.',
        pt:'Mas você não é o único que escuta. Algo caminha na direção de cada barulho que você faz.'},""",
""" cine3:{en:'But you are not the only one listening. Something walks toward every noise you make, and it never gets tired.',
        es:'Pero no sos el único que escucha. Algo camina hacia cada ruido que hacés, y no se cansa nunca.',
        pt:'Mas você não é o único que escuta. Algo caminha na direção de cada barulho que você faz, e nunca se cansa.'},""",
"cine3:{en:'But you are not the only one listening. Something walks toward every noise you make, and it never")

cam(
""" cine4:{en:'There are written pages on the walls. Someone was here before you. Someone tried to get out.',
        es:'En las paredes hay hojas escritas. Alguien estuvo antes que vos. Alguien quiso salir.',
        pt:'Nas paredes há folhas escritas. Alguém esteve aqui antes de você. Alguém quis sair.'},""",
""" cine4:{en:'The door has four locks. There are four keys, one in each big room, and they ring when you call to them. Call quietly.',
        es:'La puerta tiene cuatro cerraduras. Hay cuatro llaves, una en cada sala grande, y suenan cuando las llamás. Llamalas bajito.',
        pt:'A porta tem quatro fechaduras. Há quatro chaves, uma em cada sala grande, e elas soam quando você as chama. Chame baixinho.'},""",
"cine4:{en:'The door has four locks")

# ---- HUD, botones y teclas ----
cam(
""" hAgachado:{en:'CROUCHED · NO NOISE', es:'AGACHADO · SIN RUIDO', pt:'AGACHADO · SEM BARULHO'},""",
""" hAgachado:{en:'CROUCHED · ALMOST SILENT', es:'AGACHADO · CASI MUDO', pt:'AGACHADO · QUASE MUDO'},
 hOye:{en:'IT HEARS YOU {n} m AWAY', es:'TE OYE A {n} m', pt:'TE OUVE A {n} m'},""",
"hAgachado:{en:'CROUCHED · ALMOST SILENT'")

cam(
""" bGritar:{en:'SHOUT', es:'GRITAR', pt:'GRITAR'},""",
""" bGritar:{en:'SHOUT', es:'GRITAR', pt:'GRITAR'},
 bHablar:{en:'TALK', es:'HABLAR', pt:'FALAR'},""",
"bHablar:{en:'TALK'")

cam(
""" kGritar:{en:'shout', es:'gritar', pt:'gritar'},""",
""" kGritar:{en:'shout · you see far, it hears far', es:'gritar · ves lejos, te oye lejos', pt:'gritar · vê longe, ela ouve longe'},
 kHablar:{en:'talk · you see one room', es:'hablar · ves una sala', pt:'falar · vê uma sala'},""",
"kHablar:{en:'talk · you see one room'")

cam(
""" kAgachar:{en:'crouch · no noise', es:'agacharse · sin ruido', pt:'agachar · sem barulho'},""",
""" kAgachar:{en:'crouch · almost silent', es:'agacharse · casi mudo', pt:'agachar · quase mudo'},""",
"kAgachar:{en:'crouch · almost silent'")

cam(
""" kSaltar:{en:'jump · stomp the floor', es:'saltar · golpear el piso', pt:'pular · bater no chão'},""",
""" kSaltar:{en:'jump · it makes a lot of noise', es:'saltar · hace mucho ruido', pt:'pular · faz muito barulho'},""",
"kSaltar:{en:'jump · it makes a lot of noise'")

# ---- avisos, sellos y objetivo: se cambian los que hablan de enigmas ----
corte(
""" /* avisos */
 aOyo:""",
""" /* nombres de los sellos */""",
""" /* avisos */
 aLlaveSuena:{en:'A KEY ANSWERED · FOLLOW THE ARROW', es:'UNA LLAVE CONTESTÓ · SEGUÍ LA FLECHA', pt:'UMA CHAVE RESPONDEU · SIGA A SETA'},
 aLlaveTomada:{en:'KEY', es:'LLAVE', pt:'CHAVE'},
 aPared:{en:'SOMETHING IS ON THIS WALL · {n}/{m}', es:'ALGO HAY EN LA PARED · {n}/{m}', pt:'HÁ ALGO NA PAREDE · {n}/{m}'},
 aObjetivo:{en:'NEW OBJECTIVE', es:'OBJETIVO NUEVO', pt:'NOVO OBJETIVO'},
 aEscucha:{en:'LISTEN · THERE IS A PAGE RIGHT HERE', es:'ESCUCHÁ · HAY UNA NOTA ACÁ AL LADO', pt:'ESCUTE · HÁ UMA FOLHA BEM AQUI'},
 aDesperto:{en:'SOMETHING WOKE UP', es:'ALGO SE DESPERTÓ', pt:'ALGO ACORDOU'},
 aAgarro:{en:'IT CAUGHT YOU', es:'TE AGARRÓ', pt:'ELA TE PEGOU'},
 aSaliste:{en:'YOU GOT OUT · {t}', es:'SALISTE · {t}', pt:'VOCÊ SAIU · {t}'},
 aSellada:{en:'LOCKED · {n}/4 KEYS', es:'CERRADA · {n}/4 LLAVES', pt:'TRANCADA · {n}/4 CHAVES'},
""",
"aLlaveSuena:{en:'A KEY ANSWERED")

corte(
""" /* nombres de los sellos */
 sTambores:""",
""" /* bandas */""",
""" /* nombres de las hojas y de las llaves */
 sLlave:{en:'A KEY', es:'UNA LLAVE', pt:'UMA CHAVE'},
 sSalida:{en:'THE DOOR', es:'LA PUERTA', pt:'A PORTA'},
 sPrimero:{en:'FIRST OF ALL · IN HANDWRITING', es:'LO PRIMERO · DE PUÑO Y LETRA', pt:'ANTES DE TUDO · DE PRÓPRIO PUNHO'},
 sVoz:{en:'ON THE VOICE', es:'SOBRE LA VOZ', pt:'SOBRE A VOZ'},
 sQuieto:{en:'ON WALKING QUIETLY', es:'SOBRE ANDAR CALLADO', pt:'SOBRE ANDAR CALADO'},
 sCosa:{en:'ON THE THING', es:'SOBRE LA COSA', pt:'SOBRE A COISA'},
 sLlaves:{en:'ON THE FOUR KEYS', es:'SOBRE LAS CUATRO LLAVES', pt:'SOBRE AS QUATRO CHAVES'},
""",
"sLlave:{en:'A KEY'")

corte(
""" /* bandas */
 banda1:""",
""" /* cartel de la hoja */""",
""" /* objetivo */
 oLlave:{en:'A KEY ANSWERED · <em>go get it</em>', es:'UNA LLAVE CONTESTÓ · <em>andá a buscarla</em>', pt:'UMA CHAVE RESPONDEU · <em>vá buscá-la</em>'},
 oLlaveS:{en:'{n} still missing · the arrow points at the one you heard', es:'faltan {n} · la flecha apunta a la que oíste', pt:'faltam {n} · a seta aponta para a que você ouviu'},
 oBuscar:{en:'FIND THE KEYS · <em>shout</em> and listen for an answer', es:'BUSCÁ LAS LLAVES · <em>gritá</em> y escuchá si contestan', pt:'PROCURE AS CHAVES · <em>grite</em> e escute se responderem'},
 oBuscarS:{en:'{n} of 4 · one in each big room · a shout reaches much further than a word', es:'{n} de 4 · una en cada sala grande · el grito llega mucho más lejos que hablar', pt:'{n} de 4 · uma em cada sala grande · o grito chega muito mais longe que falar'},
 oAbierta:{en:'THE DOOR IS OPEN', es:'LA PUERTA ESTÁ ABIERTA', pt:'A PORTA ESTÁ ABERTA'},
 oAbiertaS:{en:'it pulses every time you use your voice · head for it', es:'late cada vez que usás la voz · andá para allá', pt:'pulsa cada vez que você usa a voz · vá para lá'},
 oSaliste:{en:'YOU GOT OUT', es:'SALISTE', pt:'VOCÊ SAIU'},
""",
"oLlave:{en:'A KEY ANSWERED")

# ---- el tutorial ----
corte(
""" /* tutorial */
 t0:""",
"""};
/* SE LLAMA TX Y NO t A PROPOSITO.""",
""" /* tutorial */
 t0:{en:'MOVE', es:'MOVETE', pt:'ANDE'},
 t0s:{en:'there is no light, and your footsteps do not light anything either', es:'no hay luz, y tus pasos tampoco encienden nada', pt:'não há luz, e seus passos também não acendem nada'},
 t0kPC:{en:'W A S D', es:'W A S D', pt:'W A S D'},
 t0kMov:{en:'drag the joystick', es:'arrastrá el joystick', pt:'arraste o joystick'},
 t1:{en:'NOW TALK', es:'AHORA HABLÁ', pt:'AGORA FALE'},
 t1s:{en:'your voice is the only light there is · talking shows you the room you are in', es:'la voz es la única luz que hay · hablando ves la sala en la que estás', pt:'a voz é a única luz que existe · falando você vê a sala onde está'},
 t1kPC:{en:'Q', es:'Q', pt:'Q'},
 t1kMov:{en:'the TALK button', es:'el botón HABLAR', pt:'o botão FALAR'},
 t2:{en:'NOW SHOUT', es:'AHORA GRITÁ', pt:'AGORA GRITE'},
 t2s:{en:'a shout lights the whole maze · and the thing hears it just as far', es:'un grito enciende el laberinto entero · y la cosa lo oye igual de lejos', pt:'um grito acende o labirinto inteiro · e a coisa ouve igualmente longe'},
 t2kMov:{en:'the SHOUT button', es:'el botón GRITAR', pt:'o botão GRITAR'},
 t3:{en:'LISTEN AFTER YOU SHOUT', es:'ESCUCHÁ DESPUÉS DE GRITAR', pt:'ESCUTE DEPOIS DE GRITAR'},
 t3s:{en:'if a key is within reach it rings back · then the arrow knows where it is · go and take it', es:'si una llave queda al alcance, contesta sonando · ahí la flecha ya sabe dónde está · andá y agarrala', pt:'se uma chave estiver ao alcance, ela responde soando · aí a seta já sabe onde está · vá e pegue'},
 t4:{en:'FOUR KEYS AND THE DOOR OPENS', es:'CUATRO LLAVES Y LA PUERTA ABRE', pt:'QUATRO CHAVES E A PORTA ABRE'},
 t4s:{en:'from here on something is hunting you · crouched you are almost silent, running you outrun it, shouting brings it', es:'de acá en más algo te caza · agachado casi no hacés ruido, corriendo le ganás, gritando la traés', pt:'daqui em diante algo te caça · agachado você é quase mudo, correndo você ganha, gritando você a traz'}
};
/* SE LLAMA TX Y NO t A PROPOSITO.""",
"t1:{en:'NOW TALK'")

# ============================================================ 2. LAS SEIS HOJAS
corte(
"""const HOJAS={
 n0:""",
"""};

/* ===================== QUE APARATO ES ESTE =====================""",
"""const HOJAS={
 n0:{en:'There is no light down here. There never was, so stop looking for it.<br>'+
        'And do not count on your feet: <b>walking lights nothing</b>. You can cross this whole place and never see a single wall.<br>'+
        'What you see is <b>your own voice coming back</b>. <b>Talk</b> and the room you are standing in draws itself for a moment. <b>Shout</b> and the whole maze does, for two seconds.<br>'+
        'The door at the end has four locks. There are <b>four keys</b>, one in each of the big rooms.<br>'+
        'And read the next pages before you shout again. There is a reason I stopped shouting.',
     es:'No hay luz acá abajo. Nunca hubo, y no la busques.<br>'+
        'Y no cuentes con los pies: <b>caminar no enciende nada</b>. Podés cruzar todo esto entero y no ver una sola pared.<br>'+
        'Lo que ves es <b>tu propia voz que vuelve</b>. <b>Hablá</b> y la sala en la que estás se dibuja un momento. <b>Gritá</b> y se dibuja el laberinto entero, dos segundos.<br>'+
        'La puerta del final tiene cuatro cerraduras. Hay <b>cuatro llaves</b>, una en cada sala grande.<br>'+
        'Y leé las hojas que siguen antes de volver a gritar. Por algo yo dejé de gritar.',
     pt:'Não há luz aqui embaixo. Nunca houve, e não a procure.<br>'+
        'E não conte com os pés: <b>andar não acende nada</b>. Você pode atravessar isto tudo e não ver uma única parede.<br>'+
        'O que você vê é <b>sua própria voz voltando</b>. <b>Fale</b> e a sala onde está se desenha por um instante. <b>Grite</b> e o labirinto inteiro se desenha, por dois segundos.<br>'+
        'A porta do fim tem quatro fechaduras. Há <b>quatro chaves</b>, uma em cada sala grande.<br>'+
        'E leia as folhas seguintes antes de gritar de novo. Por algo eu parei de gritar.'},
 n1:{en:'Two ways of using your voice, and they are not the same tool.<br>'+
        '<b>Talking</b> reaches about fifteen metres. It shows you the room and the doorways out of it, and you can do it again almost right away.<br>'+
        '<b>Shouting</b> reaches forty-six. It is the only way to see the shape of this place — and the only way to find a key that is not in the room with you.<br>'+
        'But a shout costs four seconds of waiting, and it costs something worse, which is on the next page.<br>'+
        'Rule of thumb: <b>talk to walk, shout to look</b>.',
     es:'Dos maneras de usar la voz, y no son la misma herramienta.<br>'+
        '<b>Hablar</b> llega a unos quince metros. Te muestra la sala y por dónde se sale de ella, y podés repetirlo casi enseguida.<br>'+
        '<b>Gritar</b> llega a cuarenta y seis. Es la única forma de ver la forma de este lugar — y la única de encontrar una llave que no esté en tu misma sala.<br>'+
        'Pero el grito cuesta cuatro segundos de espera, y cuesta algo peor, que está en la hoja que sigue.<br>'+
        'Regla: <b>hablá para caminar, gritá para mirar</b>.',
     pt:'Dois jeitos de usar a voz, e não são a mesma ferramenta.<br>'+
        '<b>Falar</b> chega a uns quinze metros. Mostra a sala e por onde se sai dela, e dá para repetir quase em seguida.<br>'+
        '<b>Gritar</b> chega a quarenta e seis. É o único jeito de ver o formato deste lugar — e o único de achar uma chave que não esteja na sua sala.<br>'+
        'Mas o grito custa quatro segundos de espera, e custa algo pior, que está na folha seguinte.<br>'+
        'Regra: <b>fale para andar, grite para olhar</b>.'},
 n2:{en:'It hears exactly as far as you see. That is the whole trade, and once you understand it there is nothing else to learn here.<br>'+
        'A shout shows you forty-six metres of maze and tells it where you are from forty-six metres away. A word shows you fifteen and tells it fifteen.<br>'+
        'Your feet do not light anything, but <b>they are still loud</b>: walking carries fifteen metres, running twenty-four, and a jump landing is the loudest thing you can do down here.<br>'+
        '<b>Crouched you are almost silent</b>: four metres and no more. Blind, slow and safe.<br>'+
        'I crossed the last three rooms crouched, in the dark, counting corners. That is how it is done.',
     es:'Te oye exactamente hasta donde ves. Ese es todo el trato, y cuando lo entendés no queda nada más que aprender acá.<br>'+
        'Un grito te muestra cuarenta y seis metros de laberinto y le dice dónde estás desde cuarenta y seis metros. Una palabra te muestra quince y le dice quince.<br>'+
        'Los pies no encienden nada, pero <b>siguen sonando</b>: caminar llega a quince metros, correr a veinticuatro, y caer de un salto es lo más ruidoso que podés hacer acá abajo.<br>'+
        '<b>Agachado casi no hacés ruido</b>: cuatro metros y nada más. A ciegas, lento y a salvo.<br>'+
        'Las últimas tres salas las crucé agachado, en el negro, contando esquinas. Así se hace.',
     pt:'Ela ouve exatamente até onde você vê. Esse é todo o trato, e quando você entende não sobra mais nada para aprender aqui.<br>'+
        'Um grito te mostra quarenta e seis metros de labirinto e diz onde você está de quarenta e seis metros. Uma palavra mostra quinze e diz quinze.<br>'+
        'Os pés não acendem nada, mas <b>continuam soando</b>: andar chega a quinze metros, correr a vinte e quatro, e cair de um pulo é a coisa mais barulhenta que dá para fazer aqui.<br>'+
        '<b>Agachado você é quase mudo</b>: quatro metros e nada mais. Às cegas, devagar e a salvo.<br>'+
        'As últimas três salas eu atravessei agachado, no escuro, contando esquinas. É assim que se faz.'},
 n3:{en:'I never got a good look at it, and I looked at it more than I wanted to.<br>'+
        'It walks. It does not run at you out of nowhere — it walks toward the last noise it heard, and it keeps walking after you stop making noise, because it remembers where the sound was.<br>'+
        '<b>You are faster than it.</b> Running you get away every time. The problem is that running is loud, so you get away and you tell it where you went.<br>'+
        'What works: make it come to a noise, then <b>crouch and leave in a different direction</b>. It goes to the noise. You are not there any more.<br>'+
        'If it catches you it does not kill you. It throws you back to the entrance. You keep the keys, you lose the walk.',
     es:'Nunca la vi bien, y la miré más de lo que quise.<br>'+
        'Camina. No te salta encima de la nada — camina hacia el último ruido que oyó, y sigue caminando después de que dejaste de hacerlo, porque se acuerda de dónde estaba el sonido.<br>'+
        '<b>Sos más rápido que ella.</b> Corriendo te escapás siempre. El problema es que correr suena, así que te escapás y de paso le decís para dónde fuiste.<br>'+
        'Lo que funciona: hacela venir a un ruido y después <b>agacharte y salir para otro lado</b>. Ella va al ruido. Vos ya no estás ahí.<br>'+
        'Si te agarra no te mata. Te tira de vuelta a la entrada. Las llaves te las quedás; lo que perdés es la caminata.',
     pt:'Nunca a vi direito, e olhei mais do que queria.<br>'+
        'Ela anda. Não pula em cima de você do nada — anda até o último barulho que ouviu, e continua andando depois que você parou, porque lembra onde o som estava.<br>'+
        '<b>Você é mais rápido que ela.</b> Correndo você escapa sempre. O problema é que correr faz barulho, então você escapa e ainda diz para onde foi.<br>'+
        'O que funciona: faça-a vir até um barulho e então <b>agache e saia para outro lado</b>. Ela vai ao barulho. Você já não está lá.<br>'+
        'Se ela te pega, não te mata. Te joga de volta para a entrada. As chaves você mantém; o que perde é a caminhada.'},
 n4:{en:'The keys ring back. That is the only reason I found any of them.<br>'+
        'When your voice reaches a key, the key <b>answers</b> — a short bright ring, a moment after you shout, because the sound has to travel there and back. If you hear it, stop and listen to where it came from.<br>'+
        'Each one sits in the middle of one of the <b>four big rooms</b>, the ones with a column in the centre. Four rooms, four keys.<br>'+
        'So the way to search is not to walk everywhere. It is to walk to somewhere new, <b>shout once</b>, and wait two seconds with your mouth shut.<br>'+
        'And then get out of there, because you just told it where you are standing.',
     es:'Las llaves contestan. Es la única razón por la que encontré alguna.<br>'+
        'Cuando tu voz llega hasta una llave, la llave <b>contesta</b> — un tintineo corto y claro, un momento después de que gritás, porque el sonido tiene que ir y volver. Si lo oís, frená y escuchá de dónde vino.<br>'+
        'Cada una está en el medio de una de las <b>cuatro salas grandes</b>, las que tienen una columna en el centro. Cuatro salas, cuatro llaves.<br>'+
        'Así que buscar no es caminar por todos lados. Es caminar hasta algún lugar nuevo, <b>gritar una vez</b>, y esperar dos segundos con la boca cerrada.<br>'+
        'Y después irte de ahí, porque acabás de decirle dónde estás parado.',
     pt:'As chaves respondem. É a única razão pela qual achei alguma.<br>'+
        'Quando sua voz chega a uma chave, ela <b>responde</b> — um tinido curto e claro, um instante depois do grito, porque o som tem que ir e voltar. Se ouvir, pare e escute de onde veio.<br>'+
        'Cada uma fica no meio de uma das <b>quatro salas grandes</b>, as que têm uma coluna no centro. Quatro salas, quatro chaves.<br>'+
        'Então procurar não é andar por todo lado. É andar até algum lugar novo, <b>gritar uma vez</b>, e esperar dois segundos de boca fechada.<br>'+
        'E depois sair dali, porque você acabou de dizer onde está parado.'},
 n5:{en:'This is where it ends, and this is where I stayed.<br>'+
        'The door has <b>four locks</b> and it does not open with three. The four dots at the top of the screen are the keys: they light up one by one.<br>'+
        'With the four in place the door <b>pulses</b> every time you use your voice, and you feel it from far away. You will know which way to go without looking for it.<br>'+
        'I had three. I shouted at the door because I was angry, and it heard me, and I did not get to look for the fourth.<br>'+
        'Do not shout at the door. Walk to it crouched and quiet, like it is asleep.',
     es:'Acá termina, y acá me quedé.<br>'+
        'La puerta tiene <b>cuatro cerraduras</b> y no se abre con tres. Los cuatro puntos de arriba de la pantalla son las llaves: se van encendiendo de a una.<br>'+
        'Con las cuatro puestas, la puerta <b>late</b> cada vez que usás la voz, y se siente desde lejos. Vas a saber para dónde ir sin buscarla.<br>'+
        'Yo tenía tres. Le grité a la puerta de rabia, y me oyó, y no llegué a buscar la cuarta.<br>'+
        'No le grites a la puerta. Andá hasta ella agachado y callado, como si estuviera dormida.',
     pt:'Aqui termina, e aqui eu fiquei.<br>'+
        'A porta tem <b>quatro fechaduras</b> e não abre com três. Os quatro pontos no alto da tela são as chaves: acendem uma a uma.<br>'+
        'Com as quatro postas, a porta <b>pulsa</b> cada vez que você usa a voz, e se sente de longe. Você vai saber para onde ir sem procurar.<br>'+
        'Eu tinha três. Gritei para a porta de raiva, e ela me ouviu, e não cheguei a procurar a quarta.<br>'+
        'Não grite para a porta. Vá até ela agachado e calado, como se ela estivesse dormindo.'}
};

/* ===================== QUE APARATO ES ESTE =====================""",
"n4:{en:'The keys ring back")

# ============================================================ 3. LAS CUATRO LLAVES
cam(
"""/* ---------- LAS MARCAS EN EL MUNDO, todas en una malla ---------- */""",
"""/* ---------- LAS CUATRO LLAVES ----------
   UNA POR SALA, y las salas ya existian: son los unicos cuatro lugares del laberinto que se leen
   distinto de un pasillo, o sea los unicos donde tiene sentido decir "esta en una habitacion".
   La celda se marca como usada ANTES de construir las marcas, si no un prop puede aparecer plantado
   en el mismo metro cuadrado que la llave.
   La llave NO se ve sola: va con el material del sonido, igual que todo. Lo unico propio es un
   resplandor chico que crece de cerca — sin eso, encontrarla seria pisarla de casualidad, porque en
   el frente de una onda de dos segundos una llave de veinte centimetros no se distingue de una
   piedra. Y como el laberinto se dibuja de verdad, ese resplandor lo tapa cualquier pared: solo se
   ve si la tenes a la vista. */
const LLAVES=[];
(function ponerLlaves(){
  const celdas=[];
  for(const s2 of SALAS){
    /* de las cuatro celdas de la sala, la primera que este libre */
    const cuatro=[[s2[0],s2[1]],[s2[0]+1,s2[1]],[s2[0],s2[1]+1],[s2[0]+1,s2[1]+1]];
    let ele=null;
    for(const c of cuatro) if(libre(c[0],c[1])){ ele=c; break; }
    if(ele) celdas.push(tomar(ele[0],ele[1]));
  }
  /* si el laberinto salio con menos de cuatro salas, se completan con las celdas mas lejanas que
     queden libres: cuatro llaves tiene que haber SIEMPRE, la puerta no abre con tres */
  if(celdas.length<4){
    const resto=[];
    for(let j=0;j<N;j++) for(let i=0;i<N;i++)
      if(libre(i,j) && DIST[j][i]>=3 && !(i===salida[0]&&j===salida[1])) resto.push([i,j]);
    resto.sort((a,b)=>DIST[b[1]][b[0]]-DIST[a[1]][a[0]]);
    for(const c of resto){ if(celdas.length>=4) break; celdas.push(tomar(c[0],c[1])); }
  }
  const pedestales=[];
  celdas.slice(0,4).forEach((cel,k)=>{
    const x=XC(cel[0]), z=ZC(cel[1]);
    /* UN MATERIAL POR LLAVE Y NO UNO COMPARTIDO. Con uno solo, el brillo se calcula por llave y se
       escribe en el mismo sitio: manda la ultima del bucle y las cuatro terminan con el brillo de
       esa. O sea que la llave que tenes al lado se ve apagada si la cuarta esta lejos. */
    const matLlave=new THREE.MeshBasicMaterial({color:0x000000});
    const g=new THREE.Group();
    /* la forma: un anillo, un cuerpo y dos dientes. Con una caja no se lee a llave ni de cerca */
    const aro=new THREE.Mesh(new THREE.TorusGeometry(0.19,0.045,8,16), matLlave);
    aro.position.y=0.20; g.add(aro);
    const cana=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.46,0.055), matLlave);
    cana.position.y=-0.20; g.add(cana);
    for(let d=0;d<2;d++){
      const di=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.05,0.058), matLlave);
      di.position.set(0.085, -0.28-d*0.11, 0); g.add(di);
    }
    g.position.set(x, 1.02, z);
    g.frustumCulled=false;
    escena.add(g);
    /* el pedestal SI va con el material del sonido y fundido con los otros tres: es piedra, y es lo
       que hace que al pasar una onda se lea "hay algo en el medio de esta sala" */
    const pe=new THREE.CylinderGeometry(0.26,0.38,0.70,10,1); pe.translate(x,0.35,z); pedestales.push(pe);
    const pl=new THREE.BoxGeometry(0.62,0.10,0.62); pl.translate(x,0.05,z); pedestales.push(pl);
    OBST.push({x, z, r:0.46});
    LLAVES.push({ k, cel, x, z, g, mat:matLlave, tomada:false, oida:false, giro:Math.random()*6.28 });
  });
  if(pedestales.length){
    const pg=mergeGeometries(pedestales,false);
    for(const q of pedestales) q.dispose();
    const pm=new THREE.Mesh(pg, matMundo); pm.frustumCulled=false; escena.add(pm);
  }
})();
const LLAVE_AGARRA=2.20;      // a que distancia se levanta, ademas de estar en su celda
/* CUANDO UNA ONDA TUYA LLEGA A UNA LLAVE, LA LLAVE CONTESTA.
   Y contesta TARDE, no en el mismo cuadro: el sonido tarda en ir y en volver, y esa demora es la
   informacion. Un tintineo a los tres segundos de gritar quiere decir "veinte metros"; uno inmediato
   quiere decir "la tenes al lado". Sin la demora las cuatro llaves sonarian igual y no diria nada. */
function llavesOyen(x,z,alcance){
  for(const l of LLAVES){
    if(l.tomada) continue;
    const d=Math.hypot(l.x-x, l.z-z);
    if(d > alcance*0.86) continue;
    const era=l.oida;
    l.oida=true;
    const ms=Math.round(2*d/VEL_SONIDO*1000);
    setTimeout(()=>{ if(!l.tomada){ son('llave', Math.max(0.25, 1-d/52));
                                    if(!era) avisar(TX('aLlaveSuena'), 2.2); } }, ms);
  }
}
function llavesTick(dt){
  for(const l of LLAVES){
    if(l.tomada) continue;
    l.giro+=dt*0.9;
    l.g.rotation.y=l.giro;
    l.g.position.y=1.02+Math.sin(l.giro*1.7)*0.045;
    const d=Math.hypot(jug.x-l.x, jug.z-l.z);
    /* el resplandor propio: poco y de cerca. 0,05 de lejos es apenas un punto que se adivina */
    const b=0.05+0.55*Math.max(0, 1-d/8.5)+0.35*eco;
    l.mat.color.setRGB(b*0.98, b*0.86, b*0.52);
    /* SE LEVANTA POR CELDA O POR DISTANCIA, LO QUE PASE PRIMERO.
       Solo por distancia no alcanzaba y se midio: la llave va en el centro de su celda y el pedestal
       frena el cuerpo a 0,80 m, pero una celda mide 4,2 m, asi que cruzarla por el borde te deja a
       2,1 m —y en diagonal a 2,97— y la llave no se levantaba. En un juego a oscuras eso es pasar
       por encima de lo que buscas y no enterarte. Estar en su celda YA cuenta. */
    const c=celdaDe(jug.x,jug.z);
    if(jugando && (d<LLAVE_AGARRA || (c[0]===l.cel[0] && c[1]===l.cel[1]))) tomarLlave(l);
  }
}
function tomarLlave(l){
  if(l.tomada) return;
  l.tomada=true;
  l.g.visible=false;
  sellar(l.k, TX('sLlave'));
}

/* ---------- LAS MARCAS EN EL MUNDO, todas en una malla ---------- */""",
"const LLAVES=[];")

# ---- las seis hojas cambian de titulo: ya no explican enigmas, explican el juego ----
corte(
"""ponerNota([0,0], 'sPrimero', 'n0');""",
"""
/* ===================== LOS RASTROS ROJOS DEL SUELO =====================""",
"""ponerNota([0,0], 'sPrimero', 'n0');
ponerNota(tambores[0].cel, 'sVoz', 'n1');
ponerNota(corredor[0], 'sQuieto', 'n2');
ponerNota(celP3, 'sCosa', 'n3');
ponerNota(celP4, 'sLlaves', 'n4');
ponerNota(salida, 'sSalida', 'n5');
""",
"ponerNota(tambores[0].cel, 'sVoz', 'n1');")

# ============================================================ 4. EL ESTADO Y EL RUIDO
corte(
"""/* ===================== EL ESTADO DE LOS ENIGMAS ===================== */""",
"""/* ===================== EL TUTORIAL Y LA FLECHA =====================""",
"""/* ===================== LAS CUATRO CERRADURAS ===================== */
const SELLOS=[false,false,false,false];
function nSellos(){ return SELLOS.reduce((a,b)=>a+(b?1:0),0); }
function sellar(k,txt){
  if(SELLOS[k]) return;
  SELLOS[k]=true;
  const el=document.getElementById('sellos');
  if(el && el.children[k]) el.children[k].classList.add('on');
  avisar((txt||'')+' · '+nSellos()+'/4', 3.0);
  son('sello');
  /* la llave que levantas SI enciende: es el unico premio visual del juego y dura lo que dura */
  emitir(jug.x, jug.y, jug.z, 1.0, 62);
  matMundo.uniforms.uAbierta.value = nSellos()>=4? 1 : 0;
}
function cerca(x,z,r){ return Math.hypot(jug.x-x, jug.z-z) < r; }

/* EL OBJETIVO DE AHORA MISMO. Tres estados y nada mas, porque el juego tiene tres: no oiste ninguna
   llave todavia, oiste una, o ya estan las cuatro. */
function objetivo(){
  if(ganado) return { t:TX('oSaliste'), s:'' };
  const falta=4-nSellos();
  if(falta<=0) return { t:TX('oAbierta'), s:TX('oAbiertaS') };
  if(LLAVES.some(l=>!l.tomada && l.oida)) return { t:TX('oLlave'), s:TX('oLlaveS',{n:falta}) };
  return { t:TX('oBuscar'), s:TX('oBuscarS',{n:nSellos()}) };
}

/* TODO EL RUIDO PASA POR ACA, y ahora lleva un parametro mas: VER.
   Es LA regla del juego nuevo. Un ruido siempre suena y la cosa siempre lo oye; lo que cambia es si
   ademas ENCIENDE. Los pies, el salto y la caida van con ver=false: se oyen igual que antes —peor,
   porque ahora es lo unico que te delata sin darte nada a cambio— pero no dibujan una sola pared.
   Solo la voz enciende, y por eso ver y ser oido pasaron a ser la misma decision. */
function ruido(tipo,x,y,z,fuerza,alcance,ver){
  const enciende = ver!==false;
  if(enciende) emitir(x,y,z,fuerza,alcance);
  son(tipo, fuerza);
  /* LA COSA OYE POR ALCANCE Y NO POR FUERZA. Es lo que hace que la regla se pueda decir en una
     frase: te oye exactamente hasta donde ves. Con la fuerza no cerraba —una pisada floja tenia
     fuerza 0,55 y la formula vieja le daba veintitres metros de audicion— y el jugador no tiene
     forma de deducir un numero que no ve en ningun lado. */
  cosaOye(x, z, alcance);
  if(!jugando || !enciende) return;
  llavesOyen(x, z, alcance);
  /* las hojas se revelan con la voz. El grito cuenta por tres y las abre de una: llega tres veces
     mas lejos y cuesta cuatro segundos, seria raro que ademas hubiera que repetirlo. Hablando salen
     en tres palabras, que es el precio de la version barata. */
  const peso = (tipo==='grito')? NOTA_GRITOS : 1;
  for(const nt of notas){
    if(nt.abierta || !cerca(nt.x, nt.z, NOTA_ALC)) continue;
    nt.cargas=Math.min(NOTA_GRITOS, nt.cargas+peso);
    if(nt.cargas>=NOTA_GRITOS){ nt.abierta=true; abrirNota(nt); }
    else avisar(TX('aPared',{n:nt.cargas,m:NOTA_GRITOS}), 1.8);
  }
}

""",
"/* ===================== LAS CUATRO CERRADURAS ===================== */")

cam("""  ondasTick(dt);
  corredorTick();
  cosaTick(dt);""",
"""  ondasTick(dt);
  llavesTick(dt);
  cosaTick(dt);""",
"  llavesTick(dt);\n  cosaTick(dt);")

# cerrarNota ya no tiene enigmas que anunciar
cam("""  if(notaAbierta && notaAbierta._nuevo){ notaAbierta._nuevo=false;
    const i=notas.indexOf(notaAbierta);
    if(NOTA_DE[i]!==null && !SELLOS[NOTA_DE[i]]) avisar(TX('aObjetivo'), 2.2);
  }""",
"""  if(notaAbierta && notaAbierta._nuevo){ notaAbierta._nuevo=false;
    if(nSellos()<4) avisar(TX('aObjetivo'), 2.2);
  }""",
"    if(nSellos()<4) avisar(TX('aObjetivo'), 2.2);")

# ============================================================ 5. A DONDE APUNTA LA FLECHA
corte(
"""function objetivoLugar(){""",
"""let guiaCada=0, guiaPos=null;""",
"""function objetivoLugar(){
  if(ganado) return null;
  if(nSellos()>=4) return salidaMundo.clone();
  const c=celdaDe(jug.x,jug.z);
  const D=distancias(MAPA,N,c[0],c[1]);
  /* LA FLECHA SOLO SABE LO QUE VOS SABES. Apunta a una llave unicamente si ya te contesto: si
     apuntara siempre a la mas cercana, buscar sobraria y el juego seria caminar por una flecha.
     Mientras no oiste ninguna apunta a una hoja, que es una pista y no un premio. */
  let mejorL=null, mejorD=1e9;
  for(const l of LLAVES){
    if(l.tomada || !l.oida) continue;
    const d=D[l.cel[1]][l.cel[0]];
    if(d>=0 && d<mejorD){ mejorD=d; mejorL=l; }
  }
  if(mejorL) return new THREE.Vector3(mejorL.x, 1.05, mejorL.z);
  let mejorN=null; mejorD=1e9;
  for(const nt of notas){ if(nt.abierta) continue;
    const d=D[nt.cel[1]][nt.cel[0]];
    if(d>=0 && d<mejorD){ mejorD=d; mejorN=nt; } }
  return mejorN? new THREE.Vector3(mejorN.x, 1.5, mejorN.z) : null;
}
""",
"/* LA FLECHA SOLO SABE LO QUE VOS SABES.")

# ============================================================ 6. LA VOZ: HABLAR Y GRITAR
corte(
"""let gritoT=0, gritoMax=6.0;""",
"""/* ===================== EL SONIDO =====================""",
"""let gritoT=0, gritoMax=6.0;
const GRITO_ESPERA=4.0;
const GRITO_ALC=46, GRITO_F=1.0;
/* HABLAR ES LA OTRA MITAD DEL JUEGO. Con el grito solo, un laberinto a oscuras son cuatro segundos
   de espera por cada paso que das, y eso no es tension, es un semaforo. Hablar cuesta poco mas de un
   segundo y te muestra la sala en la que estas: alcanza para caminar. Lo que NO alcanza es para
   encontrar nada, y ahi esta el dilema — para buscar hay que gritar, y gritar es lo que la trae. */
const HABLA_ESPERA=1.15, HABLA_ALC=15, HABLA_F=0.42;
let hablaT=0;
/* el fogonazo: dos segundos enteros encendido y despues se apaga en medio segundo. Se sostiene
   plano y NO se desvanece de a poco durante los dos segundos: si se desvanece, no se lee como un
   fogonazo, se lee como una onda mas grande.
   Y AHORA TIENE NIVEL. El fogonazo del grito va al 100%; el de hablar, a un cuarto y por un tercio
   de segundo: si hablar diera el mismo destello que gritar, gritar no serviria para nada. */
const FLASH_DURA=2.0, FLASH_APAGA=0.55;
let flashT=0, flash=0, flashNivel=1;
function gritar(){
  if(!jugando||gritoT>0) return;
  gritoMax = GRITO_ESPERA;
  gritoT = gritoMax;
  flashT = FLASH_DURA;  flash = 1;  flashNivel = 1;
  tutoGritos++;
  ruido('grito', jug.x, jug.y, jug.z, GRITO_F, GRITO_ALC);
  avisar('');
}
function hablar(){
  if(!jugando||hablaT>0) return;
  hablaT = HABLA_ESPERA;
  /* NO PISA EL FOGONAZO DEL GRITO. Sin esta guarda, hablar justo despues de gritar bajaba el
     destello del 100% al 26% y apagaba el laberinto en la cara del jugador. */
  if(flashT<=0){ flashNivel=0.26; flashT=0.30; flash=flashNivel; }
  tutoHablas++;
  ruido('voz', jug.x, jug.y, jug.z, HABLA_F, HABLA_ALC);
  avisar('');
}
/* LOS PIES NO ENCIENDEN: el ultimo parametro en false. Y agachado si suena, poquito: antes agachado
   era silencio absoluto, o sea que quedarse agachado era invulnerable y el juego se terminaba ahi.
   Cuatro metros es "solo si la tenes encima". */
function pisada(fuerte, agachado){
  if(agachado) ruido('paso', jug.x, 0.30, jug.z, 0.16, 4.0, false);
  else ruido('paso', jug.x, 0.35, jug.z, fuerte?0.85:0.55, fuerte?24:15, false);
}

""",
"const HABLA_ESPERA=1.15, HABLA_ALC=15, HABLA_F=0.42;")

cam("""  if(flashT>0){ flashT-=dt; flash=1; }""",
    """  if(flashT>0){ flashT-=dt; flash=flashNivel; }""",
    "flashT-=dt; flash=flashNivel;")

cam("""  if(gritoT>0){ gritoT-=dt;
    const aro=document.getElementById('gritoAro');
    if(aro) aro.style.setProperty('--g', (100*(1-gritoT/gritoMax)).toFixed(0)+'%');
  }""",
"""  if(gritoT>0){ gritoT-=dt;
    const aro=document.getElementById('gritoAro');
    if(aro) aro.style.setProperty('--g', (100*(1-gritoT/gritoMax)).toFixed(0)+'%');
  }
  if(hablaT>0){ hablaT-=dt;
    const aro=document.getElementById('hablaAro');
    if(aro) aro.style.setProperty('--g', (100*(1-hablaT/HABLA_ESPERA)).toFixed(0)+'%');
  }""",
"const aro=document.getElementById('hablaAro');")

# ---- los pies, el salto y la caida dejan de encender ----
cam("""    if(cruzo && !jug.agachado) pisada(corriendo);""",
    """    if(cruzo) pisada(corriendo, jug.agachado);""",
    "if(cruzo) pisada(corriendo, jug.agachado);")

cam("""    if(!jug.agachado) ruido('salto', jug.x, 0.45, jug.z, 0.45, 13);""",
    """    ruido('salto', jug.x, 0.45, jug.z, 0.45, jug.agachado? 7 : 13, false);""",
    "ruido('salto', jug.x, 0.45, jug.z, 0.45, jug.agachado? 7 : 13, false);")

cam("""      if(!jug.agachado) ruido('caida', jug.x, 0.25, jug.z, 0.50+0.45*golpe, 16+18*golpe);""",
    """      /* AGACHADO TAMBIEN SUENA AL CAER. Un aterrizaje es un golpe contra la piedra: que
         agacharse lo silenciara convertia el salto en un teletransporte mudo. */
      ruido('caida', jug.x, 0.25, jug.z, 0.50+0.45*golpe, (16+18*golpe)*(jug.agachado?0.55:1), false);""",
    "AGACHADO TAMBIEN SUENA AL CAER")

# ============================================================ 7. LA COSA, QUE AHORA ES EL JUEGO
cam("""const COSA_LENTO=1.55, COSA_CAZA=3.05;   // m/s. Correr son 5,5: siempre se le puede ganar corriendo
const COSA_AGARRA=1.20;                  // a que distancia te alcanza
const COSA_GRACIA=25;                    // segundos de arranque antes de que despierte
const COSA_OYE=30;                       // hasta donde le llega un ruido, en metros""",
"""const COSA_LENTO=1.55, COSA_CAZA=3.30;   // m/s. Correr son 5,5: siempre se le puede ganar corriendo
const COSA_AGARRA=1.20;                  // a que distancia te alcanza
/* DOCE SEGUNDOS Y NO VEINTICINCO. Con veinticinco el juego tenia medio minuto de paseo tranquilo al
   principio, y despues el jugador ya habia aprendido a caminar sin miedo. Ahora aparece apenas se
   termina el tutorial, que es cuando recien sabe hablar y gritar: justo a tiempo para que la primera
   decision que tome ya sea la del juego. */
const COSA_GRACIA=12;
const COSA_OYE=46;                       // el tope: lo que le llega de un grito, o sea lo que ves vos""",
"const COSA_GRACIA=12;")

cam("""function cosaOye(x,z,fuerza){
  if(cosa.estado==='duerme' || cosa.aturdida>0) return;
  const d=Math.hypot(cosa.x-x, cosa.z-z);
  if(d > COSA_OYE*(0.45+0.55*(fuerza||1))) return;
  cosa.meta=[x,z]; cosa.metaCel=celdaDe(x,z); cosa.estado='caza'; cosa.t=0;
}""",
"""/* LO QUE OYE ES EXACTAMENTE LO QUE VES: el alcance del ruido, y punto.
   Agachado 4 m, caminando 15, hablando 15, corriendo 24, un grito 46. Es la unica regla que el
   jugador tiene que llevar en la cabeza, y esta escrita en una hoja del laberinto. */
function cosaOye(x,z,alcance){
  if(cosa.estado==='duerme' || cosa.aturdida>0) return;
  const d=Math.hypot(cosa.x-x, cosa.z-z);
  if(d > Math.min(COSA_OYE, alcance||15)) return;
  cosa.meta=[x,z]; cosa.metaCel=celdaDe(x,z); cosa.estado='caza'; cosa.t=0;
}""",
"function cosaOye(x,z,alcance){")

cam("""  if(!cosa.metaCel || (cosa.estado==='ronda' && cosa.t>9)){
    const i=(Math.random()*N)|0, j=(Math.random()*N)|0;
    if(DIST[j][i]>=0){ cosa.metaCel=[i,j]; cosa.meta=[XC(i),ZC(j)]; cosa.t=0; }
  }""",
"""  if(!cosa.metaCel || (cosa.estado==='ronda' && cosa.t>8)){
    /* EL OLFATO: la mitad de las veces la ronda no es al azar, es hacia una celda a tres o cuatro de
       donde estas. Sin esto, quedarse agachado en un rincon sin hacer un ruido era una partida
       ganada: la cosa se iba a la otra punta y no volvia nunca. Con esto el silencio total te da
       tiempo, que es lo que tiene que dar, pero no te vuelve invisible. */
    let i, j;
    if(Math.random()<0.5){
      const c=celdaDe(jug.x,jug.z);
      i=Math.max(0,Math.min(N-1, c[0]+((Math.random()*9)|0)-4));
      j=Math.max(0,Math.min(N-1, c[1]+((Math.random()*9)|0)-4));
    } else { i=(Math.random()*N)|0; j=(Math.random()*N)|0; }
    if(DIST[j][i]>=0){ cosa.metaCel=[i,j]; cosa.meta=[XC(i),ZC(j)]; cosa.t=0; }
  }""",
"/* EL OLFATO: la mitad de las veces la ronda no es al azar")

# ============================================================ 8. EL SONIDO NUEVO
cam("""    else if(tipo==='sello'){""",
"""    /* LA VOZ HABLADA: el mismo aparato del grito pero corto, mas grave y con la mitad de reverb.
       No es un grito bajito: un grito bajito suena a grito lejano y confunde la distancia. */
    else if(tipo==='voz'){
      const ctx=AUD.ctx, t=ctx.currentTime;
      for(const [fr,q,v] of [[420,3.0,0.30],[900,3.6,0.16]]){
        const src=ctx.createBufferSource(); src.buffer=AUD.ruido; src.loop=true;
        const bq=ctx.createBiquadFilter(); bq.type='bandpass'; bq.Q.value=q;
        bq.frequency.setValueAtTime(fr,t);
        bq.frequency.exponentialRampToValueAtTime(fr*0.86, t+0.22);
        const g=ctx.createGain();
        g.gain.setValueAtTime(0.0001,t);
        g.gain.exponentialRampToValueAtTime(v, t+0.04);
        g.gain.setValueAtTime(v, t+0.10);
        g.gain.exponentialRampToValueAtTime(0.0001, t+0.30);
        src.connect(bq); bq.connect(g); g.connect(AUD.seco);
        const e=ctx.createGain(); e.gain.value=0.7; g.connect(e); e.connect(AUD.envio);
        src.start(t); src.stop(t+0.36);
      }
    }
    /* LA LLAVE QUE CONTESTA: agudo, limpio y con mucha reverb, para que se lea como que vino de
       lejos. Es la unica cosa del juego que suena sola, asi que no se puede parecer a nada mas. */
    else if(tipo==='llave'){ tono(1568,0.9,0.20*f,1.4); tono(2093,0.8,0.11*f,1.4);
                             setTimeout(()=>{ if(AUD.ctx&&AUD.on) tono(2637,0.7,0.06*f,1.5); }, 90); }
    else if(tipo==='sello'){""",
"else if(tipo==='voz'){")

# ============================================================ 9. LOS CONTROLES
cam("""  if(k==='e') gritar();""",
    """  if(k==='e') gritar();
  if(k==='q') hablar();""",
    "if(k==='q') hablar();")

cam("""tocar('bGrito',()=>gritar());""",
    """tocar('bGrito',()=>gritar());
tocar('bHabla',()=>hablar());""",
    "tocar('bHabla',()=>hablar());")

cam("""  <button id="bGrito" class="btn"><span data-i18n="bGritar"></span><div id="gritoAro"></div></button>""",
    """  <button id="bGrito" class="btn"><span data-i18n="bGritar"></span><div id="gritoAro"></div></button>
  <button id="bHabla" class="btn"><span data-i18n="bHablar"></span><div id="hablaAro"></div></button>""",
    'id="bHabla" class="btn"')

cam("""  #bSalto{ right:118px; bottom:30px; width:66px; height:66px; }""",
    """  /* HABLAR VA AL LADO DE GRITAR y no abajo: son la misma accion en dos tamanos, y el pulgar
     derecho tiene que poder ir de una a la otra sin mirar. Mas chico que gritar a proposito. */
  #bHabla{ right:112px; bottom:124px; width:74px; height:74px; font-size:9px; }
  #bSalto{ right:118px; bottom:30px; width:66px; height:66px; }""",
    "#bHabla{ right:112px;")

cam("""  #gritoAro{ position:absolute; inset:-4px; border-radius:50%; pointer-events:none;
    background:conic-gradient(rgba(255,255,255,.34) var(--g,0%), rgba(0,0,0,0) 0); }""",
"""  #gritoAro, #hablaAro{ position:absolute; inset:-4px; border-radius:50%; pointer-events:none;
    background:conic-gradient(rgba(255,255,255,.34) var(--g,0%), rgba(0,0,0,0) 0); }""",
    "#gritoAro, #hablaAro{ position:absolute;")

cam("""    ['C / Ctrl',TX('kAgachar')],['Space',TX('kSaltar')],
    ['E',TX('kGritar')],['F',TX('kLeer')],['Esc',TX('kEsc')]""",
"""    ['C / Ctrl',TX('kAgachar')],['Space',TX('kSaltar')],
    ['Q',TX('kHablar')],['E',TX('kGritar')],['F',TX('kLeer')],['Esc',TX('kEsc')]""",
    "['Q',TX('kHablar')],['E',TX('kGritar')]")

# ============================================================ 10. EL TUTORIAL
corte(
"""let tutoPaso=0, tutoT=0, tutoAndado=0, tutoGritos=0, tutoListo=false;""",
"""function tutoTick(dt){""",
"""let tutoPaso=0, tutoT=0, tutoAndado=0, tutoGritos=0, tutoHablas=0, tutoListo=false;
/* CINCO PASOS Y EL ORDEN IMPORTA: andar (y comprobar que andar NO enciende nada), hablar, gritar,
   escuchar la respuesta de una llave, y recien ahi se suelta la cosa. El paso de la llave tiene una
   salida por tiempo: si el jugador se traba, el tutorial no lo puede dejar encerrado para siempre —
   y como la cosa no aparece hasta que el tutorial termina, trabarse seria quedarse en un juego sin
   juego. */
const TUTO=[
  { t:()=>TX('t0'), s:()=>TX('t0s'), k:()=>plataf==='pc'? TX('t0kPC') : TX('t0kMov'),
    p:()=>Math.min(1, tutoAndado/4), ok:()=>tutoAndado>4 },
  { t:()=>TX('t1'), s:()=>TX('t1s'), k:()=>plataf==='pc'? TX('t1kPC') : TX('t1kMov'),
    p:()=>Math.min(1, tutoHablas/2), ok:()=>tutoHablas>=2 },
  { t:()=>TX('t2'), s:()=>TX('t2s'), k:()=>plataf==='pc'? 'E' : TX('t2kMov'),
    p:()=>Math.min(1, tutoGritos), ok:()=>tutoGritos>0 },
  { t:()=>TX('t3'), s:()=>TX('t3s'), k:()=>'',
    p:()=>Math.min(1, nSellos()? 1 : tutoT/70), ok:()=>nSellos()>0 || tutoT>70 },
  { t:()=>TX('t4'), s:()=>TX('t4s'), k:()=>'',
    p:()=>Math.min(1, tutoT/6), ok:()=>tutoT>6 }
];
""",
"let tutoPaso=0, tutoT=0, tutoAndado=0, tutoGritos=0, tutoHablas=0, tutoListo=false;")

# ============================================================ 11. EL ROTULO DEL RUIDO
cam("""    } else
    ecoEl.textContent = ganado? TX('hSalida') : jug.agachado? TX('hAgachado')
                      : (jug.ruido>0.62? TX('hRuido') : jug.ruido>0.18? TX('hEco') : TX('hSilencio')); }""",
"""    } else if(!ganado && velH>0.30){
      /* EL ROTULO DICE UN NUMERO, no un adjetivo. "RUIDO" no le sirve a nadie para decidir; "te oye
         a 24 m" es la unica lectura con la que se puede elegir entre correr y agacharse. Y es el
         MISMO numero que usa la cosa, no una estimacion: sale de la misma tabla. */
      ecoEl.textContent = TX('hOye', {n: jug.agachado? 4 : (corriendo? 24 : 15)});
    } else
    ecoEl.textContent = ganado? TX('hSalida') : jug.agachado? TX('hAgachado') : TX('hSilencio'); }""",
    "EL ROTULO DICE UN NUMERO, no un adjetivo")

# ============================================================ 12. LOS GANCHOS DE PRUEBA
corte(
"""  /* el estado de los cuatro enigmas, con lo que hace falta para resolverlos desde una prueba */
  enigmas:()=>({""",
"""  rastros:()=>""",
"""  /* las cuatro llaves: donde estan, cuales contestaron y cuales ya levantaste */
  llaves:()=>LLAVES.map(l=>({ k:l.k, cel:l.cel.slice(), pos:[+l.x.toFixed(1),+l.z.toFixed(1)],
                              oida:l.oida, tomada:l.tomada, visible:l.g.visible,
                              brillo:+l.mat.color.r.toFixed(3),
                              dist:+Math.hypot(jug.x-l.x, jug.z-l.z).toFixed(2),
                              sala:SALAS.findIndex(s2=>Math.abs(s2[0]-l.cel[0])<=1 && Math.abs(s2[1]-l.cel[1])<=1) })),
  salas:()=>SALAS.map(s2=>s2.slice()),
  hablar:(respetar)=>{ if(!respetar) hablaT=0; const antes=hablaT; hablar();
                       return {habiaEspera:+antes.toFixed(2), espera:+hablaT.toFixed(2)}; },
  /* UNA PISADA SUELTA. Caminar de verdad durante n cuadros no sirve para medir esto: la zancada es
     una distancia, asi que segun donde arranque la fase puede no caer ni una pisada en el tramo, y
     entonces "la cosa no reacciono" no distingue "no oye" de "no hubo pisada". */
  pisada:(fuerte,agachado)=>{ const a0=ondas.length; pisada(fuerte,agachado);
                              return { ondasDeLuz:ondas.length-a0, cosa:cosa.estado,
                                       dist:+cosa.cerca.toFixed(1) }; },
  /* CUANTO OYE LA COSA DE CADA RUIDO. Es la regla del juego entero en una tabla, y sin poder leerla
     desde una prueba no hay forma de comprobar que "te oye hasta donde ves" sea verdad. */
  alcances:()=>({ agachado:4, caminando:15, hablando:HABLA_ALC, corriendo:24, saltando:13,
                  gritando:GRITO_ALC, tope:COSA_OYE }),
""",
"  llaves:()=>LLAVES.map(l=>({ k:l.k,")

cam("""                sellos:nSellos(), eco:+eco.toFixed(3), flash:+flash.toFixed(3),""",
"""                sellos:nSellos(), eco:+eco.toFixed(3), flash:+flash.toFixed(3),
                llaves:LLAVES.filter(l=>l.tomada).length, oidas:LLAVES.filter(l=>l.oida).length,
                espera:{grito:+gritoT.toFixed(2), habla:+hablaT.toFixed(2)},""",
"llaves:LLAVES.filter(l=>l.tomada).length, oidas:")

cam("""  tutorial:()=>({ paso:tutoPaso, listo:tutoListo, andado:+tutoAndado.toFixed(2), gritos:tutoGritos,""",
"""  tutorial:()=>({ paso:tutoPaso, listo:tutoListo, andado:+tutoAndado.toFixed(2), gritos:tutoGritos,
                  hablas:tutoHablas,""",
"                  hablas:tutoHablas,")

cam("""                bGritar:document.querySelector('#bGrito span').textContent }),""",
"""                bGritar:document.querySelector('#bGrito span').textContent,
                bHablar:document.querySelector('#bHabla span').textContent }),""",
"bHablar:document.querySelector('#bHabla span').textContent })")

# ============================================================ GUARDAR
io.open(RUTA,'w',encoding='utf-8').write(s)
print('CAMBIOS (%d):' % len(hechos))
for h in hechos: print('  +', h)
if saltados:
    print('YA ESTABAN (%d):' % len(saltados))
    for h in saltados: print('  =', h)
print('bytes: %d -> %d' % (ORIG, len(s)))
