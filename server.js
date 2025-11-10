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
const io = new Server(server);

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
    }
    const card = gameState.cardDeck.shift();
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
        return otherPlayers.reduce((farthest, p) => p.position < farthest.position ? p : farthest, otherPlayers[0]);
    }
    if (type === 'farthest_ahead') {
        return otherPlayers.reduce((farthest, p) => p.position > farthest.position ? p : farthest, otherPlayers[0]);
    }
    return null;
}
function initializeGame() {
    gameState.cardDeck = [...CARDS];
    shuffleArray(gameState.cardDeck);
    gameState.game_over = false;
    gameState.currentTurnIndex = 0;
    gameState.lastDiceRoll = 0;
    
    gameState.players.forEach((player, index) => {
        player.position = 1;
        player.symbol = PLAYER_SYMBOLS[index % PLAYER_SYMBOLS.length];
        player.skippedTurns = 0;
    });
    logEvent("La partita è iniziata. Tutti i giocatori sono a casella 1.", 'general');
}
function nextTurnLogic() {
    if (gameState.players.length === 0) return;

    let startIndex = gameState.currentTurnIndex;
    let nextIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
    
    while (gameState.players[nextIndex].skippedTurns > 0) {
        logEvent(`${gameState.players[nextIndex].name} ${gameState.players[nextIndex].symbol} salta il turno (Turni rimanenti: ${gameState.players[nextIndex].skippedTurns - 1}).`, 'malus');
        
        gameState.players[nextIndex].skippedTurns--;
        nextIndex = (nextIndex + 1) % gameState.players.length;
        
        if (nextIndex === startIndex) {
            break; 
        }
    }

    gameState.currentTurnIndex = nextIndex;
    return gameState.players[gameState.currentTurnIndex];
}

