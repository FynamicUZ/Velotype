import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CountdownOverlay } from '@/components/ui/CountdownOverlay';
import { TypingArea } from '@/components/TypingArea';
import { MageArena } from '@/components/MageArena';
import { ComboCounter } from '@/components/ComboCounter';
import { SecondaryWeaponSlot } from '@/components/SecondaryWeaponSlot';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGameStore, type BattleMode } from '@/store/useGameStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useMpStore } from '@/store/useMpStore';
import { useTypingEngine, type WordCompletion } from '@/hooks/useTypingEngine';
import { useBotFight } from '@/hooks/useBotFight';
import { useWeaponHotkey } from '@/hooks/useWeaponHotkey';
import { generateWordSequence } from '@/lib/game/wordPool';
import { randomSeed } from '@/lib/utils/seededRandom';
import { getEnemyHP, type EnemyDef } from '@/lib/game/botAI';
import { TRAINING_DUMMY, getEnemyById } from '@/lib/game/enemies';
import { WEAPONS, type WeaponId } from '@/lib/game/secondaryWeapons';
import {
  spriteForHat,
  colorForWand,
  emojiForParticles,
  emojiForWand,
  glowForWand,
} from '@/lib/game/cosmeticAssets';
import type { PeerInfo } from '@/lib/webrtc/types';

interface BattleNavState {
  mode: BattleMode;
  enemyId?: string;
  seed?: number;
  totalWords?: number;
  opponentName?: string;
  opponentMaxHP?: number;
  opponentInfo?: PeerInfo | null;
  equippedWeapon?: WeaponId | null;
}

