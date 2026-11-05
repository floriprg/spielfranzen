#!/usr/bin/env python3
"""
Franzen Reinforcement Learning (Masked PPO & Self-Play)
Game: Bavarian/Austrian Franzen (33 cards, 3 players)
Network: FranzenActorCritic (147 input -> 256x3 LayerNorm/ReLU -> Actor 33 + Critic 1)
Export: ONNX policy export (opset 14) for inference in Node.js
"""

import os
import random
import warnings
from typing import List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.distributions import Categorical

# Warnungen während ONNX-Export unterdrücken
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

# ==============================================================================
# 1. KARTEN-DEFINITIONEN & GLOBALE KONSTANTEN (33 Karten)
# ==============================================================================

# 4 Farben: Eichel (0), Laub (1), Herz (2), Schell (3)
SUITS = ["EICHEL", "LAUB", "HERZ", "SCHELL"]
SUIT_NAMES = {0: "Eichel", 1: "Laub", 2: "Herz", 3: "Schell"}

# Rangfolge & Augenwerte im Franzen:
# 7=2, 8=3, 9=4, Unter=5, Ober=6, König=7, 10er=8, Ass=9
# Weli (Schell 6) = Rang 1 (unter 7er), 0 Punkte
# Gesamtaugen im Deck: 4 * 30 = 120
CARD_SUIT = np.zeros(33, dtype=np.int32)
CARD_RANK = np.zeros(33, dtype=np.int32)
CARD_POINTS = np.zeros(33, dtype=np.int32)
CARD_NAMES: List[str] = []

_idx = 0
for _s_idx, _s_name in enumerate(SUITS):
    _ranks = [
        (2, 0, "7"),
        (3, 0, "8"),
        (4, 0, "9"),
        (5, 2, "Unter"),
        (6, 3, "Ober"),
        (7, 4, "König"),
        (8, 10, "10er"),
        (9, 11, "Ass"),
    ]
    for _r_power, _r_pts, _r_name in _ranks:
        CARD_SUIT[_idx] = _s_idx
        CARD_RANK[_idx] = _r_power
        CARD_POINTS[_idx] = _r_pts
        CARD_NAMES.append(f"{_s_name} {_r_name}")
        _idx += 1

# 33. Karte: Weli (Schell 6)
CARD_SUIT[32] = 3  # SCHELL
CARD_RANK[32] = 1  # Niedrigste Schell-Karte
CARD_POINTS[32] = 0
CARD_NAMES.append("Schell Weli")

# Spielmodi (4 bis 12)
# Modi 5..8: Farbspiele (Trumpf = Eichel, Laub, Schell, Herz)
# Modus 9: Bettl (0 Stiche, Talon erlaubt)
# Modus 10: Mord (10 Stiche, Talon erlaubt)
# Modus 11: Doppelbettl (0 Stiche, Handspiel/kein Talon)
# Modus 12: Doppelmord (10 Stiche, Handspiel/kein Talon)
MODE_TRUMP_SUIT = {
    4: None,
    5: 0,  # Eichel
    6: 1,  # Laub
    7: 3,  # Schell
    8: 2,  # Herz
    9: None,
    10: None,
    11: None,
    12: None,
}

MODE_BASE_VALUES = {
    4: 100,
    5: 100,
    6: 100,
    7: 100,
    8: 100,
    9: 200,
    10: 300,
    11: 400,
    12: 600,
}


# ==============================================================================
# 2. NETZWERK-ARCHITEKTUR (FranzenActorCritic)
# ==============================================================================

