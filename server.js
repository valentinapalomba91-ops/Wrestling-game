import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// --- DEFINIZIONI PER L'AMBIENTE ES MODULE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
// --------------------------------------------

const app = express();
const server = http.createServer(app);
// Configurazione CORS per Socket.IO (necessaria se il client fosse su un dominio diverso)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// MODIFICA CRITICA PER RENDER: Usa la porta di ambiente fornita o 3000
const PORT = process.env.PORT || 3000;

// ==========================================================
// 🎲 LOGICA DI GIOCO (SERVER-AUTHORITATIVE)
// ==========================================================

const TOTAL_CELLS = 100;
const CARD_DRAW_CELLS = [
    5, 12, 18, 24, 31, 38, 44, 52, 59, 66, 73, 79, 84, 91, 98 
];
const PLAYER_SYMBOLS = ["⭐", "👑", "🐍", "🔥", "💪", "👊"];

// ==========================================================
// 🃏 DEFINIZIONE DELLE CARTE SPECIALI (25 Carte)
// Ho mantenuto e corretto la tua definizione di carte.
// ==========================================================
const CARDS = [
    // 1. 🟢 Carte Bonus e Avanzamento (3 Carte) - INDIVIDUALI
    { 
        name: "Figure Four Leglock! WOOO!", 
        text: "Diventi parte della famiglia Flair e apprendi di diritto la Figure Four.", 
        type: 'bonus', 
        effect_desc: "Avanzi di 2 caselle. (Solo tu)", 
        move_steps: 2 
    },
    { 
        name: "Spear from Nowhere!", 
        text: "Roman Reigns ed Edge ti insegnano a fare una spear spettacolare!", 
        type: 'bonus', 
        effect_desc: "Avanzi di 5 caselle. (Solo tu)", 
        move_steps: 5 
    },
    { 
        name: "Take your vitamins!", 
        text: "Ascolti Hulk Hogan, preghi e prendi le tue vitamine (VITAMINE EH!)", 
        type: 'bonus', 
        effect_desc: "Avanza della distanza pari al tuo ultimo lancio del dado moltiplicato per tre. (Se hai tirato 6, avanzi di 18!)", 
        move_multiplier: 3 
    },

    // 2. 🟠 Carte di Movimento Speciale e Targettizzato (3 Carte)
    { 
        name: "Mami is always on top!", 
        text: "Rhea Ripley ti prende sotto la sua ala e ti aiuta con una Riptide! Ora sei un/una bimbo/bimba di Rhea!", 
        type: 'special', 
        effect_desc: "Avanzi di 4 caselle.", 
        move_steps: 4 
    },
    { 
        name: "One Final Time! FU (AAA me fa schifo) di Cena!", 
        text: "Johnny Boy ti aiuta un'ultima volta.", 
        type: 'special', 
        effect_desc: "Avanzi di 1 casella.", 
        move_steps: 1 
    },
    { 
        name: "Pipe Bomb! L'anima di Cm Punk si reincarna in te.", 
        text: "Fai un promo della madonna (messa solo per par condicio).", 
        type: 'special', 
        effect_desc: "Il giocatore più avanti retrocede alla tua casella attuale. (Tu e il più avanti)", 
        target_nearest_ahead_back_to_self: true 
    },

    // 3. 🔴 Carte Malus e Retrocessione (6 Carte) - INDIVIDUALI
    { 
        name: "BOTCHONE!", 
        text: "Sin Cara si impossessa di te e Botchi qualsiasi cosa.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 3 caselle. (Solo tu)", 
        move_steps: -3 
    },
    { 
        name: "Il Judgment Day esiste ancora!", 
        text: "JD doveva esplodere mille anni fa, ma è ancora qui e nessuno sa perchè. In ogni caso decide di interferire nel tuo match a tuo sfavore.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 2 caselle. (Solo tu)", 
        move_steps: -2 
    },
    { 
        name: "Burn it Down!", 
        text: "Durante il tuo match parte la theme di Seth Rollins, che appare sullo stage vestito come una guardia svizzera che, in un moto di pazzia, ha tinto i vestiti di giallo, verde, arancione e viola fluo. Sopra indossa una tenda da doccia rossa con le paperelle e gli occhiali più grandi della sua faccia. Ride. Ti distrai, anzi, probabilmente ti accechi.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 1 casella. (Solo tu)", 
        move_steps: -1 
    },
    { 
        name: "Cody inizia a ringraziare tutti!", 
        text: "Cody vince la coppa del nonno, fa un promo dove nomina tutta la sua famiglia e inizia a ringraziare chiunque.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 2 caselle. (Solo tu)", 
        move_steps: -2 
    },
    { 
        name: "Non capisci cosa dica Jey Uso!", 
        text: "YEET! Jey ti dice cosa fare, ma tu capisci solo Yeet e un paio di Uce. Nel dubbio tu Yeetti e va male.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 1 casella. (Solo tu)", 
        move_steps: -1 
    },
    { 
        name: "Il cameraman inquadra Stephanie Vaquer, Booker T impazzisce!", 
        text: "Non capisci più una mazza fra la Vaquer e Booker T che sbraita e scivoli sulla tua stessa bava.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 1 casella. (Solo tu)", 
        move_steps: -1 
    },

    // 4. 🟣 Carte di Controllo di Massa e Turni (13 Carte)
    { 
        name: "Swanton Bomb!", 
        text: "La creatrice del gioco vede una Swanton fatta da Jeff Hardy, si mette a piangere ed immersa nella tristezza fa avanzare tutti di tre caselle.", 
        type: 'bonus', 
        effect_desc: "Tutti i giocatori avanzano di 3 caselle. (Tutti)", 
        move_all: 3 
    },
    { 
        name: "Claymore!", 
        text: "Drew McIntyre intercede per te e colpisce tutti con una Claymore!", 
        type: 'bonus', 
        effect_desc: "Avanzi di 3 caselle. (Solo tu)", 
        move_steps: 3 
    },
    { 
        name: "Vince returns!", 
        text: "Vince McMahon ritorna, distrugge tutti i piani di Triple H e ripristina la sua egemonia. No chance in hell!", 
        type: 'malus', 
        effect_desc: "Tutti i giocatori tornano alla casella 1. (Tutti)", 
        move_all_to_start: true 
    },
    { 
        name: "Underdog from the Underground!", 
        text: "Sami Zayne è una brava persona che aiuta sempre il più svantaggiato. E poi è simpatico. Ucey.", 
        type: 'special', 
        effect_desc: "Il giocatore più indietro avanza alla tua casella attuale, tutti gli altri saltano un turno. (Tutti)", 
        target_farthest_backward_to_self: true, 
        skip_all_others: true 
    },
    { 
        name: "Samoan dynasty!", 
        text: "Il risultato di un test del DNA svolto da Rikishi mostra che tutti i giocatori sono samoani...", 
        type: 'bonus', 
        effect_desc: "Tutti i giocatori avanzano di 2 caselle. (Tutti)", 
        move_all: 2 
    },
    { 
        name: "Stunner! Stunner! Stunner!", 
        text: "Stone Cold Steve Austin colpisce tutti con una Stunner e poi si sbrodola birra addosso. Forse era ubriaco.", 
        type: 'malus', 
        effect_desc: "Tutti i giocatori retrocedono di 2 caselle. (Tutti)", 
        move_all: -2 
    },
    { 
        name: "Ref Bump!", 
        text: "Hey, la WWE ne piazza uno ogni due match, perchè io non dovrei metterlo?", 
        type: 'malus', 
        effect_desc: "Salterai il prossimo turno. (Solo tu)", 
        skip_next_turn: true 
    },
    { 
        name: "Double Count-Out!", 
        text: "Tu e il giocatore più avanti vi fermate dal paninaro mentre lottatate fuori dal ring.", 
        type: 'malus', 
        effect_desc: "Tu e il giocatore più avanti salterete il prossimo turno. (Tu e il più avanti)", 
        skip_self_and_farthest_ahead: true 
    },
    { 
        name: "Intercessione di Heyman!", 
        text: "Diventi un assistito di Paul Heyman! ... Per ora ti aiuta.", 
        type: 'special', 
        effect_desc: "Ottieni un turno extra immediato. (Solo tu)", 
        extra_turn: true 
    },
    { 
        name: "Say His Name!", 
        text: "Sei in un momento di difficoltà, ma poi ti ricordi che esiste un Local Hero... Joe Hendry arriva in tuo soccorso!", 
        type: 'special', 
        effect_desc: "Avanzi di 2 caselle E tutti gli avversari retrocedono di 1 casella ciascuno. (Tutti)", 
        move_steps: 2, 
        move_all_others: -1 
    },
    { 
        name: "I lie, i cheat, I steal!", 
        text: "Eddie l'avrebbe fatto, lo sappiamo tutti. (Da applicare sempre prima della casella 20)", 
        type: 'special', 
        effect_desc: "Vai direttamente alla casella 40. (Solo tu)", 
        target_cell: 40 
    },
    { 
        name: "I hear voices in my head!", 
        text: "Ti parlano e ti dicono di tornare indietro. No, sentire le voci non è sempre un bene.", 
        type: 'malus', 
        effect_desc: "Retrocedi di 2 caselle. (Solo tu)", 
        move_steps: -2 
    },
    { 
        name: "Rest In Peace!", 
        text: "Tutto diventa nero, una campana risuona nell'arena, hai paura e lo sai. Chokeslam e Piledriver.", 
        type: 'malus', 
        effect_desc: "Retrocede alla casella 1 (Partenza). (Solo tu)", 
        reset_position: true 
    },
];

