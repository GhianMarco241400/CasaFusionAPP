// src/hooks/useSonidosComanda.ts
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

const SONIDO_NUEVA = require('../../assets/sounds/comanda_nueva.wav');
const SONIDO_EDITADA = require('../../assets/sounds/comanda_editada.wav');

type TipoSonido = 'nueva' | 'editada';

export function useSonidosComanda(habilitado: boolean) {
  const nueva = useAudioPlayer(SONIDO_NUEVA);
  const editada = useAudioPlayer(SONIDO_EDITADA);
  const ultimo = useRef<{ tipo: TipoSonido; id: string; en: number } | null>(
    null,
  );

  const reproducir = useCallback(
    (tipo: TipoSonido, id: string) => {
      if (!habilitado || AppState.currentState !== 'active') return;

      const ahora = Date.now();
      const anterior = ultimo.current;
      if (anterior && anterior.id === id && ahora - anterior.en < 1500) {
        return;
      }
      ultimo.current = { tipo, id, en: ahora };

      const player = tipo === 'nueva' ? nueva : editada;
      void player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {});
    },
    [habilitado, nueva, editada],
  );

  const reproducirNueva = useCallback(
    (id: string) => reproducir('nueva', id),
    [reproducir],
  );
  const reproducirEditada = useCallback(
    (id: string) => reproducir('editada', id),
    [reproducir],
  );

  return { reproducirNueva, reproducirEditada };
}