class FranzenActorCritic(nn.Module):
    """
    Actor-Critic Netzwerk für Franzen (Masked PPO):
    - Input: 147 Floats
    - Shared Backbone: 3 Linear-Layer mit je 256 Neuronen, LayerNorm und ReLU
    - Actor-Head: 33 Output-Logits mit Masking für ungültige Aktionen (-1e9)
    - Critic-Head: 1 Skalar für geschätzten Runden-Erwartungswert
    """

    def __init__(self, input_dim: int = 147, action_dim: int = 33, hidden_dim: int = 256):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
        )
        self.actor = nn.Linear(hidden_dim, action_dim)
        self.critic = nn.Linear(hidden_dim, 1)

    def forward(
        self, x: torch.Tensor, action_mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        is_single = x.dim() == 1
        if is_single:
            x = x.unsqueeze(0)
            if action_mask is not None and action_mask.dim() == 1:
                action_mask = action_mask.unsqueeze(0)

        features = self.backbone(x)
        logits = self.actor(features)

        if action_mask is not None:
            mask_val = torch.tensor(-1e9, dtype=logits.dtype, device=logits.device)
            logits = torch.where(action_mask, logits, mask_val)

        value = self.critic(features).squeeze(-1)

        if is_single:
            logits = logits.squeeze(0)
            value = value.squeeze(0)

        return logits, value

    def get_action_and_value(
        self, x: torch.Tensor, action_mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        logits, value = self.forward(x, action_mask)
        dist = Categorical(logits=logits)
        action = dist.sample()
        return action, dist.log_prob(action), dist.entropy(), value

    def evaluate_actions(
        self, x: torch.Tensor, actions: torch.Tensor, action_mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        logits, value = self.forward(x, action_mask)
        dist = Categorical(logits=logits)
        log_prob = dist.log_prob(actions)
        entropy = dist.entropy()
        return log_prob, value, entropy


# ==============================================================================
# 3. ONNX EXPORT WRAPPER & FUNKTION
# ==============================================================================

class FranzenOnnxPolicyWrapper(nn.Module):
    """
    Export-Wrapper für ONNX:
    Nimmt ausschließlich den [1, 147] Float-Tensor entgegen und gibt
    die 33 rohen Actor-Logits ohne Maskierung aus.
    """

    def __init__(self, model: FranzenActorCritic):
        super().__init__()
        self.backbone = model.backbone
        self.actor = model.actor

    def forward(self, input: torch.Tensor) -> torch.Tensor:
        features = self.backbone(input)
        logits = self.actor(features)
        return logits


def export_to_onnx(model: FranzenActorCritic, filepath: str = "franzen_bot.onnx"):
    """
    Exportiert den Policy-Head des Modells in das ONNX-Format (opset_version=14).
    Akzeptiert Input 'input' (Shape: [1, 147]) und gibt 'logits' (Shape: [1, 33]) aus.
    """
    was_training = model.training
    model.eval()
    wrapper = FranzenOnnxPolicyWrapper(model).to("cpu")
    wrapper.eval()
    dummy_input = torch.zeros(1, 147, dtype=torch.float32, device="cpu")

    export_args = {
        "export_params": True,
        "opset_version": 14,
        "do_constant_folding": True,
        "input_names": ["input"],
        "output_names": ["logits"],
        "dynamic_axes": {"input": {0: "batch_size"}, "logits": {0: "batch_size"}},
    }

    try:
        torch.onnx.export(wrapper, dummy_input, filepath, dynamo=False, **export_args)
    except TypeError:
        torch.onnx.export(wrapper, dummy_input, filepath, **export_args)

    print(f"[ONNX Export] Modell erfolgreich exportiert nach: '{filepath}'")
    if was_training:
        model.train()


# ==============================================================================
# 4. SIMULATIONS-UMGEBUNG (FranzenEnv)
# ==============================================================================

class FranzenEnv:
    """
    Schnelle Simulationsumgebung für das 33-Karten 3-Spieler Franzen.
    Beinhaltet:
    - Exaktes 147-Float State-Encoding
    - Farbzwang & Trumpfzwang
    - 66-Augen Sofortsieg (Farbspiele)
    - 10.-Stich-Regel (Farbspiele)
    - Bettl / Doppelbettl Sofortverlust bei erstem Stich
    - Mord / Doppelmord Sofortverlust bei Stichverlust
    - Zero-Sum Rewardabrechnung
    """

    def __init__(self):
        self.hands: List[List[int]] = [[], [], []]
        self.talon: List[int] = []
        self.discarded_cards: List[int] = []
        self.played_cards: List[int] = []
        self.current_trick: List[Tuple[int, int]] = []
        self.trick_history: List[List[Tuple[int, int]]] = []

        self.game_mode: int = 5
        self.declarer_seat: int = 0
        self.current_turn: int = 0
        self.trick_lead_seat: int = 0

        self.declarer_points: int = 0
        self.defender_points: int = 0
        self.declarer_tricks: int = 0
        self.defender_tricks: int = 0

        self.is_over: bool = False
        self.declarer_won: bool = False

    def get_trump_suit(self) -> Optional[int]:
        return MODE_TRUMP_SUIT.get(self.game_mode, None)

    def reset(self, mode: Optional[int] = None, declarer: Optional[int] = None) -> np.ndarray:
        """Startet eine neue Spielrunde mit Kartenausgabe und Talon-Aufnahme."""
        # 33 Karten mischen
        deck = np.random.permutation(33).tolist()
        self.hands = [deck[0:10], deck[10:20], deck[20:30]]
        self.talon = deck[30:33]
        self.discarded_cards = []
        self.played_cards = []
        self.current_trick = []
        self.trick_history = []

        # Spielmodus bestimmen (5 bis 12)
        if mode is not None:
            self.game_mode = mode
        else:
            self.game_mode = int(np.random.choice([5, 6, 7, 8, 9, 10, 11, 12]))

        # Alleinspieler bestimmen
        if declarer is not None:
            self.declarer_seat = declarer
        else:
            self.declarer_seat = int(np.random.randint(0, 3))

        # Talon-Aufnahme (nur bei Modi 5, 6, 7, 8, 9, 10; bei 11/12 Handspiel)
        if self.game_mode in [5, 6, 7, 8, 9, 10]:
            d_hand = self.hands[self.declarer_seat] + self.talon
            trump = self.get_trump_suit()

            if self.game_mode in [5, 6, 7, 8]:
                # Farbmodus: Behalte Trümpfe und Asse/Zehner, lege schwächste Karten ab
                def keep_val(c):
                    is_tr = 1 if (trump is not None and CARD_SUIT[c] == trump) else 0
                    return is_tr * 100 + CARD_POINTS[c] * 5 + CARD_RANK[c]

                d_hand.sort(key=keep_val)
            elif self.game_mode == 9:
                # Bettl: Behalte kleine Karten, lege die gefährlichsten hohen Karten ab
                d_hand.sort(key=lambda c: -CARD_RANK[c])
            else:
                # Mord: Behalte stärkste Karten
                d_hand.sort(key=lambda c: CARD_RANK[c])

            # Die 3 schlechtesten Karten ablegen
            self.discarded_cards = d_hand[:3]
            self.hands[self.declarer_seat] = d_hand[3:]
        else:
            self.discarded_cards = []

        # Rundenvariablen initialisieren
        self.declarer_points = 0
        self.defender_points = 0
        self.declarer_tricks = 0
        self.defender_tricks = 0
        self.is_over = False
        self.declarer_won = False

        # Gemäß offiziellen Regeln spielt der Alleinspieler immer den 1. Stich aus
        self.trick_lead_seat = self.declarer_seat
        self.current_turn = self.declarer_seat

        return self.get_state()

    def get_action_mask(self, seat: Optional[int] = None) -> np.ndarray:
        """
        Gibt einen booleschen Vektor der Länge 33 zurück.
        True = regelkonforme Handkarte, False = illegal.
        Berücksichtigt Farbzwang und Trumpfzwang.
        """
        if seat is None:
            seat = self.current_turn

        mask = np.zeros(33, dtype=bool)
        hand = self.hands[seat]
        if len(hand) == 0 or self.is_over:
            return mask

        # 1. Erster Auswurf im Stich: Freie Wahl aller eigenen Handkarten
        if len(self.current_trick) == 0:
            for c in hand:
                mask[c] = True
            return mask

        # 2. Folgespieler im Stich
        lead_card = self.current_trick[0][1]
        lead_suit = CARD_SUIT[lead_card]

        # Regel 1: Farbzwang (Muss geforderte Farbe bedienen falls vorhanden)
        suit_cards = [c for c in hand if CARD_SUIT[c] == lead_suit]
        if len(suit_cards) > 0:
            for c in suit_cards:
                mask[c] = True
            return mask

        # Regel 2: Trumpfzwang (nur in Farbspielen 5, 6, 7, 8)
        trump_suit = self.get_trump_suit()
        if trump_suit is not None:
            trump_cards = [c for c in hand if CARD_SUIT[c] == trump_suit]
            if len(trump_cards) > 0:
                for c in trump_cards:
                    mask[c] = True
                return mask

        # Regel 3: Freie Karte (Kann Farbe nicht bedienen und kein Trumpf geschuldet)
        for c in hand:
            mask[c] = True
        return mask

    def get_state(self, seat: Optional[int] = None) -> np.ndarray:
        """
        Erzeugt das exakt 147-Float State-Encoding aus Sicht des Spielers 'seat':
        - 0–32: Eigene Handkarten (One-Hot, 33)
        - 33–65: Bereits gespielte Karten in früheren Stichen (One-Hot, 33)
        - 66–98: Erste Karte im aktuellen Stich (One-Hot, 33)
        - 99–131: Zweite Karte im aktuellen Stich (One-Hot, 33)
        - 132–140: Aktueller Spielmodus 4 bis 12 (One-Hot, 9)
        - 141–146: Normalisierte Werte (6 Floats):
                   [eigenePunkte/66, gegnerPunkte/66, stichNummer/10,
                    istAlleinspieler, positionImStich/2, trumpfFarbeIndex/4]
        """
        if seat is None:
            seat = self.current_turn

        # 0–32: Eigene Hand
        hand_vec = np.zeros(33, dtype=np.float32)
        for c in self.hands[seat]:
            hand_vec[c] = 1.0

        # 33–65: Gespielte Karten früherer Stiche
        played_vec = np.zeros(33, dtype=np.float32)
        for c in self.played_cards:
            played_vec[c] = 1.0

        # 66–98: Erste Karte im aktuellen Stich
        first_card_vec = np.zeros(33, dtype=np.float32)
        if len(self.current_trick) >= 1:
            first_card_vec[self.current_trick[0][1]] = 1.0

        # 99–131: Zweite Karte im aktuellen Stich
        second_card_vec = np.zeros(33, dtype=np.float32)
        if len(self.current_trick) >= 2:
            second_card_vec[self.current_trick[1][1]] = 1.0

        # 132–140: Spielmodus 4..12 (9 Werte)
        mode_vec = np.zeros(9, dtype=np.float32)
        mode_idx = int(np.clip(self.game_mode - 4, 0, 8))
        mode_vec[mode_idx] = 1.0

        # 141–146: Normalisierte Floats
        is_declarer = 1.0 if (seat == self.declarer_seat) else 0.0
        if is_declarer == 1.0:
            eigene_punkte = float(self.declarer_points)
            gegner_punkte = float(self.defender_points)
        else:
            eigene_punkte = float(self.defender_points)
            gegner_punkte = float(self.declarer_points)

        stich_nr = float(len(self.trick_history))
        pos_in_trick = float(len(self.current_trick))

        trump_suit = self.get_trump_suit()
        trump_idx = 4.0 if trump_suit is None else float(trump_suit)

        norm_vec = np.array(
            [
                eigene_punkte / 66.0,
                gegner_punkte / 66.0,
                stich_nr / 10.0,
                is_declarer,
                pos_in_trick / 2.0,
                trump_idx / 4.0,
            ],
            dtype=np.float32,
        )

        state = np.concatenate(
            [hand_vec, played_vec, first_card_vec, second_card_vec, mode_vec, norm_vec]
        )
        return state

    def _determine_trick_winner(self, trick: List[Tuple[int, int]]) -> int:
        """Ermittelt den Stichgewinner nach Franzen-Regeln."""
        trump_suit = self.get_trump_suit()
        lead_suit = CARD_SUIT[trick[0][1]]

        # Wenn mindestens ein Trumpf gespielt wurde, gewinnt der höchste Trumpf
        if trump_suit is not None:
            trump_plays = [p for p in trick if CARD_SUIT[p[1]] == trump_suit]
            if len(trump_plays) > 0:
                trump_plays.sort(key=lambda p: CARD_RANK[p[1]], reverse=True)
                return trump_plays[0][0]

        # Kein Trumpf im Stich: Höchste Karte der angespielten Farbe gewinnt
        lead_plays = [p for p in trick if CARD_SUIT[p[1]] == lead_suit]
        lead_plays.sort(key=lambda p: CARD_RANK[p[1]], reverse=True)
        return lead_plays[0][0]

    def _evaluate_round(self, last_trick_winner: int) -> Tuple[bool, bool]:
        """
        Prüft Siegbedingungen & vorzeitigen Spielabbruch:
        Gibt (is_over, declarer_won) zurück.
        """
        tricks_played = len(self.trick_history)

        # 1. Farbspiele (Modi 4, 5, 6, 7, 8)
        if self.game_mode <= 8:
            # 66-Punkte-Sofortsieg Alleinspieler
            if self.declarer_points >= 66:
                return True, True
            # 66-Punkte-Sofortsieg Gegner
            if self.defender_points >= 66:
                return True, False
            # 10.-Stich-Regel: Wer den 10. Stich macht, gewinnt die Runde
            if tricks_played == 10:
                return True, (last_trick_winner == self.declarer_seat)
            return False, False

        # 2. Bettl (9) & Doppelbettl (11): Alleinspieler darf KEINEN Stich machen
        if self.game_mode in [9, 11]:
            # Bettl-Sofortverlust bei erstem Stich
            if last_trick_winner == self.declarer_seat:
                return True, False
            if tricks_played == 10:
                return True, True
            return False, False

        # 3. Mord (10) & Doppelmord (12): Alleinspieler muss ALLE 10 Stiche machen
        if self.game_mode in [10, 12]:
            # Mord-Sofortverlust wenn ein Gegner einen Stich gewinnt
            if last_trick_winner != self.declarer_seat:
                return True, False
            if tricks_played == 10:
                return True, True
            return False, False

        return False, False

    def _compute_rewards(self, declarer_won: bool) -> List[float]:
        """Berechnet Zero-Sum-Rewards skaliert auf 1/100 des Basiswerts W."""
        w = float(MODE_BASE_VALUES.get(self.game_mode, 100))
        # Skalierung auf Einheiten z.B. 1.0 = 100 Pkt für RL-Stabilität
        val = w / 100.0

        rewards = [0.0, 0.0, 0.0]
        if declarer_won:
            rewards[self.declarer_seat] = val
            for s in range(3):
                if s != self.declarer_seat:
                    rewards[s] = -val / 2.0
        else:
            rewards[self.declarer_seat] = -val
            for s in range(3):
                if s != self.declarer_seat:
                    rewards[s] = val / 2.0

        return rewards

    def step(self, action: int) -> Tuple[Optional[np.ndarray], List[float], bool, dict]:
        """Führt das Ausspielen einer Karte durch den aktuellen Spieler aus."""
        if self.is_over:
            raise RuntimeError("Runde ist bereits beendet. Bitte reset() aufrufen.")

        seat = self.current_turn
        hand = self.hands[seat]

        if action not in hand:
            raise ValueError(f"Karte {action} ({CARD_NAMES[action]}) nicht in Hand von Spieler {seat}!")

        # Karte aus Hand entfernen und auf Tisch legen
        hand.remove(action)
        self.current_trick.append((seat, action))

        # Stich noch nicht komplett (< 3 Karten)
        if len(self.current_trick) < 3:
            self.current_turn = (seat + 1) % 3
            return self.get_state(), [0.0, 0.0, 0.0], False, {}

        # --- Stich komplett (3 Karten) ---
        winner_seat = self._determine_trick_winner(self.current_trick)
        trick_pts = sum(CARD_POINTS[c] for _, c in self.current_trick)

        if winner_seat == self.declarer_seat:
            self.declarer_points += trick_pts
            self.declarer_tricks += 1
        else:
            self.defender_points += trick_pts
            self.defender_tricks += 1

        # Gespielte Karten in Ablagestapel überführen
        for _, c in self.current_trick:
            self.played_cards.append(c)

        self.trick_history.append(list(self.current_trick))
        self.current_trick = []

        # Prüfung auf Rundenende
        is_over, declarer_won = self._evaluate_round(winner_seat)
        if is_over:
            self.is_over = True
            self.declarer_won = declarer_won
            rewards = self._compute_rewards(declarer_won)
            return None, rewards, True, {"declarer_won": declarer_won, "winner_seat": winner_seat}

        # Nächster Stich: Gewinner spielt aus
        self.trick_lead_seat = winner_seat
        self.current_turn = winner_seat

        return self.get_state(), [0.0, 0.0, 0.0], False, {}


# ==============================================================================
# 5. SELF-PLAY TRAINER (Masked PPO)
# ==============================================================================

class FranzenPPOTrainer:
    """
    Trainings-Pipeline via Self-Play für Franzen:
    Alle 3 Positionen werden über das selbe Policy-Netzwerk gesteuert.
    """

    def __init__(
        self,
        model: FranzenActorCritic,
        lr: float = 3e-4,
        gamma: float = 0.99,
        clip_eps: float = 0.2,
        value_coef: float = 0.5,
        entropy_coef: float = 0.01,
        max_grad_norm: float = 0.5,
        device: str = "cpu",
    ):
        self.model = model.to(device)
        self.device = device
        self.optimizer = optim.Adam(self.model.parameters(), lr=lr)
        self.gamma = gamma
        self.clip_eps = clip_eps
        self.value_coef = value_coef
        self.entropy_coef = entropy_coef
        self.max_grad_norm = max_grad_norm
        self.env = FranzenEnv()

    def train(
        self,
        total_episodes: int = 2500,
        rollout_episodes: int = 32,
        ppo_epochs: int = 4,
        mini_batch_size: int = 64,
        onnx_export_path: str = "franzen_bot.onnx",
    ):
        print("=" * 70)
        print("🚀 STARTE FRANZEN SELF-PLAY PPO TRAINING")
        print(f"• Episoden gesamt:     {total_episodes}")
        print(f"• Rollout-Batch-Größe: {rollout_episodes} Episoden pro PPO-Update")
        print(f"• Device:              {self.device}")
        print(f"• ONNX Export-Pfad:    {onnx_export_path}")
        print("=" * 70)

        # 1. Initialer ONNX Export direkt vor dem Training
        print("\n[Init] Führe initialen ONNX-Export durch...")
        export_to_onnx(self.model, onnx_export_path)

        buffer_states: List[np.ndarray] = []
        buffer_masks: List[np.ndarray] = []
        buffer_actions: List[int] = []
        buffer_log_probs: List[float] = []
        buffer_values: List[float] = []
        buffer_returns: List[float] = []
        buffer_advantages: List[float] = []

        declarer_wins = 0
        total_games_played = 0

        for episode in range(1, total_episodes + 1):
            state = self.env.reset()
            # Puffer für jede Sitzposition der aktuellen Episode
            seat_trajectories: List[List[dict]] = [[], [], []]

            done = False
            while not done:
                seat = self.env.current_turn
                mask = self.env.get_action_mask(seat)

                state_t = torch.from_numpy(state).float().to(self.device)
                mask_t = torch.from_numpy(mask).bool().to(self.device)

                with torch.no_grad():
                    action, log_prob, _, val = self.model.get_action_and_value(state_t, mask_t)

                action_item = action.item()
                seat_trajectories[seat].append(
                    {
                        "state": state,
                        "mask": mask,
                        "action": action_item,
                        "log_prob": log_prob.item(),
                        "value": val.item(),
                    }
                )

                next_state, rewards, done, info = self.env.step(action_item)
                state = next_state

            # Episode abgeschlossen: Returns & Advantages für alle 3 Spieler berechnen
            total_games_played += 1
            if self.env.declarer_won:
                declarer_wins += 1

            for s in range(3):
                traj = seat_trajectories[s]
                final_r = rewards[s]
                T = len(traj)
                for t in range(T):
                    discounted_ret = (self.gamma ** (T - 1 - t)) * final_r
                    adv = discounted_ret - traj[t]["value"]

                    buffer_states.append(traj[t]["state"])
                    buffer_masks.append(traj[t]["mask"])
                    buffer_actions.append(traj[t]["action"])
                    buffer_log_probs.append(traj[t]["log_prob"])
                    buffer_values.append(traj[t]["value"])
                    buffer_returns.append(discounted_ret)
                    buffer_advantages.append(adv)

            # PPO-Update wenn Rollout-Episoden erreicht
            if episode % rollout_episodes == 0 and len(buffer_states) > 0:
                self._update_ppo(
                    buffer_states,
                    buffer_masks,
                    buffer_actions,
                    buffer_log_probs,
                    buffer_values,
                    buffer_returns,
                    buffer_advantages,
                    ppo_epochs,
                    mini_batch_size,
                )
                # Puffer leeren
                buffer_states.clear()
                buffer_masks.clear()
                buffer_actions.clear()
                buffer_log_probs.clear()
                buffer_values.clear()
                buffer_returns.clear()
                buffer_advantages.clear()

            # Regelmäßiges Logging & ONNX-Export alle 500 Episoden
            if episode % 500 == 0:
                winrate = (declarer_wins / total_games_played) * 100.0
                print(
                    f"\n📈 [Episode {episode:5d}/{total_episodes}] "
                    f"Alleinspieler-Winrate: {winrate:5.1f}% "
                    f"({declarer_wins}/{total_games_played} Siege)"
                )
                export_to_onnx(self.model, onnx_export_path)

        # Finaler Export
        print("\n✅ Training abgeschlossen! Führe finalen Export durch...")
        export_to_onnx(self.model, onnx_export_path)

    def _update_ppo(
        self,
        b_states: List[np.ndarray],
        b_masks: List[np.ndarray],
        b_actions: List[int],
        b_log_probs: List[float],
        b_values: List[float],
        b_returns: List[float],
        b_advantages: List[float],
        ppo_epochs: int,
        mini_batch_size: int,
    ):
        states_t = torch.tensor(np.array(b_states), dtype=torch.float32, device=self.device)
        masks_t = torch.tensor(np.array(b_masks), dtype=torch.bool, device=self.device)
        actions_t = torch.tensor(b_actions, dtype=torch.int64, device=self.device)
        old_log_probs_t = torch.tensor(b_log_probs, dtype=torch.float32, device=self.device)
        returns_t = torch.tensor(b_returns, dtype=torch.float32, device=self.device)
        advantages_t = torch.tensor(b_advantages, dtype=torch.float32, device=self.device)

        # Advantage-Normalisierung
        adv_std = advantages_t.std()
        if not torch.isnan(adv_std) and adv_std > 1e-6:
            advantages_t = (advantages_t - advantages_t.mean()) / (adv_std + 1e-8)

        dataset_size = states_t.size(0)
        indices = np.arange(dataset_size)

        for _ in range(ppo_epochs):
            np.random.shuffle(indices)
            for start in range(0, dataset_size, mini_batch_size):
                end = start + mini_batch_size
                batch_idx = indices[start:end]

                mb_states = states_t[batch_idx]
                mb_masks = masks_t[batch_idx]
                mb_actions = actions_t[batch_idx]
                mb_old_log_probs = old_log_probs_t[batch_idx]
                mb_returns = returns_t[batch_idx]
                mb_advantages = advantages_t[batch_idx]

                new_log_probs, new_values, entropy = self.model.evaluate_actions(
                    mb_states, mb_actions, mb_masks
                )

                # Ratio & Clipped PPO Objective
                ratio = torch.exp(new_log_probs - mb_old_log_probs)
                surr1 = ratio * mb_advantages
                surr2 = torch.clamp(ratio, 1.0 - self.clip_eps, 1.0 + self.clip_eps) * mb_advantages
                actor_loss = -torch.min(surr1, surr2).mean()

                # Critic Loss (MSE)
                critic_loss = F.mse_loss(new_values, mb_returns)

                # Entropy Bonus
                entropy_loss = -entropy.mean()

                total_loss = (
                    actor_loss + self.value_coef * critic_loss + self.entropy_coef * entropy_loss
                )

                self.optimizer.zero_grad()
                total_loss.backward()
                nn.utils.clip_grad_norm_(self.model.parameters(), self.max_grad_norm)
                self.optimizer.step()


# ==============================================================================
# 6. HAUPTPROGRAMM (Direkt ausführbar)
# ==============================================================================

def main():
    # Determinismus für Reproduzierbarkeit
    random.seed(42)
    np.random.seed(42)
    torch.manual_seed(42)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Verwende Ausführungs-Hardware: {device}")

    # Initialisiere Netzwerk
    model = FranzenActorCritic(input_dim=147, action_dim=33, hidden_dim=256)

    # Trainer aufsetzen & Training starten
    trainer = FranzenPPOTrainer(
        model=model,
        lr=3e-4,
        gamma=0.99,
        clip_eps=0.2,
        value_coef=0.5,
        entropy_coef=0.01,
        max_grad_norm=0.5,
        device=device,
    )

    trainer.train(
        total_episodes=1000000,
        rollout_episodes=64,
        ppo_epochs=4,
        mini_batch_size=128,
        onnx_export_path="franzen_bot.onnx",
    )


if __name__ == "__main__":
    main()