let gameState = {
    players: [],
    currentTurnIndex: 0,
    game_over: false,
    cardDeck: [...CARDS],
    cardDrawCells: CARD_DRAW_CELLS,
    lastDiceRoll: 0,
    gameLog: [], 
};

// --- FUNZIONI DI LOGICA DI GIOCO ---

function logEvent(message, type = 'general') {
    const logEntry = {
        timestamp: new Date().toLocaleTimeString('it-IT'), 
        message: message,
        type: type 
    };
    gameState.gameLog.unshift(logEntry); 
    if (gameState.gameLog.length > 30) {
        gameState.gameLog.pop(); 
    }
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}
function drawCard() {
    if (gameState.cardDeck.length === 0) {
        gameState.cardDeck = [...CARDS];
        shuffleArray(gameState.cardDeck);
        logEvent("Mazzo di carte esaurito. Riciclato e rimescolato!", 'general');
    }
    // CORREZIONE MINORE: Se ci sono ancora carte, preleva la prima e ricicla, altrimenti ritorna null o gestisci come preferisci.
    if (gameState.cardDeck.length === 0) return null; 

    const card = gameState.cardDeck.shift();
    // Ricicla la carta in fondo al mazzo
    gameState.cardDeck.push(card); 
    return card;
}

function calculatePath(start, end) {
    const path = [];
    if (start < end) {
        for (let i = start + 1; i <= end; i++) {
            path.push(i);
        }
    } else if (start > end) {
        for (let i = start - 1; i >= end; i--) {
            path.push(i);
        }
    }
    return path;
}
/**
 * Trova il giocatore target (il più avanti o il più indietro).
 */
