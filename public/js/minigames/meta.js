// Metadaten der Minispiele (reine Daten, auch ohne Browser nutzbar)
export const MG_META = [
  { id: 'coinrain', name: 'Münzregen', type: '4p', duel: true, ctl: 'Bewegen', hint: 'Sammle Münzen! Pass auf die Bomben auf.' },
  { id: 'hurdles', name: 'Hürdenlauf', type: '4p', duel: true, ctl: 'A = Springen', hint: 'Renne ins Ziel und spring über die Hürden.' },
  { id: 'mash', name: 'Knopf-Hämmern', type: '4p', duel: true, ctl: 'A so schnell wie möglich', hint: 'Wer am schnellsten drückt, gewinnt.' },
  { id: 'stopwatch', name: 'Stoppuhr', type: '4p', duel: true, ctl: 'A = Stopp', hint: 'Stoppe möglichst genau bei 5,00 Sekunden. Die Uhr verschwindet!' },
  { id: 'icefloor', name: 'Eisplatte', type: '4p', duel: true, ctl: 'Bewegen', hint: 'Die Platten brechen weg. Bleib als Letzter stehen!' },
  { id: 'barrels', name: 'Fass-Ausweichen', type: '4p', duel: true, ctl: 'Bewegen', hint: 'Weiche den rollenden Fässern aus.' },
  { id: 'reaction', name: 'Blitzreaktion', type: '4p', duel: true, ctl: 'A bei GO!', hint: 'Drücke erst, wenn GO! erscheint. Zu früh kostet einen Punkt.' },
  { id: 'tug', name: 'Tauziehen', type: '2v2', duel: false, ctl: 'A hämmern', hint: 'Zieht gemeinsam das Seil auf eure Seite.' },
  { id: 'hockey', name: 'Luft-Hockey', type: '2v2', duel: false, ctl: 'Bewegen', hint: 'Schiebt den Puck ins gegnerische Tor.' },
  { id: 'teamcoins', name: 'Team-Münzjagd', type: '2v2', duel: false, ctl: 'Bewegen', hint: 'Sammelt zusammen mehr Münzen als das andere Team.' },
  { id: 'cannon', name: 'Kanonier', type: '1v3', duel: false, ctl: 'Links/Rechts, A = Schießen', hint: 'Einer schießt, drei weichen aus. Trefft ihr alle?' },
  { id: 'chase', name: 'Monsterjagd', type: '1v3', duel: false, ctl: 'Bewegen', hint: 'Das Monster fängt die drei anderen, bevor die Zeit abläuft.' },
];
export const mgMeta = (id) => MG_META.find((m) => m.id === id);