export default function BattlePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as BattleNavState | null;

  const profile = usePlayerStore((s) => s.profile);
  const consumeWeapon = usePlayerStore((s) => s.consumeWeapon);

  const phase = useGameStore((s) => s.phase);
  const startBattle = useGameStore((s) => s.startBattle);
  const setPhase = useGameStore((s) => s.setPhase);
  const damageOpponent = useGameStore((s) => s.damageOpponent);
  const damageLocal = useGameStore((s) => s.damageLocal);
  const recordWordResult = useGameStore((s) => s.recordWordResult);
  const resetBattle = useGameStore((s) => s.resetBattle);
  const words = useGameStore((s) => s.words);
  const enemy = useGameStore((s) => s.enemy);
  const localHP = useGameStore((s) => s.localHP);
  const opponentEffects = useGameStore((s) => s.opponentEffects);
  const equippedWeapon = useGameStore((s) => s.equippedWeapon);
  const weaponCooldownEndsAt = useGameStore((s) => s.weaponCooldownEndsAt);
  const setWeaponCooldown = useGameStore((s) => s.setWeaponCooldown);
  const triggerWeaponCast = useGameStore((s) => s.triggerWeaponCast);
  const applyOpponentEffect = useGameStore((s) => s.applyOpponentEffect);
  const activateShield = useGameStore((s) => s.activateShield);
  const finishBattleAction = useGameStore((s) => s.finishBattle);

  const mpSend = useMpStore((s) => s.send);
  const mpOnMessage = useMpStore((s) => s.onMessage);
  const mpGoFinished = useMpStore((s) => s.goFinished);
  const mpCleanup = useMpStore((s) => s.cleanup);

  const isMp = navState?.mode === 'mp-ranked' || navState?.mode === 'mp-friend';
  const finishedSentRef = useRef(false);

  const [now, setNow] = useState(performance.now());
  useEffect(() => {
    if (phase !== 'BATTLE') return;
    const id = window.setInterval(() => setNow(performance.now()), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!navState) {
      navigate('/', { replace: true });
      return;
    }
    if (phase !== 'IDLE') return;

    const mode = navState.mode;
    let resolvedEnemy: EnemyDef | null = null;
    let oppMax = navState.opponentMaxHP ?? 200;
    let oppName = navState.opponentName ?? 'Opponent';

    if (mode === 'singleplayer' || mode === 'solo-practice') {
      if (mode === 'solo-practice') {
        resolvedEnemy = TRAINING_DUMMY;
        oppMax = 999_999;
        oppName = TRAINING_DUMMY.name;
      } else if (navState.enemyId) {
        const e = getEnemyById(navState.enemyId);
        if (e) {
          resolvedEnemy = e;
          oppMax = getEnemyHP(e.level, e.kind);
          oppName = e.name;
        }
      }
    }

    const localMaxHP =
      mode === 'singleplayer' ? 100 + profile.level * 20 : 200;

    const seed = navState.seed ?? randomSeed();
    const totalWords =
      navState.totalWords ?? (mode === 'solo-practice' ? 30 : 50);
    const generated = generateWordSequence(seed, {
      totalWords,
      levelOffset: profile.level - 1,
    });

    startBattle({
      mode,
      seed,
      words: generated,
      localMaxHP,
      opponentMaxHP: oppMax,
      enemy: resolvedEnemy,
      opponentName: oppName,
      equippedWeapon: navState.equippedWeapon ?? profile.equippedWeapon,
    });
  }, [navState, phase, profile, startBattle, navigate]);

  const battling = phase === 'BATTLE';

  const handleWordComplete = (c: WordCompletion) => {
    const correctChars = c.failed ? 0 : c.word.text.length;
    const keystrokes = c.failed ? 1 : c.word.text.length;
    recordWordResult(correctChars, keystrokes, c.failed, c.streakAfter);
    if (!c.failed && c.damage > 0) {
      damageOpponent(c.damage);
      if (isMp) {
        mpSend({
          type: 'damage',
          amount: c.damage,
          tier: c.word.tier,
          streak: c.streakAfter,
        });
      }
    }
  };

  const fireWeapon = useCallback(() => {
    if (!battling) return;
    if (!equippedWeapon) return;
    const onCooldown = weaponCooldownEndsAt !== null && performance.now() < weaponCooldownEndsAt;
    if (onCooldown) return;
    const inventoryCount = profile.inventory[equippedWeapon] ?? 0;
    if (inventoryCount <= 0) return;
    if (!consumeWeapon(equippedWeapon)) return;

    const w = WEAPONS[equippedWeapon];
    setWeaponCooldown(performance.now() + w.cooldownMs);
    triggerWeaponCast(equippedWeapon);

    if (equippedWeapon === 'shield') {
      activateShield();
    } else if (equippedWeapon === 'glitch') {
      applyOpponentEffect('glitch', w.effectMs);
    } else if (equippedWeapon === 'letterDrop') {
      applyOpponentEffect('letterDrop', w.effectMs);
    } else if (equippedWeapon === 'slowCurse') {
      applyOpponentEffect('slow', w.effectMs);
    }

    if (isMp && equippedWeapon !== 'shield') {
      mpSend({ type: 'weapon', weaponId: equippedWeapon });
    }
  }, [
    battling,
    isMp,
    mpSend,
    equippedWeapon,
    weaponCooldownEndsAt,
    profile.inventory,
    consumeWeapon,
    setWeaponCooldown,
    triggerWeaponCast,
    activateShield,
    applyOpponentEffect,
  ]);

  useWeaponHotkey({ enabled: battling, onFire: fireWeapon, hotkey: 'Tab' });

  const localGlitch = battling && now < opponentEffects.glitchUntil;
  const localLetterDrop = battling && now < opponentEffects.letterDropUntil;
  const localSlowed = battling && now < opponentEffects.slowUntil;

  const engine = useTypingEngine({
    words,
    enabled: battling,
    playerLevel: navState?.mode === 'singleplayer' ? profile.level : undefined,
    timeoutMultiplier: localSlowed ? 0.7 : 1,
    onWordComplete: handleWordComplete,
  });

  useBotFight(enemy, battling);

  useEffect(() => {
    if (!isMp) return;
    return mpOnMessage((m) => {
      if (m.type === 'damage') {
        damageLocal(m.amount);
      } else if (m.type === 'weapon') {
        const w = WEAPONS[m.weaponId];
        if (m.weaponId === 'glitch') applyOpponentEffect('glitch', w.effectMs);
        else if (m.weaponId === 'letterDrop') applyOpponentEffect('letterDrop', w.effectMs);
        else if (m.weaponId === 'slowCurse') applyOpponentEffect('slow', w.effectMs);
      } else if (m.type === 'finished') {
        if (useGameStore.getState().phase !== 'RESULTS') {
          finishBattleAction();
        }
      }
    });
  }, [isMp, mpOnMessage, damageLocal, applyOpponentEffect, finishBattleAction]);

  useEffect(() => {
    if (!isMp) return;
    if (localHP <= 0 && !finishedSentRef.current) {
      finishedSentRef.current = true;
      mpSend({ type: 'finished', reason: 'hp-zero' });
    }
  }, [isMp, localHP, mpSend]);

  useEffect(() => {
    if (phase === 'BATTLE' && engine.done && navState?.mode === 'solo-practice') {
      useGameStore.getState().finishBattle();
    }
  }, [engine.done, phase, navState]);

  useEffect(() => {
    return () => {
      if (useGameStore.getState().phase === 'IDLE') resetBattle();
    };
  }, [resetBattle]);

  useEffect(() => {
    if (phase === 'RESULTS') {
      navigate('/results', { replace: true });
    }
  }, [phase, navigate]);

  if (!navState) return null;

  const localSprite = spriteForHat(profile.cosmetics.hat);
  const wandColor = colorForWand(profile.cosmetics.wand);
  const wandEmoji = emojiForWand(profile.cosmetics.wand);
  const wandGlow = glowForWand(profile.cosmetics.wand);
  const particleEmoji = emojiForParticles(profile.cosmetics.particles);

  const opponentSprite = isMp
    ? navState.opponentInfo
      ? spriteForHat(navState.opponentInfo.cosmetics.hat)
      : '🧝'
    : enemy?.sprite ?? '🧌';

  const handleForfeit = () => {
    if (isMp && !finishedSentRef.current) {
      finishedSentRef.current = true;
      mpSend({ type: 'finished', reason: 'forfeit' });
      mpGoFinished();
      mpCleanup();
    }
    resetBattle();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleForfeit}>
          ← Forfeit
        </Button>
        <div className="flex items-center gap-3">
          <Badge color="violet">Lvl {profile.level}</Badge>
          {navState.mode === 'mp-ranked' && <Badge color="gold">RANKED</Badge>}
          {navState.mode === 'mp-friend' && <Badge color="cyan">FRIEND</Badge>}
          {navState.mode === 'singleplayer' && enemy && (
            <Badge color={enemy.kind === 'boss' ? 'rose' : 'orange'}>
              {enemy.kind.toUpperCase()} · Lvl {enemy.level}
            </Badge>
          )}
        </div>
      </div>

      <MageArena
        localName={profile.displayName}
        localSprite={localSprite}
        opponentSprite={opponentSprite}
        localWandColor={wandColor}
        localWandEmoji={wandEmoji}
        localWandGlow={wandGlow}
        particleEmoji={particleEmoji}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <ComboCounter streak={engine.streak} />
        <TypingArea
          words={words}
          engine={engine}
          glitch={localGlitch}
          letterDrop={localLetterDrop}
          enabled={battling}
        />
      </div>

      <div className="flex items-center justify-between">
        <SecondaryWeaponSlot
          weaponId={equippedWeapon}
          cooldownEndsAt={weaponCooldownEndsAt}
          count={equippedWeapon ? profile.inventory[equippedWeapon] ?? 0 : 0}
        />
        <div className="text-sm text-white/60 font-mono">
          Word {Math.min(engine.currentIndex + 1, words.length)} / {words.length}
        </div>
      </div>

      {phase === 'COUNTDOWN' && (
        <CountdownOverlay seconds={3} onDone={() => setPhase('BATTLE')} />
      )}
    </div>
  );
}