function findTargetPlayer(type, currentPlayerID) {
    const otherPlayers = gameState.players.filter(p => p.id !== currentPlayerID);
    if (otherPlayers.length === 0) return null;

    if (type === 'farthest_backward') {
        // CORREZIONE: Usa `p.position` per il confronto, non il simbolo.
        return otherPlayers.reduce((farthest, p) => p.position < farthest.position ? p : farthest, otherPlayers[0]);
    }
    if (type === 'farthest_ahead') {
        // CORREZIONE: Usa `p.position` per il confronto.
        return otherPlayers.reduce((farthest, p) => p.position > farthest.position ? p : farthest, otherPlayers[0]);
    }
    return null;
}
// 🎯 MODIFICA PER RESET DELLO STATO DI GIOCO ALL'INIZIO DI UNA NUOVA PARTITA
function initializeGame() {
    gameState.cardDeck = [...CARDS];
    shuffleArray(gameState.cardDeck);
    
    // ✅ CORREZIONE: reset completo dello stato per una nuova partita pulita
    gameState.gameLog = []; 
    gameState.currentTurnIndex = 0; 
    
    gameState.game_over = false;
    gameState.lastDiceRoll = 0;
    
    gameState.players.forEach((player, index) => {
        player.position = 1;
        player.symbol = PLAYER_SYMBOLS[index % PLAYER_SYMBOLS.length];
        player.skippedTurns = 0;
    });

    if (gameState.players.length > 0) {
        // Garantisce che il primo giocatore a cui toccava giocare non salti il turno inutilmente
        while (gameState.players.length > 0 && gameState.players[gameState.currentTurnIndex].skippedTurns > 0) {
             gameState.players[gameState.currentTurnIndex].skippedTurns--;
             gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
        }
    }

    logEvent("La partita è iniziata. Tutti i giocatori sono a casella 1.", 'general');
}