// 💥 FUNZIONE MODIFICATA PER INVIARE IL PATH AL CLIENT
function processPlayerMove(diceRoll, isCardMove = false) {
    const player = gameState.players[gameState.currentTurnIndex];
    const oldPosition = player.position;
    let newPosition = player.position + diceRoll;

    let event = null;
    let isNewTurn = true;
    let path = [];

    if (newPosition >= TOTAL_CELLS) {
        if (newPosition === TOTAL_CELLS) {
            path = calculatePath(oldPosition, TOTAL_CELLS); // Cammino fino al 100
            newPosition = TOTAL_CELLS;
            player.position = newPosition;
            gameState.game_over = true;
            event = { type: 'win' };
            logEvent(`🎉 **${player.name} ${player.symbol} VINCE LA PARTITA!**`, 'win');
        } else {
            // Se supera il 100, la posizione non cambia (newPosition = oldPosition)
            newPosition = oldPosition; 
            logEvent(`${player.name} ${player.symbol} tira un ${diceRoll} ma rimane a casella ${player.position} (serve un ${TOTAL_CELLS - oldPosition} esatto).`, 'general');
            // path rimane []
        }
    } else {
        path = calculatePath(oldPosition, newPosition);
        player.position = newPosition;
        
        // Controlla per casella carta DOPO aver mosso la posizione logica
        if (!isCardMove && CARD_DRAW_CELLS.includes(newPosition)) {
            let drawnCard;
            if (newPosition === 18) {
                drawnCard = CARDS.find(c => c.name === "I lie, i cheat, I steal!");
            } else {
                drawnCard = drawCard();
            }

            event = { type: 'card', data: drawnCard };
            isNewTurn = false; // NON è un nuovo turno finché la carta non è risolta
        } else {
            nextTurnLogic(); // Passa al turno successivo solo se non c'è una carta
        }
    }
    
    // Restituisce l'intera sequenza di caselle (path) per l'animazione client
    return {
        playerId: player.id,
        diceRoll: diceRoll,
        path: path, // Array delle caselle intermedie + finale
        finalPosition: newPosition,
        event: event,
        isNewTurn: isNewTurn
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
    let extraTurn = false;
    let finalMoveSteps = 0;

    // --- FUNZIONE AUSILIARIA PER APPLICARE MOVIMENTO E TRACKING ---
    const applyMovement = (player, steps) => {
        const oldPos = player.position;
        let newPos = oldPos + steps;
        
        newPos = Math.max(1, newPos);
        newPos = Math.min(TOTAL_CELLS, newPos); 

        const path = calculatePath(oldPos, newPos); 

        if (newPos !== oldPos) {
            player.position = newPos;
            
            let existingUpdate = playerUpdates.find(p => p.id === player.id);
            if (existingUpdate) {
                existingUpdate.newPos = newPos;
                existingUpdate.path = path; 
            } else {
                playerUpdates.push({
                    id: player.id,
                    path: path, // <- PATH AGGIUNTO QUI
                    newPos: newPos,
                    oldPos: oldPos 
                });
            }

            if (newPos === TOTAL_CELLS) {
                gameState.game_over = true;
                logEvent(`🎉 **${player.name} ${player.symbol} VINCE GRAZIE ALLA CARTA!**`, 'win');
                return player.id;
            }
        }
        return null;
    };
    
    logEvent(`${currentPlayer.name} ${currentPlayer.symbol} pesca: **${card.name}**! (${card.type.toUpperCase()})`, 'card');

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
        
        if (card.move_multiplier) {
            finalMoveSteps = gameState.lastDiceRoll * card.move_multiplier;
        } else if (card.target_cell) {
            finalMoveSteps = card.target_cell - currentPlayer.position;
        } else if (card.reset_position) {
            finalMoveSteps = 1 - currentPlayer.position; 
        } else {
            finalMoveSteps = card.move_steps || 0;
        }
        
        // Applica il movimento del giocatore corrente
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
    if (card.target_nearest_ahead_back_to_self) {
        const target = findTargetPlayer('farthest_ahead', currentPlayer.id); 
        if (target) {
            const stepsToMove = currentPlayer.position - target.position;
            applyMovement(target, stepsToMove); 
            logEvent(`${target.name} ${target.symbol} retrocede a casella ${currentPlayer.position} (Pipe Bomb!).`, 'effect');
        }
    }

    // Target: Underdog from the Underground! (Il più indietro avanza alla tua casella attuale.)
    if (card.target_farthest_backward_to_self) {
        const target = findTargetPlayer('farthest_backward', currentPlayer.id);
        if (target) {
            const stepsToMove = currentPlayer.position - target.position;
            applyMovement(target, stepsToMove); 
            logEvent(`${target.name} ${target.symbol} avanza a casella ${currentPlayer.position} (Underdog!).`, 'effect');
        }
    }

    // Target: Say His Name! (retrocede tutti gli avversari)
    if (card.move_all_others) {
        gameState.players.forEach(p => {
            if (p.id !== currentPlayer.id) { // Solo gli avversari
                const otherWinner = applyMovement(p, card.move_all_others); 
                if (otherWinner) win = otherWinner;
                logEvent(`${p.name} retrocede di ${Math.abs(card.move_all_others)} casella.`, 'malus');
            }
        });
    }
    
    // Target: Doppio Salto Turno (Double Count-Out!)
    if (card.skip_self_and_farthest_ahead) {
        currentPlayer.skippedTurns += 1; // Salto per il giocatore corrente
        const target = findTargetPlayer('farthest_ahead', currentPlayer.id);
        if (target) {
            target.skippedTurns += 1;
            logEvent(`Saltato turno per ${currentPlayer.name} e ${target.name}.`, 'malus'); 
        }
    }
    
    // Turni Saltati e Turni Extra
    if (card.skip_next_turn) { 
        currentPlayer.skippedTurns += 1;
        logEvent(`${currentPlayer.name} salterà il prossimo turno.`, 'malus'); 
    }
    
    if (card.extra_turn) { 
        extraTurn = true;
        logEvent(`${currentPlayer.name} ottiene un turno extra immediato!`, 'bonus');
    }
    
    if (card.skip_all_others) { 
        gameState.players.forEach(p => {
            if (p.id !== currentPlayer.id) { // Solo gli avversari
                p.skippedTurns += 1;
            }
        });
    }
    
    // Log Effetto finale 
    const moved = playerUpdates.some(update => update.id === currentPlayer.id); 
    if (card.effect_desc && !win && (moved || card.skip_next_turn || card.extra_turn)) {
        logEvent(`[${currentPlayer.name}] Effetto completato: ${card.effect_desc}`, card.type);
    }


    // --- 4. Controllo Carta a Cascata e Passaggio Turno (FIX: Gestione Casella 18) ---
    
    // Controlla se il giocatore corrente è stato mosso e atterra su una casella carta.
    if (!win && !card.move_all && !card.move_all_to_start) 
    {
        const playerMoved = playerUpdates.some(update => update.id === currentPlayer.id && update.newPos !== update.oldPos); 
        
        // Se c'è stato un movimento del giocatore di turno (causato dalla carta)
        if (playerMoved && CARD_DRAW_CELLS.includes(currentPlayer.position)) {
            // Se la carta attuale non è 'I lie, i cheat, I steal!' (che è già un effetto speciale)
            if (card.name !== "I lie, i cheat, I steal!") {
                
                let cascadedCardToDraw;
                // 💥 CORREZIONE: Gestisce il caso speciale della casella 18 in cascata
                if (currentPlayer.position === 18) {
                    cascadedCardToDraw = CARDS.find(c => c.name === "I lie, i cheat, I steal!");
                } else {
                    cascadedCardToDraw = drawCard();
                }

                cascadedCard = {
                    card: cascadedCardToDraw,
                    position: currentPlayer.position,
                    playerID: currentPlayer.id
                };
                extraTurn = false; // La cascata ha la precedenza sul turno extra
            }
        }
    }

    // Passaggio del Turno
    let isNewTurn = true;
    if (extraTurn || cascadedCard || win) {
        isNewTurn = false;
    } else {
        nextTurnLogic(); // Solo qui passa il turno se non ci sono cascate/extra turn
    }


    return {
        playerUpdates, // <- Include i path per l'animazione lato client
        win,
        cascadedCard,
        extraTurn,
        isNewTurn,
        // OGGETTO CARTA COMPLETO INVIATO AL CLIENT
        cardApplied: { 
            playerID: currentPlayer.id,
            card: card 
        },
        currentPlayerID: gameState.players[gameState.currentTurnIndex] ? gameState.players[gameState.currentTurnIndex].id : null
    };
}


// ==========================================================
// 🌐 GESTIONE SOCKET.IO (Multiplayer)
// ==========================================================
let currentPlayers = {};

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
        currentPlayerID: gameState.players[gameState.currentTurnIndex] ? gameState.players[gameState.currentTurnIndex].id : null,
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
 * Include lo stato attuale (posizione cambiata ma turno non ancora passato).
 */
function emitDiceResult(moveResult) {
    // 💥 MODIFICA: Invia un evento specifico per l'animazione del dado
    io.emit('dice roll result', { 
        moveResult: moveResult,
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

        const diceRoll = rollDice();
        gameState.lastDiceRoll = diceRoll;
        
        logEvent(`${currentPlayer.name} ${currentPlayer.symbol} tira un **${diceRoll}** a casella ${currentPlayer.position}.`, 'dice');

        const moveResult = processPlayerMove(diceRoll);
        
        // 💥 Invia il risultato del movimento per l'animazione. Non passa il turno qui se c'è una carta.
        emitDiceResult(moveResult); 
    });

    socket.on('card effect request', (card) => {
        const currentPlayer = gameState.players[gameState.currentTurnIndex]; 
        
        if (gameState.game_over || gameState.players.length === 0 || currentPlayer.id !== socket.id) {
            return;
        }
        
        const effectResult = processCardEffect(card);
        
        // Invia i risultati dell'effetto carta (che include i path per ogni pedina mossa)
        io.emit('card effect update', {
            ...effectResult,
            ...getEssentialGameState()
        });

        // Il client deve inviare 'card animation finished' dopo l'animazione.
    });
    
    // 🎯 NUOVO LISTENER: Riceve conferma di fine movimento del dado
    socket.on('movement finished', (moveResult) => {
        
        if (moveResult && moveResult.playerId === socket.id) {
            // Caso 1: Vittoria o Turno Passato Normalmente
            if (moveResult.event && moveResult.event.type === 'win') {
                emitGameState(); 
            } else if (moveResult.isNewTurn) {
                emitGameState(); // Lo stato è già aggiornato con il prossimo giocatore in nextTurnLogic
            } 
            // Caso 2: Carta Pescata
            else if (moveResult.event && moveResult.event.type === 'card') {
                // Invia un evento specifico per mostrare la carta (non aggiorna lo stato finale)
                io.emit('card to draw', {
                    card: moveResult.event.data,
                    playerID: moveResult.playerId
                });
            }
        }
    });

    // 🎯 NUOVO LISTENER: Riceve conferma di fine animazione effetto carta
    socket.on('card animation finished', () => {
        // Dopo l'animazione degli effetti, emette lo stato per passare al prossimo turno o gestire extra turn/cascata.
        emitGameState();
    });


    socket.on('disconnect', () => {
        const playerIndex = gameState.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
             const disconnectedPlayer = gameState.players[playerIndex]; 
             const disconnectedPlayerName = disconnectedPlayer.name; 
             const disconnectedPlayerSymbol = disconnectedPlayer.symbol;
             console.log(`[SERVER] Giocatore disconnesso: ${socket.id} (${disconnectedPlayerName})`);
            
             const wasCurrent = (playerIndex === gameState.currentTurnIndex);
            
             gameState.players.splice(playerIndex, 1);
             delete currentPlayers[socket.id];

             logEvent(`**${disconnectedPlayerName} ${disconnectedPlayerSymbol}** ha lasciato la contesa.`, 'general');

             if (wasCurrent && gameState.players.length > 0) {
                 if (gameState.currentTurnIndex >= gameState.players.length) {
                     gameState.currentTurnIndex = 0;
                 }
                 nextTurnLogic(); 
             } else if (gameState.players.length === 0) {
                 gameState.game_over = true;
             }
        }
        
        emitGameState();
    });
});


// ==========================================================
// 🌐 CONFIGURAZIONE EXPRESS (Server Web)
// ==========================================================

// Configurazione per file statici
app.use(express.static(path.join(__dirname, 'public'))); 

// Routing esplicito per la homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gioco.html')); 
});

// Avvia il server
server.listen(PORT, () => {
    console.log(`\n-------------------------------------------------`);
    console.log(`🚀 Server Node.js avviato sulla porta ${PORT}`);
    console.log(`🌐 Apri: http://localhost:${PORT}`);
    console.log(`-------------------------------------------------\n`);
});