function nextTurnLogic() {
    if (gameState.players.length === 0) {
        gameState.currentTurnIndex = 0; // Prevenzione: reset dell'indice
        return null; // Nessun giocatore attivo
    }

    let startIndex = gameState.currentTurnIndex;
    // Il turno successivo inizia dall'indice *successivo* a quello attuale.
    let nextIndex = (startIndex + 1) % gameState.players.length; 
    
    // Loop per saltare i giocatori che hanno turni saltati
    let loopCount = 0;
    const maxIterations = gameState.players.length + 1; // Prevenzione loop infinito se tutti saltano
    
    while (gameState.players[nextIndex].skippedTurns > 0 && loopCount < maxIterations) {
        logEvent(`💀 ${gameState.players[nextIndex].name} ${gameState.players[nextIndex].symbol} salta il turno (Turni rimanenti: ${gameState.players[nextIndex].skippedTurns - 1}).`, 'malus');
        
        gameState.players[nextIndex].skippedTurns--;
        nextIndex = (nextIndex + 1) % gameState.players.length;
        loopCount++;
    }

    // Se l'indice è tornato all'inizio ma il giocatore deve ancora saltare, il gioco è bloccato (altamente improbabile).
    if (gameState.players.length > 0 && gameState.players[nextIndex].skippedTurns > 0 && loopCount >= maxIterations) {
         logEvent("Tutti i giocatori hanno turni da saltare. Turno bloccato.", 'error');
         // Non aggiornare l'indice, il giocatore bloccato dovrà provare a giocare.
    } else {
        gameState.currentTurnIndex = nextIndex;
    }

    return gameState.players[gameState.currentTurnIndex];
}

// 💥 FUNZIONE AGGIORNATA PER RIMOZIONE PASSAGGIO TURNO PREMATURO
function processPlayerMove(diceRoll, isCardMove = false) {
    const player = gameState.players[gameState.currentTurnIndex];
    
    if (!player) {
        return {
            playerId: null,
            diceRoll: diceRoll,
            path: [],
            finalPosition: 1,
            event: { type: 'error', message: 'No current player.' },
            isNewTurn: true
        };
    }
    
    const oldPosition = player.position;
    let newPosition = player.position + diceRoll;

    let event = null;
    let isNewTurn = true; 
    let path = [];
    let win = false;

    // Movimento di Avanzamento (Normale/Dado)
    if (diceRoll > 0) {
        if (newPosition >= TOTAL_CELLS && !isCardMove) { 
            if (newPosition === TOTAL_CELLS) {
                path = calculatePath(oldPosition, TOTAL_CELLS); 
                newPosition = TOTAL_CELLS;
                player.position = newPosition;
                gameState.game_over = true;
                win = true;
                event = { type: 'win' };
                logEvent(`🎉 **${player.name} ${player.symbol} VINCE LA PARTITA!**`, 'win');
            } else {
                newPosition = oldPosition; 
                logEvent(`${player.name} ${player.symbol} tira un ${diceRoll} ma rimane a casella ${player.position} (serve un ${TOTAL_CELLS - oldPosition} esatto).`, 'general');
            }
        } else if (newPosition > TOTAL_CELLS && isCardMove) {
            // Se si vince con una carta che sposta oltre il 100, si ferma al 100.
            newPosition = TOTAL_CELLS; 
            path = calculatePath(oldPosition, newPosition); 
            player.position = newPosition;
            gameState.game_over = true;
            win = true;
            event = { type: 'win' };
            logEvent(`🎉 **${player.name} ${player.symbol} VINCE LA PARTITA! (Per carta)**`, 'win');
        } else {
            // Movimento normale (o carta che avanza)
            newPosition = Math.max(1, newPosition); // Non scendere sotto 1
            path = calculatePath(oldPosition, newPosition);
            player.position = newPosition;
        }
    } else {
        // Movimento di retrocessione (solo per carta)
        newPosition = Math.max(1, newPosition); // Non scendere sotto 1
        path = calculatePath(oldPosition, newPosition); // Path inverso
        player.position = newPosition;
    }


    // Controlla per casella carta DOPO aver mosso la posizione logica
    if (!win && !isCardMove && CARD_DRAW_CELLS.includes(newPosition)) {
        let drawnCard;
        if (newPosition === 18) {
            // Carta speciale 18 (Eddie Guerrero)
            drawnCard = CARDS.find(c => c.name === "I lie, i cheat, I steal!");
        } else {
            drawnCard = drawCard();
        }

        if (drawnCard) {
                event = { type: 'card', data: drawnCard };
                // NON è un nuovo turno finché la carta non è risolta
                isNewTurn = false; 
        } 
    }
    
    // Se non è successo niente di speciale, il turno passa.
    if (!event) {
        isNewTurn = true;
    }
    
    // Restituisce l'intera sequenza di caselle (path) per l'animazione client
    return {
        playerId: player.id,
        diceRoll: isCardMove ? diceRoll : diceRoll, // Per debug, mantiene il valore del dado
        path: path, 
        finalPosition: newPosition,
        event: event,
        isNewTurn: isNewTurn, 
        win: win
    };
}


/**
 * Applica l'effetto della carta e gestisce i movimenti a cascata.
 */
function processCardEffect(card) {
    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const playerUpdates = [];
    let win = null;
    let cascadedCard = null;
    let extraTurn = card.extra_turn || false; // Pre-carica l'extra turn se presente sulla carta
    let finalMoveSteps = 0;

    // --- FUNZIONE AUSILIARIA PER APPLICARE MOVIMENTO E TRACKING ---
    const applyMovement = (player, steps, initialPos = player.position) => {
        const oldPos = initialPos;
        let newPos = oldPos + steps;
        
        newPos = Math.max(1, newPos);
        
        // Gestione della vittoria per movimento carta
        if (newPos >= TOTAL_CELLS) {
            newPos = TOTAL_CELLS;
            
            player.position = newPos;
            const path = calculatePath(oldPos, newPos); 
            
            playerUpdates.push({
                id: player.id,
                path: path, 
                newPos: newPos,
                oldPos: oldPos 
            });
            
            gameState.game_over = true;
            logEvent(`🎉 **${player.name} ${player.symbol} VINCE GRAZIE ALLA CARTA!**`, 'win');
            return player.id;
        } 

        // Movimento normale
        const path = calculatePath(oldPos, newPos); 

        if (newPos !== oldPos) {
            player.position = newPos;
            
            // Trova l'aggiornamento esistente per questo giocatore
            let existingUpdate = playerUpdates.find(p => p.id === player.id);
            if (existingUpdate) {
                // Aggiorna un movimento già tracciato (es. per target_cell)
                existingUpdate.newPos = newPos;
                existingUpdate.path.push(...path); // Aggiunge al percorso esistente (per effetti in sequenza)
            } else {
                playerUpdates.push({
                    id: player.id,
                    path: path, 
                    newPos: newPos,
                    oldPos: oldPos 
                });
            }
        }
        return null;
    };
    
    logEvent(`${currentPlayer.name} ${currentPlayer.symbol} pesca: **${card.name}**! (${card.type.toUpperCase()})`, 'card');
    logEvent(`*Effetto: ${card.effect_desc}*`, 'card');

    // ====================================================================================================
    // 1. GESTIONE EFFETTI DI MASSA (move_all, move_all_to_start)
    // ====================================================================================================
    if (card.move_all || card.move_all_to_start) {
        const steps = card.move_all || 0;
        
        gameState.players.forEach(p => {
            const currentSteps = card.move_all_to_start ? 1 - p.position : steps; 
            const winner = applyMovement(p, currentSteps);
            if (winner) win = winner;
        });
        
    } else {
        // ====================================================================================================
        // 2. GESTIONE EFFETTI SUL SINGOLO GIOCATORE 
        // ====================================================================================================
        
        // Calcola i passi per il giocatore corrente
        if (card.move_multiplier) {
            finalMoveSteps = gameState.lastDiceRoll * card.move_multiplier;
        } else if (card.target_cell) {
            if (card.name === "I lie, i cheat, I steal!" && currentPlayer.position >= 40) {
                 logEvent(`[${currentPlayer.name}] L'effetto *I lie, i cheat, I steal!* non ha effetto (già oltre la casella 40).`, 'general');
                 finalMoveSteps = 0; 
            } else {
                finalMoveSteps = card.target_cell - currentPlayer.position;
            }
        } else if (card.reset_position) {
            finalMoveSteps = 1 - currentPlayer.position; 
        } else {
            finalMoveSteps = card.move_steps || 0;
        }
        
        // Applica il movimento del giocatore corrente (se c'è)
        if (finalMoveSteps !== 0) {
            const winner = applyMovement(currentPlayer, finalMoveSteps);
            if (winner) {
                win = winner;
            }
        }
    }


    // ====================================================================================================
    // 3. GESTIONE EFFETTI TARGETTIZZATI O TURNI 
    // ====================================================================================================

    // Target: Pipe Bomb! (Il più avanti retrocede alla tua casella attuale.)
    if (card.target_nearest_ahead_back_to_self && !win) {
        const target = findTargetPlayer('farthest_ahead', currentPlayer.id); 
        if (target) {
            const stepsToMove = currentPlayer.position - target.position;
            if (stepsToMove !== 0) { 
                applyMovement(target, stepsToMove); 
                logEvent(`↪️ ${target.name} ${target.symbol} retrocede a casella ${currentPlayer.position} (Pipe Bomb!).`, 'effect');
            }
        }
    }

    // Target: Underdog from the Underground! (Il più indietro avanza alla tua casella attuale.)
    if (card.target_farthest_backward_to_self && !win) {
        const target = findTargetPlayer('farthest_backward', currentPlayer.id);
        if (target) {
            const stepsToMove = currentPlayer.position - target.position;
            if (stepsToMove !== 0) {
                applyMovement(target, stepsToMove); 
                logEvent(`⬆️ ${target.name} ${target.symbol} avanza a casella ${currentPlayer.position} (Underdog!).`, 'effect');
            }
        }
    }

    // Target: Say His Name! (retrocede tutti gli avversari)
    if (card.move_all_others && !win) {
        gameState.players.forEach(p => {
            if (p.id !== currentPlayer.id) { // Solo gli avversari
                const otherWinner = applyMovement(p, card.move_all_others); 
                if (otherWinner) win = otherWinner;
                logEvent(`⬇️ ${p.name} retrocede di ${Math.abs(card.move_all_others)} casella.`, 'malus');
            }
        });
    }
    
    // Turni Saltati e Turni Extra
    if (card.skip_self_and_farthest_ahead && !win) {
        currentPlayer.skippedTurns += 1; 
        const target = findTargetPlayer('farthest_ahead', currentPlayer.id);
        if (target) {
            target.skippedTurns += 1;
            logEvent(`🚨 Doppio salto turno per ${currentPlayer.name} e ${target.name}.`, 'malus'); 
        } else {
             logEvent(`🚨 ${currentPlayer.name} salta il prossimo turno. (Double Count-Out)`, 'malus'); 
        }
    }
    
    if (card.skip_next_turn && !win) { 
        currentPlayer.skippedTurns += 1;
        logEvent(`🛑 ${currentPlayer.name} salterà il prossimo turno.`, 'malus'); 
    }
    
    if (card.skip_all_others && !win) { 
        gameState.players.forEach(p => {
            if (p.id !== currentPlayer.id) { // Solo gli avversari
                p.skippedTurns += 1;
            }
        });
        logEvent(`🛑 Tutti gli avversari salteranno il prossimo turno. (Underdog!)`, 'malus'); 
    }
    
    // --- 4. Controllo Carta a Cascata e Passaggio Turno ---
    
    // Controlla se il giocatore corrente è stato mosso e atterra su una casella carta.
    if (!win && !card.move_all && !card.move_all_to_start) 
    {
        // Il giocatore di turno deve essersi mosso per pescare un'altra carta.
        const playerMoved = playerUpdates.some(update => update.id === currentPlayer.id && update.newPos !== update.oldPos); 
        
        // Se c'è stato un movimento del giocatore di turno (causato dalla carta)
        if (playerMoved && CARD_DRAW_CELLS.includes(currentPlayer.position)) {
            
            // Evita la cascata se la carta era già la speciale 18, a meno che non si atterri nuovamente.
            // La logica è: se la carta non era la speciale 18 OPPURE la nuova posizione è la 18.
            if (card.name !== "I lie, i cheat, I steal!" || currentPlayer.position === 18) {
                
                let cascadedCardToDraw;
                // Gestisce il caso speciale della casella 18 in cascata
                if (currentPlayer.position === 18) {
                    cascadedCardToDraw = CARDS.find(c => c.name === "I lie, i cheat, I steal!");
                    // Controllo anti-loop per la carta Eddie se è già stata pescata
                    if (card.name === "I lie, i cheat, I steal!" && currentPlayer.position === 40) {
                         cascadedCardToDraw = null; // Se atterra sulla 40, smetti
                    } else if (card.name === "I lie, i cheat, I steal!") {
                         cascadedCardToDraw = null; // Se atterra sulla 18 MA la carta era già la 18
                    }
                } else {
                    cascadedCardToDraw = drawCard();
                }

                if (cascadedCardToDraw) {
                     cascadedCard = {
                          card: cascadedCardToDraw,
                          position: currentPlayer.position,
                          playerID: currentPlayer.id
                      };
                     // Se c'è cascata, l'extraTurn deve essere gestito solo dopo la risoluzione della cascata
                     extraTurn = card.extra_turn || false; 
                }
            }
        }
    }

    // Passaggio del Turno: La logica qui NON passa il turno, ma segnala se un extraTurn è stato concesso.
    let isNewTurn = true; 
    if (extraTurn || cascadedCard || win) {
        isNewTurn = false; // Il client deve aspettare l'azione successiva (roll o card effect)
    } else {
        // Se non ci sono cascate o extra turn, si passa il turno (da qui in poi è il turno del prossimo giocatore)
        nextTurnLogic(); 
    }


    return {
        playerUpdates, // <- Include i path per l'animazione lato client
        win,
        cascadedCard,
        extraTurn,
        isNewTurn, // Indica se il server ha già chiamato nextTurnLogic (sarà true solo se non ci sono effetti speciali)
        cardApplied: { 
            playerID: currentPlayer.id,
            card: card 
        },
        // Invia l'ID del prossimo giocatore dopo la logica di passaggio turno/extra turn
        currentPlayerID: gameState.players[gameState.currentTurnIndex] ? gameState.players[gameState.currentTurnIndex].id : null
    };
}


// ==========================================================
// 🌐 GESTIONE SOCKET.IO (Multiplayer)
// ==========================================================
let currentPlayers = {};

/**
 * Funzione di utilità per restituire in modo sicuro l'ID del giocatore corrente.
 * @returns {string | null}
 */
function getCurrentPlayerId() {
    const player = gameState.players[gameState.currentTurnIndex];
    return player ? player.id : null; 
}


function getEssentialGameState() {
    return {
        players: gameState.players.map(p => ({
            id: p.id,
            position: p.position,
            symbol: p.symbol,
            skippedTurns: p.skippedTurns,
            name: p.name 
        })),
        TOTAL_CELLS: TOTAL_CELLS,
        currentPlayerID: getCurrentPlayerId(),
        cardDrawCells: CARD_DRAW_CELLS,
        gameLog: gameState.gameLog,
        game_over: gameState.game_over 
    };
}

function emitGameState() {
    io.emit('game state update', getEssentialGameState());
}

/**
 * Funzione helper per inviare il risultato del dado per l'animazione.
 */
function emitDiceResult(moveResult) {
    // Invia un evento specifico per l'animazione del dado
    io.emit('dice roll result', { 
        moveResult: moveResult,
        // Invia lo stato essenziale aggiornato (posizione cambiata ma turno NON ancora passato)
        ...getEssentialGameState() 
    });
}


io.on('connection', (socket) => {
    console.log(`[SERVER] Nuovo giocatore connesso: ${socket.id}`);

    const newPlayer = {
        id: socket.id,
        name: `In attesa...`, 
        position: 1,
        symbol: PLAYER_SYMBOLS[gameState.players.length % PLAYER_SYMBOLS.length],
        skippedTurns: 0
    };

    gameState.players.push(newPlayer);
    currentPlayers[socket.id] = newPlayer; 
    
    logEvent(`Un giocatore ${newPlayer.symbol} si è unito. In attesa del nome...`, 'general');

    if (gameState.players.length === 1) {
        initializeGame();
    }

    emitGameState();
    
    socket.on('set player name', (name) => {
        const player = gameState.players.find(p => p.id === socket.id);
        if (player) {
            const oldName = player.name;
            const newName = String(name).trim().substring(0, 15);
            
            if (newName && newName !== oldName) {
                player.name = newName;
                console.log(`[SERVER] Giocatore ${socket.id} ha impostato il nome: ${player.name}`);
                
                logEvent(`${oldName.startsWith('In attesa') ? 'Un nuovo contendente' : oldName} ha scelto il nome **${player.name}** ${player.symbol}.`, 'general');
            }
            emitGameState(); 
        }
    });

    socket.on('roll dice request', () => {
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        if (gameState.game_over || gameState.players.length === 0 || currentPlayer.id !== socket.id) {
            return;
        }
        
        if (currentPlayer.skippedTurns > 0) {
            // Logica per gestire i turni saltati se il client prova a tirare
            logEvent(`🛑 ${currentPlayer.name} ${currentPlayer.symbol} ha ancora ${currentPlayer.skippedTurns} turni da saltare. Passaggio turno automatico.`, 'malus');
            nextTurnLogic();
            emitGameState();
            return;
        }

        const diceRoll = rollDice();
        gameState.lastDiceRoll = diceRoll;
        
        logEvent(`${currentPlayer.name} ${currentPlayer.symbol} tira un **${diceRoll}** a casella ${currentPlayer.position}.`, 'dice');

        const moveResult = processPlayerMove(diceRoll);
        
        // Invia il risultato del movimento per l'animazione
        emitDiceResult(moveResult); 
    });

    socket.on('card effect request', (card) => {
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        if (gameState.game_over || gameState.players.length === 0 || currentPlayer.id !== socket.id) {
            return;
        }
        
        // Esegue la logica della carta (che include l'aggiornamento della posizione dei giocatori e la logica nextTurnLogic se necessario)
        const effectResult = processCardEffect(card);
        
        // Invia i risultati dell'effetto carta (che include i path per ogni pedina mossa)
        io.emit('card effect update', {
            ...effectResult,
            // Invia lo stato essenziale aggiornato DOPO l'applicazione dell'effetto
            ...getEssentialGameState() 
        });

        // Il client deve inviare 'card animation finished' dopo l'animazione.
    });
    
    // Listener di conferma di fine movimento del dado
    socket.on('movement finished', (moveResult) => {
        
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        if (!currentPlayer || currentPlayer.id !== socket.id) {
            return;
        }

        // 1. Se c'è un evento carta, il client DEVE gestirlo e poi richiedere l'effetto.
        if (moveResult.event && moveResult.event.type === 'card') {
            console.log(`[SERVER] Movimento terminato, attesa risoluzione carta per ${currentPlayer.name}`);
            return;
        }

        // 2. Se la partita è finita (win), non passare il turno.
        if (gameState.game_over) {
            emitGameState();
            return;
        }
        
        // 3. Se non c'era carta e non è finita, è un nuovo turno (solo se il server non l'ha già passato).
        if (moveResult.isNewTurn) {
            nextTurnLogic();
            emitGameState();
        } 
    });

    // Listener per la fine degli effetti a cascata della carta (quando il client ha finito di animare TUTTO)
    socket.on('card animation finished', (cardEffectResult) => {
        
        // Trova l'attuale giocatore di turno
        const currentPlayer = gameState.players[gameState.currentTurnIndex];
        
        if (!currentPlayer || currentPlayer.id !== socket.id) {
             // Se non è il giocatore di turno a inviare l'evento, ignoralo.
            return;
        }

        // 1. Cascata: Se c'è una carta a cascata, l'effetto non è finito. 
        // Il client invierà una nuova 'card effect request' (già gestito lato client).
        if (cardEffectResult.cascadedCard) {
            return;
        }

        // 2. Vittoria: Se la partita è finita, aggiorna solo lo stato.
        if (gameState.game_over) {
             emitGameState();
             return;
        }

        // 3. Extra Turn: Se c'è un turno extra, notifica il giocatore. Il turno NON viene passato.
        if (cardEffectResult.extraTurn) {
            console.log(`[SERVER] ${currentPlayer.name} ha un turno extra.`);
            // Il client è già in attesa di un roll
            emitGameState(); 
            return;
        }

        // 4. Fine normale: Se non ci sono cascate o extra turn, è il momento di passare il turno (se non è già stato fatto da processCardEffect).
        if (cardEffectResult.isNewTurn === false) { // isNewTurn era false in processCardEffect, quindi ora si passa.
             nextTurnLogic();
        }
        
        // Emette lo stato finale
        emitGameState();
    });
    
    // Richiesta di iniziare una nuova partita (dopo una vittoria)
    socket.on('start new game request', () => {
        if (gameState.players.length > 0) {
            initializeGame();
            emitGameState();
            logEvent(`Un giocatore ha richiesto di ricominciare la partita!`, 'general');
        }
    });

    // Gestione della disconnessione
    socket.on('disconnect', () => {
        console.log(`[SERVER] Giocatore disconnesso: ${socket.id}`);
        
        const disconnectedPlayerIndex = gameState.players.findIndex(p => p.id === socket.id);
        
        if (disconnectedPlayerIndex !== -1) {
            const disconnectedPlayer = gameState.players[disconnectedPlayerIndex];
            gameState.players.splice(disconnectedPlayerIndex, 1);
            delete currentPlayers[socket.id];
            
            logEvent(`Il giocatore **${disconnectedPlayer.name}** ${disconnectedPlayer.symbol} ha lasciato la partita.`, 'general');
            
            // Se il giocatore disconnesso era quello di turno
            if (gameState.players.length > 0 && gameState.currentTurnIndex === disconnectedPlayerIndex) {
                 // Sposta l'indice in modo che punti al giocatore successivo (o 0 se l'ultimo è stato rimosso)
                gameState.currentTurnIndex = gameState.currentTurnIndex % gameState.players.length; 
                // Esegui la logica di passaggio turno per saltare eventuali turni rimanenti
                nextTurnLogic(); 
            } else if (gameState.currentTurnIndex > disconnectedPlayerIndex) {
                // Se il giocatore rimosso era prima nell'array, dobbiamo decrementare l'indice del turno corrente
                gameState.currentTurnIndex = gameState.currentTurnIndex % gameState.players.length; 
            } else if (gameState.players.length === 0) {
                 gameState.currentTurnIndex = 0;
                 gameState.game_over = true;
            }

            // Invia lo stato aggiornato a tutti i client rimanenti
            emitGameState();
        }
    });
});

// --- Inizio configurazione server e file statici ---

// Servo i file statici dalla directory 'public'
app.use(express.static(path.join(__dirname, 'public'))); 

app.get('/', (req, res) => {
    // Invia il file index.html quando l'utente si connette
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`[SERVER] Server in ascolto sulla porta ${PORT}`);
    
    // Inizializza il gioco solo se non ci sono ancora giocatori (sicurezza)
    if (gameState.players.length === 0) {
        initializeGame(); 
    }
});